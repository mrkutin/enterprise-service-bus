const {v4: uuidv4} = require('uuid')

module.exports = {
	name: 'contacts.crm',

	settings: {
		rest: '/'
	},

	actions: {
		contacts: {
			rest: 'POST /queues/contacts',
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
					const recid = uuidv4()
					await this.broker.sendToChannel('channel.message.api.received', {
						table_name: 'crm-contacts',
						record: {...record, recid},
						action: 'upsert'
					}, {key: `${recid}`})
				}
				return Promise.resolve('OK')
			}
		}
	}
}
