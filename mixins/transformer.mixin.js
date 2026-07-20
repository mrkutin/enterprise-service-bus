const {setInterval} = require('node:timers/promises')
const AccumulatorMixin = require('./accumulator.mixin')

module.exports = {
	name: 'transformer.mixin',

	mixins: [AccumulatorMixin],

	methods: {
		async transformerStartLoop() {
			for await (const startTime of setInterval(1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.transformerLoop()
			}
			await this.mongoDisconnect()
		},

		async transformerLoop() {
			const buckets = await this.broker.call(`${this.name}.search`, {
				pattern: `${this.name}:*`
			})

			for (const bucket of buckets) {
				const [, table_name] = bucket.split(':')
				const keys = await this.broker.call(`${this.name}.takeKeys`, {
					bucket,
					limit: parseInt(this.settings.recidsToTransformReadCount)
				})
				keys.length && await this.broker.call(`${this.name}.process`, {
					table_name,
					recids: keys.map(key => parseInt(key) == key ? parseInt(key) : key)
				})
			}
		}
	},

	async started() {
		this.transformerStartLoop()
	}
}
