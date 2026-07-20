const StateMixin = require('../mixins/state.mixin')
const crmTablesData = require(`${__dirname}/../configs/crm.config.js`)

const {
	CRM_AGREEMENTS_TABLE_NAME
} = process.env

module.exports = {
	name: 'kafka',

	mixins: [StateMixin],

	methods: {
		async applyBiPaymentOrders(table_name, records, action) {
			const { matchQuery } = crmTablesData.find(tableData => tableData.tableName === CRM_AGREEMENTS_TABLE_NAME)

			const biPaymentOrdersWithCrmAgreements = (await this.getRecords(
				CRM_AGREEMENTS_TABLE_NAME,
				[
					{
						$match: {
							code: {
								$in: records.map(record => record.agreement_number)
							},
							...matchQuery
						}
					},
					{
						$project: {
							code: 1,
							_id: 0
						}
					}
				]
			)).map(res => records.find(record => record.agreement_number === res.code))

			if (biPaymentOrdersWithCrmAgreements.length) {
				this.settings.db.collection(table_name).createIndex({'recid': 1}, {unique: true})
				let bulkUpdateOperations = biPaymentOrdersWithCrmAgreements.map(record => {
					const {_id, created_at, ...rest} = record
					return {
						updateOne: {
							filter: {recid: rest.recid},
							update: {
								$set: action === 'delete' ?
									{to_be_deleted: true}
									:
									{...rest, crm_status: 'ready', attempts: 0, updated_at: new Date()},
								$setOnInsert: {created_at: new Date()}
							}, upsert: true, returnOriginal: false
						}
					}
				})
				await this.settings.db.collection(table_name).bulkWrite(bulkUpdateOperations)
				bulkUpdateOperations = null
			}
		}
	},

	actions: {
		async stateProcess(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {table_name, records, action} = ctx.params

			if (table_name === 'bi-payment-orders') {
				await this.applyBiPaymentOrders(table_name, records, action)
			} else {
				await this.applyMessages(table_name, records, action)
			}
			for (const record of records) {
				await this.broker.sendToChannel('channel.message.kafka.applied', {table_name, record, action}, {key: `${record.recid}`})
			}
		}
	},

	channels: {
		'bi-accounts-receivable-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'bi-payment-orders-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'bi-kpi-sales-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]
				const {fias_region, ...rest} = message

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {
						...rest,
						fias_region: fias_region === '' ?
							null
							:
							fias_region,
						recid: key
					}
				})
			}
		},

		'pim-cover-kz-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'pim-content-kz-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'pim-attributes-catalog-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = message.data.pimId.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'pim-attributes-nps-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = message.pimId.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'pim-product-nps-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = message.data.id.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key, to_be_deleted: message.event === 'delete'}
				})
			}
		},

		'magento-order-company-one-c-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const {...message} = ctx.params
				const {channelName} = ctx
				const key = raw.key.toString()
				const table_name = channelName.split('-topic')[0]

				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${table_name}:upsert`,
					key,
					value: {...message, recid: key}
				})
			}
		},

		'ps-feed-price-stock-catalog': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {...message} = ctx.params
				const {channelName} = ctx

				for (const product of message.data.products) {
					this.broker.call(`${this.name}.putKeyValue`, {
						bucket: `${this.name}:${channelName}:upsert`,
						key: product.id,
						value: {...product, recid: product.id}
					})
				}
			}
		},

		'm3activity-actor-statement-finished-topic': {
			group: this.name,
			fromBeginning: true,
			maxRetries: 0,
			handler(ctx) {
				const {...message} = ctx.params
				if (message.data.request.payload.statement.object.id.startsWith('multiplume:')) {
					const {channelName} = ctx
					const {userId, nomenclature} = message.data.request.payload.statement.object.definition.extensions
					const taskId = message.data.request.payload.statement.object.id
					const date = message.data.request.payload.statement.timestamp
					if (isNaN(new Date(date))) {
						this.logger.error(`Incorrect date format with payload: ${JSON.stringify({message})}`)
						return
					}
					if (userId && nomenclature && taskId) {
						const key =`${userId}:${nomenclature}:${taskId}`
						const table_name = channelName.split('-topic')[0]

						this.broker.call(`${this.name}.putKeyValue`, {
							bucket: `${this.name}:${table_name}:upsert`,
							key,
							value: {...message, recid: key}
						})
					}
				}
			}
		}
	}
}
