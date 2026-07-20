const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_STATE_RECORDS_COUNT
} = process.env

module.exports = {
	name: 'clients.kz.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		kzTableName: 'cust-table-response-kz',
		recordsCount: REDIS_STATE_RECORDS_COUNT
	},

	methods: {
		kzMapper(nativeRecord) {
			return {
				recid: nativeRecord.partynumber.toString(),
				custaccount: nativeRecord.custaccount,
				partynumber: nativeRecord.partynumber.toString(),
				inn: nativeRecord.inn,
				kpp: nativeRecord.kpp
			}
		}
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {keys} = ctx.params
				const cursor = this.settings.db.collection('dirpartytable').aggregate([
					{
						$match: {
							recid: {
								$in: keys.map(key => parseInt(key))
							}
						}
					},
					{
						$project: {
							created_at: 0,
							updated_at: 0,
							_id: 0
						}
					}
				])

				while (await cursor.hasNext()) {
					const nativeRecord = await cursor.next()
					const kzRecord = this.kzMapper(nativeRecord)
					if (kzRecord) {
						await this.broker.sendToChannel(`${this.settings.kzTableName}-generated-topic`, kzRecord, {key: `${kzRecord.recid}`})
					}
				}

				await cursor.close()
			}
		}
	},

	channels: {
		'dirpartytable-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				if (record.custaccount.length) {
					this.broker.call(`${this.name}.putKey`, {
						bucket: `${this.name}`,
						key: record.recid
					})
				}
			}
		},
		'cust-table-response-kz-generated-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:cust-table-response-kz:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
