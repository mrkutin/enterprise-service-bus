module.exports = {
	name: 'supervisor',

	events: {
		'$node.disconnected'(payload) {
			payload.node.services.filter(service => service.name !== '$node').forEach(service => {
				const metricName = `${service.name}.crash`
				if (!this.broker.metrics.store.has(metricName)) {
					this.broker.metrics.register({
						type: 'counter',
						name: metricName,
						description: 'Service crash count',
						unit: 'millisecond',
						rate: true
					})
				}
				this.broker.metrics.increment(metricName, null, 1)
			})
		}
	}
}
