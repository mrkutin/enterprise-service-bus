const realtimeTables = require(`${__dirname}/../configs/puller.realtime.tables.config.js`)
const periodicTables = require(`${__dirname}/../configs/puller.periodic.tables.config.js`)
const {setInterval} = require('node:timers/promises')
const {NVarChar, BigInt, Int} = require('mssql')

const StateMixin = require('../mixins/state.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')

const {
	REALTIME_TABLES_INTERVAL,
	PERIODIC_TABLES_INTERVAL,
	PULLER_CONFIRM_PROCEDURE
} = process.env

const axStringFields = ['inn', 'kpp', 'partynumber']

module.exports = {
	name: 'puller',

	mixins: [StateMixin, MssqlMixin],

	methods: {
		async startStateLoop() {},
		async createIndexes(){
			await this.settings.db.collection('inventtable').createIndex({ 'inventeditionrecid': 1 }, { unique: false })
			await this.settings.db.collection('inventtable').createIndex({ 'itemid': 1 }, { unique: false })
			await this.settings.db.collection('inventedition').createIndex({ 'inventcontentid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontent').createIndex({ 'inventcontentid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontent').createIndex({ 'inventcontentgrouprecid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontent').createIndex({ 'fsesrecid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontent').createIndex({ 'editionfedarationlist': 1 }, { unique: false })

			await this.settings.db.collection('inventvariantactive').createIndex({ 'inventcontentid': 1 }, { unique: false })
			await this.settings.db.collection('pricedisctablecust').createIndex({ 'itemid': 1 }, { unique: false })
			await this.settings.db.collection('inventserieslineumkline').createIndex({ 'inventcontentgrouprecid': 1 }, { unique: false })
			await this.settings.db.collection('inventserieslineumkline').createIndex({ 'serieslineumkid': 1 }, { unique: false })
			await this.settings.db.collection('inventserieslineumk').createIndex({ 'serieslineumkid': 1 }, { unique: false })
			await this.settings.db.collection('eprodfederationlist').createIndex({ 'federationtableref': 1 }, { unique: false })

			await this.settings.db.collection('inventcontentgroup').createIndex({ 'literaturesection': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'literaturetype': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'edulevel': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'publishinghouserefrecid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'brandrefrecid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'subbrandrefrecid': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'classagetable': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'subject': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'editiongenre': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'plumetextbookref': 1 }, { unique: false })
			await this.settings.db.collection('inventcontentgroup').createIndex({ 'inventcontentgroupcode': 1 }, { unique: false })

			await this.settings.db.collection('eprodnormalizationtypecghistory').createIndex({ 'inventcontentgroupcode': 1 }, { unique: false })
			await this.settings.db.collection('eprodnormalizationtypecghistory').createIndex({ 'normalizationtyperef': 1 }, { unique: false })

			await this.settings.db.collection('marketplaceassortiment').createIndex({ 'itemid': 1 }, { unique: false })

			await this.settings.db.collection('dirpartytable').createIndex({ 'partynumber': 1 }, { unique: false })
		},
		async startRealtimeTablesLoop() {
			await this.broker.waitForServices(['puller'])
			// for await (const startTime of setInterval(parseInt(REALTIME_TABLES_INTERVAL) || 1000, Date.now())) {
			for await (const startTime of setInterval(1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.loop(realtimeTables)
			}
		},
		async startPeriodicTablesLoop() {
			await this.broker.waitForServices(['puller'])
			// for await (const startTime of setInterval(parseInt(PERIODIC_TABLES_INTERVAL) || 24 * 60 * 60 * 1000, Date.now())) {
			for await (const startTime of setInterval(12 * 60 * 60 * 1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.loop(periodicTables)
			}
		},
		async loop(tables) {
			for (const table of tables) {
				if (table.cleanup) {
					await this.deleteAllRecords(table.table_name)
				}
				await this.broker.call(`${this.name}.pullerProcess`, {
					...table
				})
			}
		},
		normalize(record) {
			const lower_case_record = {}
			for (const key in record) {
				const lower_case_key = key.toLowerCase()
				if (!['eventcreateddatetime', 'eventtypestr'].includes(lower_case_key)) {
					if (axStringFields.includes(lower_case_key)) {
						lower_case_record[lower_case_key] = record[key]
					} else if (record[key] === parseInt(record[key]).toString()) {
						lower_case_record[lower_case_key] = parseInt(record[key])
					} else if (record[key] === parseFloat(record[key]).toString()) {
						lower_case_record[lower_case_key] = parseFloat(record[key])
					} else {
						lower_case_record[lower_case_key] = record[key]
					}
				}
			}
			return lower_case_record
		},
		split (arr, size) {
			return arr.reduce(
				(acc, e, i) => {
					i % size
						? acc[acc.length - 1].push(e)
						: acc.push([e])
					return acc
				}, [])
		},
		async pullStoredProc(pull_procedure, ax_consumer_id, limit) {
			const result = limit ?
				await this.settings.pool.request()
					.input('DAI', NVarChar, 'psv')
					.input('DBType', Int, parseInt(ax_consumer_id))
					.input('Limit', Int, parseInt(limit))
					.execute(pull_procedure)
				:
				await this.settings.pool.request()
					.input('DAI', NVarChar, 'psv')
					.input('DBType', Int, parseInt(ax_consumer_id))
					.execute(pull_procedure)
			return result.recordset
		},
		async sendConfirmation(confirm_procedure, EventRecId) {
			return this.settings.pool.request()
				.input('EventRecId', BigInt, parseInt(EventRecId))
				.input('Status', Int, 100)//100 - ok, 200 - fail
				.input('Description', NVarChar, 'Строка успешно обработана')
				.execute(confirm_procedure)
		}
	},

	actions: {
		pullerProcess: {
			timeout: 5 * 60 * 1000,
			retryPolicy: {
				enabled: false
			},
			async handler(ctx) {
				const {pull_procedure, ax_consumer_id, limit, table_name, filters, recid_fields} = ctx.params
				const lowerCaseTableName = table_name.toLowerCase()
				console.log(`Importing ${pull_procedure}`)
				const records = await this.pullStoredProc(pull_procedure, ax_consumer_id, limit)

				if (records.length) {
					const chunks = this.split(records, 1000)
					for (const chunk of chunks) {
						const filtredRecords = chunk.filter(message => {
							if (filters) {
								return Object.keys(filters).every(key => message[key] === filters[key])
							} else {
								return true
							}
						})

						const normalizedRecords = filtredRecords.map(filtredRecord => this.normalize(filtredRecord))

						const normalizedRecordsWithRecids = normalizedRecords.map(normalizedRecord => {
							if (!normalizedRecord.recid && recid_fields)  {
								normalizedRecord.recid = recid_fields.map(field => normalizedRecord[field.toLowerCase()]).join('-')
							}
							return normalizedRecord
						})

						const dedupRecordsByRecid = Object.values(normalizedRecordsWithRecids.reduce((acc, record) => {
							const {eventrecid, ...recordWithoutEventRecid} = record
							if (!acc[record.recid]) {
								acc[record.recid] = {}
							}
							acc[record.recid] = recordWithoutEventRecid
							return acc
						}, {}))

						const groupRecordsByAction = dedupRecordsByRecid.reduce((acc, record) => {
							const {eventtype, ...recordWithoutEventType} = record
							let action
							switch (eventtype) {
								case 1:
									action = 'delete'
									break
								case 2:
									action = 'update'
									break
								default:
									action = 'insert'
							}
							if (!acc[action]) {
								acc[action] = []
							}
							acc[action].push(recordWithoutEventType)
							return acc
						}, {})

						for (const action of Object.keys(groupRecordsByAction)) {
							await this.applyMessages(lowerCaseTableName, groupRecordsByAction[action], action)
						}

						if (ax_consumer_id === 61) {
							for (const record of normalizedRecordsWithRecids) {
								const { eventrecid } = record
								await this.broker.sendToChannel(`${lowerCaseTableName}-topic`, record, {key: `${record.recid}`})
								await this.sendConfirmation(PULLER_CONFIRM_PROCEDURE, eventrecid)
							}
						}
					}
				}
			}
		}
	},

	async started() {
		this.startRealtimeTablesLoop()
		this.startPeriodicTablesLoop()
	}
}
