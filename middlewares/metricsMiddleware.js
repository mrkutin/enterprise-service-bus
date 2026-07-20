module.exports = [
	{
		localAction(next, action) {
			return async function (ctx) {
				const metricName = `${action.name.replaceAll('$', '')}.duration`
				if (!ctx.broker.metrics.store.has(metricName)) {
					ctx.broker.metrics.register({
						type: 'gauge',
						name: metricName,
						description: 'Action time duration',
						unit: 'millisecond'
					})
				}

				const time = Date.now()
				const res = await next(ctx)
				const duration = Date.now() - time

				ctx.broker.metrics.set(metricName, duration)
				return res
			}
		}
	},
	{
		localChannel(next, channel) {
			return async (msg, raw) => {
				try {
					await next(msg, raw)
				} catch (err) {
					const metricName = `${channel.group}.${channel.name}.errors`
					if (!msg.broker.metrics.store.has(metricName)) {
						msg.broker.metrics.register({
							type: 'counter',
							name: metricName,
							description: 'Error count',
							unit: 'pc'
						})
					}

					msg.broker.metrics.increment(metricName, null, 1)
					throw err
				}
			}
		}
	}
]
