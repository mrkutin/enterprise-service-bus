const clientsMixin = require('../mixins/clients.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')
const StateMixin = require('../mixins/state.mixin')

const CRM_CLIENTS_REQUESTS_TABLE_NAME = process.env.CRM_CLIENTS_REQUESTS_TABLE_NAME || 'cust-table-request-crm'
const CRM_CLIENTS_RESPONSES_TABLE_NAME = process.env.CRM_CLIENTS_RESPONSES_TABLE_NAME || 'cust-table-response-crm'

module.exports = {
	name: 'clients.crm.request',

	mixins: [clientsMixin, MssqlMixin, StateMixin],

	settings: {
		requestsTable: CRM_CLIENTS_REQUESTS_TABLE_NAME,
		responsesTable: CRM_CLIENTS_RESPONSES_TABLE_NAME
	},

	methods: {
		requestMapper(record) {
			return {
				inn: record.inn,
				kpp: record.kpp,
				channelid: record.channel,
				custvendsource: record.source,
				custvendtype: record.account_type
			}
		},
		async generateResponses(responses){
			await this.updateRecords(
				this.settings.responsesTable,
				{
					recid: {
						$in: responses.map(response => response.recid)
					}
				},
				{$set: {crm_status: 'ready', attempts: 0, updated_at: new Date()}}
			)
		}
	},

	channels: {
		[`${CRM_CLIENTS_REQUESTS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_CLIENTS_REQUESTS_TABLE_NAME}`,
					key: record.recid,
					value: record
				})
			}
		},
		[`${CRM_CLIENTS_RESPONSES_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_CLIENTS_RESPONSES_TABLE_NAME}`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
