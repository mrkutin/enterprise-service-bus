const ChannelsMiddleware = require('./middlewares/channelsMiddleware')
const ChannelNameMiddleware = require('./middlewares/channelNameMiddleware')
const OpenSearchLogger = require('./open.search.logger')
const MetricsMiddleware = require('./middlewares/metricsMiddleware')
const RetryActionsMiddleware = require('./middlewares/retryActionsMiddleware')

const NAMESPACE = process.env.NAMESPACE || 'dev'

const {
	REDIS_HOST,
	REDIS_PORT,
	REDIS_PASSWORD,
	REDIS_CA_CERT
} = process.env

const redisConnectionParams = {
	host: REDIS_HOST,
	port: parseInt(REDIS_PORT) || 6379,
	password: REDIS_PASSWORD,
	maxPacketSize: 30 * 1024 * 1024
}

if (REDIS_CA_CERT?.length) {
	redisConnectionParams.tls = {
		ca: REDIS_CA_CERT
	}
}

const prune = (obj, depth = 1) => {
	if (Array.isArray(obj) && obj.length > 0) {
		return (depth === 0) ? ['???'] : obj.map(e => prune(e, depth - 1))
	} else if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) {
		return (depth === 0) ? {'???': ''} : Object.keys(obj).reduce((acc, key) => ({
			...acc,
			[key]: prune(obj[key], depth - 1)
		}), {})
	} else {
		return obj
	}
}

/**
 * Moleculer ServiceBroker configuration file
 *
 * More info about options:
 *     https://moleculer.services/docs/0.14/configuration.html
 *
 *
 * Overwriting options in production:
 * ================================
 * 	You can overwrite any option with environment variables.
 * 	For example to overwrite the 'logLevel' value, use `LOGLEVEL=warn` env var.
 * 	To overwrite a nested parameter, e.g. retryPolicy.retries, use `RETRYPOLICY_RETRIES=10` env var.
 *
 * 	To overwrite broker’s deeply nested default options, which are not presented in 'moleculer.config.js',
 * 	use the `MOL_` prefix and double underscore `__` for nested properties in .env file.
 * 	For example, to set the cacher prefix to `MYCACHE`, you should declare an env var as `MOL_CACHER__OPTIONS__PREFIX=mycache`.
 *  It will set this:
 *  {
 *    cacher: {
 *      options: {
 *        prefix: 'mycache'
 *      }
 *    }
 *  }
 *
 * @type {import('moleculer').BrokerOptions}
 */
