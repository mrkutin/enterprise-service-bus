const clientsMixin = require('../mixins/clients.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')
const StateMixin = require('../mixins/state.mixin')

const KZ_CLIENTS_REQUESTS_TABLE_NAME = process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME || 'cust-table-request-kz'
const KZ_CLIENTS_RESPONSES_TABLE_NAME = process.env.KZ_CLIENTS_RESPONSES_TABLE_NAME || 'cust-table-response-kz'

module.exports = {
	name: 'clients.kz.request',

	mixins: [clientsMixin, MssqlMixin, StateMixin],

	settings: {
		requestsTable: KZ_CLIENTS_REQUESTS_TABLE_NAME,
		responsesTable: KZ_CLIENTS_RESPONSES_TABLE_NAME
	},

	methods: {
		requestMapper(record) {
			return record
		},
		async generateResponses(responses) {
			for (const response of responses) {
				await this.broker.sendToChannel(`${this.settings.responsesTable}-topic`, response, {key: `${response.recid}`})
			}
		}
	},

	channels: {
		[`${KZ_CLIENTS_REQUESTS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${KZ_CLIENTS_REQUESTS_TABLE_NAME}`,
					key: record.recid || raw.key.toString(),
					value: record
				})
			}
		},
		[`${KZ_CLIENTS_RESPONSES_TABLE_NAME}-generated-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${KZ_CLIENTS_RESPONSES_TABLE_NAME}`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
