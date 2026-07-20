const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_STATE_RECORDS_COUNT
} = process.env

module.exports = {
	name: 'clients.crm.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		crmTableName: 'cust-table-response-crm',
		recordsCount: REDIS_STATE_RECORDS_COUNT
	},

	methods: {
		crmMapper(nativeRecord) {
			try {
				return {
					recid: nativeRecord.partynumber.toString(),
					gak: nativeRecord.partynumber.toString(),
					account_code: nativeRecord.custaccount.toString(),
					name: nativeRecord.name.toString(),
					source: nativeRecord.custsource || 0,
					type: nativeRecord.extpartytype || '',
					status: nativeRecord.status || null,
					inn: nativeRecord.inn.toString(),
					kpp: nativeRecord.kpp.toString(),
					update_date: nativeRecord.dirpartytablemoddt || null,
					ax_identificators: [
						{
							company_code: 'psv',
							account_number: nativeRecord.custaccount.toString(),
							channel_code: nativeRecord.channelid.toString()
						}
					]
				}
			} catch (e) {
				this.logger.error(`CRM mapping error in record ${nativeRecord.recid}: `, e)
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
					const crmRecord = this.crmMapper(nativeRecord)
					if (crmRecord) {
						await this.broker.sendToChannel(`${this.settings.crmTableName}-topic`, crmRecord, {key: `${crmRecord.recid}`})
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
					this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
					this.broker.call(`${this.name}.putKey`, {
						bucket: `${this.name}`,
						key: record.recid
					})
				}
			}
		},
		'cust-table-response-crm-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {...message} = ctx.params
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:cust-table-response-crm:upsert`,
					key: message.recid,
					value: message
				})
			}
		}
	}
}