module.exports = {
	// Namespace of nodes to segment your nodes on the same network.
	namespace: NAMESPACE,
	// Unique node identifier. Must be unique in a namespace.
	// nodeID: null,
	// Custom metadata store. Store here what you want. Accessing: `this.broker.metadata`
	// metadata: {},

	// Enable/disable logging or use custom logger. More info: https://moleculer.services/docs/0.14/logging.html
	// Available logger types: 'Console', 'File', 'Pino', 'Winston', 'Bunyan', 'debug', 'Log4js', 'Datadog'

	logger: [
		{
			type: 'Console',
			options: {
				// Using colors on the output
				colors: true,
				// Print module names with different colors (like docker-compose for containers)
				moduleColors: false,
				// Line formatter. It can be 'json', 'short', 'simple', 'full', a `Function` or a template string like '{timestamp} {level} {nodeID}/{mod}: {msg}'
				formatter: 'full',
				// Custom object printer. If not defined, it uses the `util.inspect` method.
				objectPrinter: null,
				// Auto-padding the module name in order to messages begin at the same column.
				autoPadding: false
			}
		},
		new OpenSearchLogger()
	],


	// Default log level for built-in console logger. It can be overwritten in logger options above.
	// Available values: trace, debug, info, warn, error, fatal
	logLevel: 'info',

	// Define transporter.
	// More info: https://moleculer.services/docs/0.14/networking.html
	// Note: During the development, you don't need to define it because all services will be loaded locally.
	// In production you can set it via `TRANSPORTER=nats://localhost:4222` environment variable.
	transporter: {
		type: 'Redis',
		options: redisConnectionParams
	},

	// Define a cacher.
	// More info: https://moleculer.services/docs/0.14/caching.html
	cacher: null,

	// Define a serializer.
	// Available values: 'JSON', 'Avro', 'ProtoBuf', 'MsgPack', 'Notepack', 'Thrift'.
	// More info: https://moleculer.services/docs/0.14/networking.html#Serialization
	serializer: 'JSON',

	// Number of milliseconds to wait before reject a request with a RequestTimeout error. Disabled: 0
	requestTimeout: 30 * 1000,

	// Retry policy settings. More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Retry
	retryPolicy: {
		// Enable feature
		enabled: true,
		// Count of retries
		retries: 5,
		// First delay in milliseconds.
		delay: 1000,
		// Maximum delay in milliseconds.
		maxDelay: 32 * 1000,
		// Backoff factor for delay. 2 means exponential backoff.
		factor: 2,
		// A function to check failed requests.
		check: err => err && !!err.retryable
	},

	// Limit of calling level. If it reaches the limit, broker will throw an MaxCallLevelError error. (Infinite loop protection)
	maxCallLevel: 100,

	// Number of seconds to send heartbeat packet to other nodes.
	heartbeatInterval: 10,
	// Number of seconds to wait before setting node to unavailable status.
	heartbeatTimeout: 30,

	// Cloning the params of context if enabled. High performance impact, use it with caution!
	contextParamsCloning: false,

	// Tracking requests and waiting for running requests before shuting down. More info: https://moleculer.services/docs/0.14/context.html#Context-tracking
	tracking: {
		// Enable feature
		enabled: true,
		// Number of milliseconds to wait before shuting down the process.
		shutdownTimeout: 60 * 1000,
	},

	// Disable built-in request & emit balancer. (Transporter must support it, as well.). More info: https://moleculer.services/docs/0.14/networking.html#Disabled-balancer
	disableBalancer: false,

	// Settings of Service Registry. More info: https://moleculer.services/docs/0.14/registry.html
	// registry: {
	// 	// Define balancing strategy. More info: https://moleculer.services/docs/0.14/balancing.html
	// 	// Available values: 'RoundRobin', 'Random', 'CpuUsage', 'Latency', 'Shard'
	// 	strategy: 'RoundRobin',
	// 	// Enable local action call preferring. Always call the local action instance if available.
	// 	preferLocal: false
	// },

	// registry: {
	//     strategy: 'Shard',
	// 	preferLocal: false,
	//     strategyOptions: {
	//         shardKey: 'shardKey'
	//     }
	// },

	registry: {
		// Define balancing strategy. More info: https://moleculer.services/docs/0.14/balancing.html
		// Available values: 'RoundRobin', 'Random', 'CpuUsage', 'Latency', 'Shard'
		strategy: 'RoundRobin',
		// strategy: 'Shard',
		// strategyOptions: {
		// 	shardKey: 'shardKey'
		// },
		// Enable local action call preferring. Always call the local action instance if available.
		preferLocal: false
	},

	// Settings of Circuit Breaker. More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Circuit-Breaker
	circuitBreaker: {
		// Enable feature
		enabled: false,
		// Threshold value. 0.5 means that 50% should be failed for tripping.
		threshold: 0.5,
		// Minimum request count. Below it, CB does not trip.
		minRequestCount: 20,
		// Number of seconds for time window.
		windowTime: 60,
		// Number of milliseconds to switch from open to half-open state
		halfOpenTime: 10 * 1000,
		// A function to check failed requests.
		check: err => err && err.code >= 500
	},

	// Settings of bulkhead feature. More info: https://moleculer.services/docs/0.14/fault-tolerance.html#Bulkhead
	bulkhead: {
		// Enable feature.
		enabled: false,
		// Maximum concurrent executions.
		concurrency: 10,
		// Maximum size of queue
		maxQueueSize: 100,
	},

	// Enable action & event parameter validation. More info: https://moleculer.services/docs/0.14/validating.html
	validator: true,

	errorHandler(err, info) {
		const {ctx, action} = info
		const metricName = `${action.name}.errors`
		if (!ctx.broker.metrics.store.has(metricName)) {
			ctx.broker.metrics.register({
				type: 'counter',
				name: metricName,
				description: 'Error count',
				unit: 'pc'
			})
		}

		ctx.broker.metrics.increment(metricName, null, 1)

		// throw auth and non-retryable errors to avoid 404 error
		if (err?.code >= 400 && err?.code < 500) {
			throw err
		}

		let payload
		try {
			payload = JSON.stringify(ctx.params)
		} catch (e) {
			this.logger.error(`JSON stringify error, params: ${JSON.stringify(prune(ctx.params, 2))}, stack: ${e.stack}, original error: ${err.stack}`)
		}
		this.logger.error(`Action ${ctx.action.name} error with payload: ${payload}, error: ${err}, stack: ${err?.stack}`)
	},

	// Enable/disable built-in metrics function. More info: https://moleculer.services/docs/0.14/metrics.html
	metrics: {
		// Available built-in reporters: 'Console', 'CSV', 'Event', 'Prometheus', 'Datadog', 'StatsD'
		enabled: true,
		reporter: [
			{
				type: 'Prometheus',
				options: {
					// HTTP port
					port: 3030,
					// HTTP URL path
					path: '/metrics',
					// Default labels which are appended to all metrics labels
					defaultLabels: registry => ({
						namespace: registry.broker.namespace,
						nodeID: registry.broker.nodeID
					})
				}
			},
			{
				type: 'Event',
				options: {
					// Event name
					eventName: '$metrics.snapshot',
					// Broadcast or emit
					broadcast: false,
					// Event groups
					groups: null,
					// Send only changed metrics
					onlyChanges: false,
					// Sending interval in seconds
					interval: 10
				}
			}
		]
	},

	// Enable built-in tracing function. More info: https://moleculer.services/docs/0.14/tracing.html
	// tracing: {
	// 	enabled: true,
	// 	//exporter: 'Console'
	// 	// Available built-in exporters: 'Console', 'Datadog', 'Event', 'EventLegacy', 'Jaeger', 'Zipkin'
	// 	// exporter: {
	// 	// 	type: 'Console', // Console exporter is only for development!
	// 	// 	options: {
	// 	// 		// Custom logger
	// 	// 		logger: null,
	// 	// 		// Using colors
	// 	// 		colors: true,
	// 	// 		// Width of row
	// 	// 		width: 100,
	// 	// 		// Gauge width in the row
	// 	// 		gaugeWidth: 40
	// 	// 	}
	// 	// }
	// },

	// Register custom middlewares
	middlewares: [
		ChannelNameMiddleware,
		ChannelsMiddleware,
		...MetricsMiddleware,
		RetryActionsMiddleware
	],

	// Register custom REPL commands.
	replCommands: null,

	// Called after broker created.
	created(broker) {

	},

	// Called after broker started.
	async started(broker) {

	},

	// Called after broker stopped.
	async stopped(broker) {

	}
}
