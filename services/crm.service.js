const axios = require('axios')
const {setInterval} = require('node:timers/promises')
const { MoleculerServerError } = require('moleculer').Errors
const crmTablesData = require(`${__dirname}/../configs/crm.config.js`)
const StateMixin = require('../mixins/state.mixin')

const {
	CRM_RECORDS_SIZE,
	CRM_THREADS_COUNT,
	CRM_AUTH_USER_NAME,
	CRM_AUTH_USER_PASSWORD,
	CRM_HOST,
	CRM_LOGIN_ENDPOINT,
	CRM_LOGOUT_ENDPOINT,
	CRM_CLIENTS_TABLE_NAME
} = process.env

module.exports = {
	name: 'crm',

	mixins: [StateMixin],

	methods: {
		split (arr, size) {
			return arr.reduce(
				(acc, e, i) => {
					i % size
						? acc[acc.length - 1].push(e)
						: acc.push([e])
					return acc
				}, [])
		},
		async crmStartLoop() {
			await this.broker.waitForServices([this.name])
			for await (const startTime of setInterval(5000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.crmLoop()
			}
			await this.mongoDisconnect()
		},

		async crmLoop() {
			const pool = await Promise.all(crmTablesData.map(async tableData => {
				const {
					tableName, recordsCount,
					sendUrl, matchQuery,
					accountCodesMapping
				} = tableData

				const records = await this.getRecords(
					tableName,
					[
						{
							$match: {
								$and: [
									matchQuery,
									{
										$or: [
											{
												crm_status: 'ready'
											},
											{
												crm_status: 'pending',
												attempts: {
													$lt: 24
												},
												updated_at: {
													$lt: new Date(new Date().getTime() - 60 * 60 * 1000)
												}
											}
										]
									}
								]
							}
						},
						{
							$sort: {
								crm_status: 1,
								updated_at: 1
							}
						},
						{
							$limit: recordsCount * parseInt(CRM_THREADS_COUNT)
						}
					]
				)

				const recordsBySize = []
				for (const record of records) {
					if (JSON.stringify(recordsBySize).length > parseInt(CRM_RECORDS_SIZE) * parseInt(CRM_THREADS_COUNT)) {
						break
					}
					recordsBySize.push(record)
				}

				return {tableName, sendUrl, recordsBySize, accountCodesMapping}
			}))

			const chunks = pool.reduce((acc, tablePool) => {
				const splittedRecordsBySize = this.split(tablePool.recordsBySize, Math.ceil(tablePool.recordsBySize.length / parseInt(CRM_THREADS_COUNT)))
				for (let i = 0; i < splittedRecordsBySize.length; i++) {
					if (!acc[i]) {
						acc[i] = {}
					}
					if (!acc[i][tablePool.tableName]) {
						acc[i][tablePool.tableName] = {}
					}

					acc[i][tablePool.tableName].sendUrl = tablePool.sendUrl
					acc[i][tablePool.tableName].accountCodesMapping = tablePool.accountCodesMapping
					acc[i][tablePool.tableName].records = splittedRecordsBySize[i]
				}
				return acc
			}, [])

			await Promise.all(chunks.map(async chunk => {
				for (const key of Object.keys(chunk)) {
					await this.broker.call(`${this.name}.crmProcess`, {
						tableName: key,
						sendUrl: chunk[key].sendUrl,
						records: chunk[key].records,
						accountCodesMapping: chunk[key].accountCodesMapping
					})
				}
			}))
		},
		async openSession() {
			const crmAuthRes = await axios.post(CRM_HOST + CRM_LOGIN_ENDPOINT, {
				UserName: CRM_AUTH_USER_NAME,
				UserPassword: CRM_AUTH_USER_PASSWORD
			})

			if (crmAuthRes.status !== 200 || !crmAuthRes.data || crmAuthRes.data.Code !== 0) {
				throw new MoleculerServerError(`CRM login status is ${crmAuthRes.status}`)
			}

			const cookies = crmAuthRes?.headers?.['set-cookie'].map(val => val.split(';')[0])
			const crmCsrfCookieArray = crmAuthRes?.headers?.['set-cookie'].find(val => val.startsWith('BPMCSRF')).split(';')
			const crmCsrfHeaderArray = crmCsrfCookieArray.find(val => val.startsWith('BPMCSRF')).split('=')

			this.logger.info(`SESSION OPENED at ${new Date()}`)
			return {cookies, crmCsrfHeaderArray}
		},
		async upload(tableName, cookies, crmCsrfHeaderArray, records, sendingEndpoint) {
			const crmRes = await axios.post(sendingEndpoint,
				records,
				{
					withCredentials: true,
					headers: {
						[crmCsrfHeaderArray[0]]: crmCsrfHeaderArray[1],
						Cookie: cookies.join(', ')
					}
				})
			if (!crmRes.data.success) {
				throw new MoleculerServerError(`Crm server error: ${crmRes.data.httpInfo.message}`)
			}
			cookies[0] = (crmRes?.headers?.['set-cookie'].map(val => val.split(';')[0])).join('')
			this.logger.info(`${tableName} posted OK at ${new Date()} - success: ${crmRes.data.success}, created: ${crmRes.data.created}, updated: ${crmRes.data.updated}, payload: ${JSON.stringify(records)}`)
			return cookies
		},
		async closeSession(cookies, crmCsrfHeaderArray) {
			const logoutRes = await axios.post(CRM_HOST + CRM_LOGOUT_ENDPOINT,
				{},
				{
					headers: {
						[crmCsrfHeaderArray[0]]: crmCsrfHeaderArray[1],
						Cookie: cookies.join(', ')
					}
				})
			this.logger.info(`Logout status: ${logoutRes?.status || null}`)
			this.logger.info(`Logout statusText: ${logoutRes?.statusText || null}`)
			this.logger.info(`SESSION CLOSED at ${new Date()}`)
		}
	},

	actions: {
		crmProcess: {
			timeout: 5 * 60 * 1000,
			retryPolicy: {
				enabled: false
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {tableName, sendUrl, records, accountCodesMapping} = ctx.params
				await this.updateRecords(
					tableName,
					{recid: {$in: records.map(res => res.recid)} },
					{$inc: {attempts: 1}, $set: {crm_status: 'pending', updated_at: new Date()}}
				)

				let {cookies, crmCsrfHeaderArray} = await this.openSession()
				try {
					cookies = await this.upload(tableName, cookies, crmCsrfHeaderArray, records, sendUrl)
				} catch (e) {
					if (e?.code === 504) {
						this.logger.error(`CRM upload request is timed out with payload: ${JSON.stringify(records, null, 2)}`)
					} else {
						await this.closeSession(cookies, crmCsrfHeaderArray)
						throw new MoleculerServerError(e)
					}
				}

				await this.closeSession(cookies, crmCsrfHeaderArray)
				await this.updateRecords(
					tableName,
					{recid: {$in: records.map(res => res.recid)} },
					{$set: {crm_status: 'success', sent_to_crm: new Date(), updated_at: new Date(), attempts: 1}}
				)

				// forced send clients
				if (accountCodesMapping) {
					await this.updateRecords(
						CRM_CLIENTS_TABLE_NAME,
						{
							account_code: {  $in: accountCodesMapping(records) },
							'ax_identificators.channel_code': {
								$nin: ['000000001', '000000008']
							}
						},
						{$set: {forced: true, crm_status: 'ready', attempts: 0, updated_at: new Date()}}
					)
				}
			}
		}
	},

	async started() {
		this.crmStartLoop()
	}
}
