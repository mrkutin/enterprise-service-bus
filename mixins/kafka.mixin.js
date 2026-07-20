const {Kafka} = require('kafkajs')

const {
	KAFKA_BROKER_STRING,
	KAFKA_ADMIN_USER,
	KAFKA_ADMIN_PASSWORD
} = process.env

const KAFKA_MAX_RETRIES = parseInt(process.env.KAFKA_MAX_RETRIES) ? parseInt(process.env.KAFKA_MAX_RETRIES) : 72
const KAFKA_RETRY_TIMEOUT = parseInt(process.env.KAFKA_RETRY_TIMEOUT) ? parseInt(process.env.KAFKA_RETRY_TIMEOUT) : 20 * 60 * 1000

module.exports = {
	name: 'kafka.mixin',

	settings: {
		kafkaRetryTimeout: KAFKA_RETRY_TIMEOUT
	},

	methods: {
		async consumerStart() {
			await this.broker.waitForServices([this.name])
			this.settings.consumer = this.settings.kafka.consumer({groupId: this.settings.kafkaGroupId})
			await this.broker.call(`${this.name}.consumerConnectAndRun`)
		},
		async consumerErrorHandler(error, topic, partition, offset){
			const isRetriesCountOver = this.consumerRetryHandler(topic)
			if (isRetriesCountOver) {
				this.logger.error(`${this.name} upload retries count for topic: ${topic} is over, skipping message. Error: ${error}`)
				await this.settings.consumer.commitOffsets([
					{ topic, partition, offset: parseInt(offset) + 1 }
				])
			} else {
				await this.settings.consumer.seek({topic, partition, offset})
				this.logger.info(`Call method consumerPause with payload topic: ${topic}, retries count: ${this.settings.topicsConfig[topic].retriesCount}`)
				await this.consumerPause(topic)
			}
		},
		consumerRetryHandler(topic){
			if (this.settings.topicsConfig[topic].retriesCount === KAFKA_MAX_RETRIES) {
				this.settings.topicsConfig[topic].retriesCount = 0
				return true
			}
			this.settings.topicsConfig[topic].retriesCount++
			return false
		},
		async consumerPause(topic) {
			this.settings.consumer.pause([{ topic }])
			const timeout = setTimeout(() => {
				this.settings.consumer.resume([{ topic }])
				clearTimeout(timeout)
			}, this.settings.kafkaRetryTimeout)
		},
		async consumerProcess() {
			throw new Error('Method consumerProcess must be implemented')
		}
	},

	actions: {
		async consumerConnectAndRun(){
			await this.settings.consumer.connect()
			this.settings.consumer.subscribe({topics: Object.keys(this.settings.topicsConfig), fromBeginning: true})

			await this.settings.consumer.run({
				autoCommit: false,
				eachMessage: async ({ topic, partition, message }) => {
					const offset = message.offset
					try {
						await this.consumerProcess(topic, message)

						this.settings.kafkaRetryTimeout = KAFKA_RETRY_TIMEOUT

						await this.settings.consumer.commitOffsets([
							{ topic, partition, offset: parseInt(offset) + 1 }
						])

						this.settings.topicsConfig[topic].retriesCount = 0
					} catch (error) {
						await this.consumerErrorHandler(error, topic, partition, offset)
					}
				}
			})
		}
	},

	created() {
		this.settings.kafka = new Kafka({
			clientId: 'kafka service client',
			brokers: [`${KAFKA_BROKER_STRING}:9091`],
			ssl: {
				rejectUnauthorized: false
			},
			sasl: {
				mechanism: 'scram-sha-512',
				username: KAFKA_ADMIN_USER,
				password: KAFKA_ADMIN_PASSWORD
			}
		})
	},

	async started(){
		this.consumerStart()
	},

	async stopped(){
		await this.settings.consumer.disconnect()
	}
}
