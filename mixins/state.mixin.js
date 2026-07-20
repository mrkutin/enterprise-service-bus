const {MongoClient} = require('mongodb')
const tls = require('node:tls')
const {setInterval} = require('node:timers/promises')
const crmTablesData = require(`${__dirname}/../configs/crm.config.js`)
const crmTables = crmTablesData.map(tableData => tableData.tableName)

const AccumulatorMixin = require('../mixins/accumulator.mixin')

const {
	MONGO_DB_RS,
	MONGO_DB_NAME,
	MONGO_HOST,
	MONGO_SECONDARY_HOST,
	MONGO_USER,
	MONGO_PASSWORD,
	MONGO_CA_CERT,
	REDIS_STATE_RECORDS_COUNT
} = process.env

const DB_RS = MONGO_DB_RS
const DB_NAME = MONGO_DB_NAME

const DB_HOSTS = [
	`${MONGO_HOST}:27018`,
	`${MONGO_SECONDARY_HOST}:27018`
]

const DB_USER = MONGO_USER
const DB_PASS = MONGO_PASSWORD

const url = `mongodb://${DB_USER}:${DB_PASS}@${DB_HOSTS}/?maxPoolSize=500`

const options = {
	useNewUrlParser: true,
	useUnifiedTopology: true
}

if (MONGO_CA_CERT?.length) {
	options.secureContext = tls.createSecureContext({
		ca: MONGO_CA_CERT
	})
	options.tls = true
	options.replicaSet = DB_RS
}

module.exports = {
	name: 'state.mixin',

	mixins: [AccumulatorMixin],

	settings: {
		redisStateRecordsCount: REDIS_STATE_RECORDS_COUNT
	},

	methods: {
		async mongoConnect() {
			await this.settings.client.connect()
			this.settings.db = this.settings.client.db(DB_NAME)
		},

		async mongoDisconnect() {
			await this.settings.client.close()
		},

		async createIndexes(){},

		async startStateLoop() {
			await this.broker.waitForServices([this.name])
			await this.createIndexes()
			for await (const startTime of setInterval(1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.stateLoop()
			}
			await this.mongoDisconnect()
		},

		async stateLoop() {
			const buckets = await this.broker.call(`${this.name}.search`, {
				pattern: `${this.name}:*`
			})

			for (const bucket of buckets) {
				const [, table_name, action, importType] = bucket.split(':')

				let values = await this.broker.call(`${this.name}.takeValues`, {
					bucket,
					limit: parseInt(this.settings.redisStateRecordsCount)
				})

				if (values.length) {
					await this.broker.call(`${this.name}.stateProcess`, {table_name, records: values, action, importType})
					values = null
				}
			}
		},
		async applyMessages(table_name, records, action) {
			this.settings.db.collection(table_name).createIndex({'recid': 1}, {unique: true})
			let bulkUpdateOperations = records.map(record => {
				const {_id, created_at, ...rest} = record
				return {
					updateOne: {
						filter: {recid: rest.recid},
						update: {
							$set: action === 'delete' ?
								{to_be_deleted: true}
								:
								crmTables.includes(table_name) ?
									{...rest, crm_status: 'ready', attempts: 0, updated_at: new Date()}
									:
									{...rest, updated_at: new Date()},
							$setOnInsert: {created_at: new Date()}
						}, upsert: true, returnOriginal: false
					}
				}
			})
			await this.settings.db.collection(table_name).bulkWrite(bulkUpdateOperations)
			bulkUpdateOperations = null
		},
		async deleteAllRecords(table_name) {
			await this.settings.db.collection(table_name.toLowerCase()).deleteMany()
		},
		async deleteRecordByRecid(table_name, recid) {
			await this.settings.db.collection(table_name).deleteOne({recid})
		},
		async updateRecords(table_name, filter, update) {
			return await this.settings.db.collection(table_name).updateMany(filter, update)
		},
		async getRecords(table_name, aggregation) {
			return await this.settings.db.collection(table_name).aggregate(aggregation).toArray()
		}
	},

	actions: {
		async stateProcess(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {table_name, records, action} = ctx.params
			await this.applyMessages(table_name, records, action)
		}
	},

	async started() {
		this.settings.client = new MongoClient(url, options)
		await this.mongoConnect()
		this.startStateLoop()
	}
}

