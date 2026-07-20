const {setInterval} = require('node:timers/promises')

const AccumulatorMixin = require('../mixins/accumulator.mixin')

const {
	REDIS_STATE_RECORDS_COUNT
} = process.env

module.exports = {
	name: 'clients.mixin',

	mixins: [AccumulatorMixin],

	settings: {
		redisStateRecordsCount: REDIS_STATE_RECORDS_COUNT
	},

	actions: {
		async stateProcess(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {table_name, records, action} = ctx.params
			await this.applyMessages(table_name, records, action)
		},
		async processRequest(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {requests} = ctx.params
			const innArray = requests.map(record => record.inn)
			const kppArray = requests.map(record => record.kpp)

			//update requests with status
			await this.applyMessages(
				this.settings.requestsTable,
				requests.map(request => ({
					recid: `${request.inn}:${request.kpp}`,
					status: 'pending', response: null, updated_at: new Date(),
					...request
				})),
				'update'
			)

			//find responses by requests
			const clients = await this.getRecords(
				this.settings.responsesTable,
				[
					{
						$match: {
							inn: {
								$in: innArray
							},
							kpp: {
								$in: kppArray
							}
						}
					},
					{
						$project: {
							_id: 0,
							updated_at: 0,
							created_at: 0
						}
					}
				]
			)

			//clients found - generate response and update requests
			if (clients.length) {
				await this.updateRecords(
					this.settings.requestsTable,
					{
						recid: {
							$in: clients.map(client => `${client.inn}:${client.kpp}`)
						}
					},
					{$set: {status: 'sent_cached', updated_at: new Date()}}
				)

				await this.generateResponses(clients)
			}

			const clientsInns = clients.map(client => client.inn)
			const notFoundedInns = innArray.filter(inn => !clientsInns.includes(inn))

			//create not found clients in ax
			for (const request of requests) {
				if (notFoundedInns.includes(request.inn)) {
					const { inn, kpp, channelid, custvendsource, custvendtype } = this.requestMapper(request)
					await this.createCustomer(inn, kpp, channelid, custvendsource, custvendtype)
				}
			}
		},
		async processResponse(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {responses} = ctx.params
			//find requests by clients
			const requests = await this.getRecords(
				this.settings.requestsTable,
				[
					{
						$match: {
							inn: {
								$in: responses.map(client => client.inn)
							},
							kpp: {
								$in: responses.map(client => client.kpp)
							},
							status: 'pending'
						}
					}
				]
			)
			this.logger.info(`Found requests length: ${requests.length} for responses: ${JSON.stringify(responses)}`)

			//update found requests and generate responses
			if (requests.length) {
				const innKppMap = requests.reduce((acc, value) => {
					const matchResponses = responses.filter(client => client.inn === value.inn && client.kpp === value.kpp)
					if (matchResponses) {
						if (!acc[`${value.inn}:${value.kpp}`]) {
							acc[`${value.inn}:${value.kpp}`] = {}
						}
						acc[`${value.inn}:${value.kpp}`] = matchResponses
					}
					return acc
				}, {})

				if (Object.keys(innKppMap).length) {
					await this.updateRecords(
						this.settings.requestsTable,
						{
							recid: {
								$in: Object.keys(innKppMap)
							}
						},
						{
							$set: {
								status: 'sent_response',
								updated_at: new Date()
							}
						}
					)

					for (const responses of Object.values(innKppMap)) {
						await this.generateResponses(responses)
					}
				}
			}
		}
	},

	methods: {
		async startClientsLoop() {
			for await (const startTime of setInterval(1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.clientsLoop()
			}
		},

		async clientsLoop() {
			const requestsBuckets = await this.broker.call(`${this.name}.search`, {
				pattern: `${this.name}:${this.settings.requestsTable}`
			})

			for (const bucket of requestsBuckets) {
				const values = await this.broker.call(`${this.name}.takeValues`, {
					bucket,
					limit: parseInt(this.settings.redisStateRecordsCount)
				})

				if (values.length) {
					await this.broker.call(`${this.name}.processRequest`, {requests: values})
				}
			}

			const responsesBuckets = await this.broker.call(`${this.name}.search`, {
				pattern: `${this.name}:${this.settings.responsesTable}`
			})

			for (const bucket of responsesBuckets) {
				const values = await this.broker.call(`${this.name}.takeValues`, {
					bucket,
					limit: parseInt(this.settings.redisStateRecordsCount)
				})

				if (values.length) {
					await this.broker.call(`${this.name}.processResponse`, {responses: values})
				}
			}
		},
		async stateLoop() {
			const buckets = await this.broker.call(`${this.name}.search`, {
				pattern: `${this.name}:${this.settings.requestsTable}:*`
			})

			for (const bucket of buckets) {

				const [, table_name, action] = bucket.split(':')

				const values = await this.broker.call(`${this.name}.takeValues`, {
					bucket,
					limit: parseInt(this.settings.redisStateRecordsCount)
				})

				if (values.length) {
					await this.broker.call(`${this.name}.stateProcess`, {table_name, records: values, action})
				}
			}
		}
	},

	started() {
		this.startClientsLoop()
	}
}
