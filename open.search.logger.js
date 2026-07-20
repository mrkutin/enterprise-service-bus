const BaseLogger = require("moleculer").Loggers.Base
const axios = require('axios')
const process = require('process')
const os = require('os')
const https = require('https')
const {setInterval} = require("node:timers/promises");

const NAMESPACE = process.env.NAMESPACE || 'dev'
const OPENSEARCH_NODE = process.env.OPENSEARCH_NODE
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD
const AI_ASSISTANT_HOST = process.env.AI_ASSISTANT_HOST

const OPENSEARCH_TIME_INTERVAL_MS = 5000

class OpenSearchLogger extends BaseLogger {
	constructor(opts) {
		super(opts)
		this.pool = []
	}

	async init(loggerFactory) {
		super.init(loggerFactory)
		for await (const startTime of setInterval(OPENSEARCH_TIME_INTERVAL_MS, Date.now())) {
			await this.flush()
		}
	}

	async flush() {
		if (!this.pool.length) {
			return Promise.resolve()
		}

		const body = this.pool.splice(0)

		const ndjson = body.reduce((acc, value) => {
			return acc + JSON.stringify(value) + '\n'
		}, '')

		try {
			await axios.post(
				`${OPENSEARCH_NODE}_bulk`,
				ndjson,
				{
					auth: {
						username: OPENSEARCH_USERNAME,
						password: OPENSEARCH_PASSWORD
					},
					headers: {
						'Content-Type': 'application/x-ndjson'
					},
					httpsAgent: new https.Agent({rejectUnauthorized: false})
				}
			)
		} catch (e) {
			console.log(`Posting logs to Opensearch error: ${e.message}`)
		}
	}

	getLogHandler(bindings) {
		const globalLogLevel = this.broker.options.logLevel
		const levelIdx = BaseLogger.LEVELS.indexOf(globalLogLevel)


		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type)
			if (typeIdx > levelIdx) {
				return
			}

			const currentDate = new Date()
			const index = `bus-${NAMESPACE}-info-${currentDate.toISOString().substring(5, 10)}`

			this.pool.push({
				create: {_index: index}
			})
			this.pool.push({
				level: type,
				time: currentDate,
				pid: process.pid,
				hostname: os.hostname(),
				nodeID: bindings.nodeID,
				ns: bindings.ns,
				mod: bindings.mod,
				svc: bindings.svc,
				msg: args.reduce((acc, value) => {
					acc += typeof value === 'object' ?
						value.stack || JSON.stringify(value)
						:
						value
					return acc
				}, '')
			})
		}
	}
}

module.exports = OpenSearchLogger
