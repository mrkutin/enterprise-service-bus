const crypto = require('crypto')

module.exports = {
	name: 'leads.crm',

	settings: {
		rest: '/'
	},

	actions: {
		leads: {
			rest: 'POST /crm-leads',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				body: [
					{ type: 'array', items: 'object' },
					{ type: 'object' }
				],
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const records = [ctx.params.body].flat()
				for (const record of records) {
					const recid = crypto.createHash('md5').update(record.Account).digest('hex')
					await this.broker.sendToChannel('channel.message.api.received', {
						table_name: 'crm-leads',
						record: {...record, recid},
						action: 'upsert'
					}, {key: `${recid}`})
				}
				return Promise.resolve('OK')
			}
		}
	}
}
