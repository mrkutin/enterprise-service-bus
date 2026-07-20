const axios = require('axios')
const {MoleculerServerError} = require('moleculer').Errors
const CronMixin = require('moleculer-cron')
const StateMixin = require('../mixins/state.mixin')
const topicsConfig = require('../configs/mindbox.sendsay.topics.config')
const {setInterval} = require('node:timers/promises')

const {
	MINDBOX_HOST, MINDBOX_SEND_ENDPOINT,
	MINDBOX_ENDPOINT_ID, MINDBOX_SECRET_KEY,
	SENDSAY_HOST, SENDSAY_API_KEY, SENDSAY_ACCOUNT
} = process.env

module.exports = {
	name: 'sendsay.mindbox',

	mixins: [StateMixin, CronMixin],

	settings: {
		cronJobs: [
			{
				name: 'segmentUnsubscribeCron',
				cronTime: '0 0,12 * * *', // Run every day at 00:00 and 12:00
				timeZone: 'Europe/Moscow',
				onTick: async function() {
					this.logger.info('segmentUnsubscribeCron ticked')
					await this.broker.call(`${this.name}.processMindboxRequests`, {
						topicName: 'mindbox-client-email-unsubscribed-topic'
					})
				}
			},
			{
				name: 'segmentsSendsayCron',
				cronTime: '0 0,12 * * *', // Run every day at 00:00 and 12:00
				timeZone: 'Europe/Moscow',
				onTick: async function() {
					this.logger.info('segmentsSendsayCron ticked')
					await this.broker.call(`${this.name}.processMindboxRequests`, {
						topicName: 'mindbox-client-email-contacted-24h-topic'
					})
				}
			}
		]
	},

	methods: {
		async sendsayStartLoop() {
			await this.broker.waitForServices([this.name])
			for await (const startTime of setInterval(5000 * 5, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.sendsayLoop()
			}
			await this.mongoDisconnect()
		},

		async sendsayLoop() {
			const pool = await Promise.all(Object.keys(topicsConfig).map(async topicName => {
				const tableName = topicName.split('-topic')[0]
				const record = (await this.getRecords(
					tableName,
					[
						{
							$match: {
								$or: [
									{
										sendsay_status: null
									},
									{
										sendsay_status: 'pending',
										attempts: {
											$lt: 24
										},
										updated_at: {
											$lt: new Date(new Date().getTime() - 60 * 60 * 1000)
										}
									}
								]
							}
						},
						{
							$sort: {
								updated_at: 1
							}
						},
						{
							$limit: 1
						}
					]
				))[0]

				return {topicName, tableName, record}
			}))

			await Promise.all(pool.map(async res => {
				const { topicName, tableName, record } = res
				if (record) {
					const { recid, emails } = record
					await this.updateRecords(
						tableName,
						{ recid },
						{$inc: {attempts: 1}, $set: {sendsay_status: 'pending', updated_at: new Date()}}
					)
					const isSendsayUploaded = await this.sendsayUpload(topicName, emails)
					if (isSendsayUploaded) {
						await this.deleteRecordByRecid(tableName, recid)
					}
				}
			}))
		},
		async sendsayUpload(topic, emails) {
			this.logger.info(`Method sendsayUpload input: ${JSON.stringify({topic})}`)
			const {
				sendsayAction,
				sendsayCreateList,
				sendsayAdditionalBodyParams
			} = topicsConfig[topic]

			const sendsayList = sendsayCreateList(emails)

			try {
				await axios.post(
					`${SENDSAY_HOST}/general/api/v100/json/${SENDSAY_ACCOUNT}`,
					{
						apikey: SENDSAY_API_KEY,
						action: sendsayAction,
						...sendsayList,
						...sendsayAdditionalBodyParams
					},
					{
						headers: {
							'Content-Type': 'application/json'
						}
					})
			} catch (e) {
				this.logger.error(`Sendsay upload server error in topic ${topic}, error: ${e.stack}`)
				return false
			}

			return true
		}
	},

	actions: {
		processMindboxRequests: {
			timeout: 10 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {exportId, topicName} = ctx.params
				const {mindboxOperation} = topicsConfig[topicName]
				const responseData = (await axios.post(
					`${MINDBOX_HOST}${MINDBOX_SEND_ENDPOINT}/sync?endpointId=${MINDBOX_ENDPOINT_ID}&operation=${mindboxOperation}`,
					exportId ? {exportId} : {},
					{
						headers: {
							'Content-Type': 'application/json; charset=utf-8',
							'Accept': 'application/json',
							'Authorization': `SecretKey ${MINDBOX_SECRET_KEY}`
						}
					})).data
				if (exportId) {
					if (responseData.exportResult.processingStatus !== 'Ready') {
						throw new MoleculerServerError(`Mindobx request processingStatus: ${responseData.exportResult.processingStatus} with params: ${JSON.stringify(ctx.params)}`)
					}
					const urls = responseData.exportResult.urls
					await this.broker.call(`${this.name}.processMindboxUrls`, {urls, topicName})
				} else {
					const exportId = responseData.exportId
					await new Promise(resolve => setTimeout(resolve, 60 * 1000))
					await this.broker.call(`${this.name}.processMindboxRequests`, {
						exportId, topicName
					})
				}
			}
		},
		processMindboxUrls: {
			timeout: 10 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {urls, topicName} = ctx.params
				const requests = urls.map(url => axios.get(url))
				const responses = await Promise.all(requests)
				const customers = responses.flatMap(response => response.data.customers)
				const emails = [...new Set(customers.filter(customer => customer.email).map(customer => customer.email))]
				await this.broker.sendToChannel(topicName, { emails }, { key: `${Date.now()}` })
			}
		}
	},

	channels: {
		'mindbox-client-email-unsubscribed-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const key = raw.key.toString()
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:mindbox-client-email-unsubscribed:insert`,
					key,
					value: {...record, recid: parseInt(key)}
				})
			}
		},
		'mindbox-client-email-contacted-24h-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const key = raw.key.toString()
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:mindbox-client-email-contacted-24h:insert`,
					key,
					value: {...record, recid: parseInt(key)}
				})
			}
		}
	},

	async started() {
		this.sendsayStartLoop()
	}
}
