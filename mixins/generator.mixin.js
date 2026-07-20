const {setInterval} = require('node:timers/promises')
const AccumulatorMixin = require('./accumulator.mixin')

module.exports = {
	name: 'generator.mixin',

	mixins: [AccumulatorMixin],

	methods: {
		async generatorStartLoop() {
			for await (const startTime of setInterval(1000, Date.now())) {
				if (this.broker.stopping) {
					this.logger.info(`${this.name} service has stopped, exit the loop`)
					break
				}
				await this.generatorLoop()
			}
			await this.mongoDisconnect()
		},
		async generatorLoop() {
			const keys = await this.broker.call(`${this.name}.takeKeys`, {
				bucket: `${this.name}`,
				limit: parseInt(this.settings.recordsCount)
			})
			keys.length && await this.broker.call(`${this.name}.generatorProcess`, {keys})
		}
	},

	actions: {
		async aggregate() {
			throw new Error('Action aggregate must be implemented')
		}
	},

	started() {
		this.generatorStartLoop()
	}
}
