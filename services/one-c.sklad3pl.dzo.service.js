const OneCMixin = require('../mixins/one-c.mixin')
const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require(`../configs/one-c/${process.env.NAMESPACE}/one-c.sklad3pl.dzo.topics.config`)
const axios = require('axios')
const {MoleculerServerError} = require('moleculer').Errors
const https = require('https')

const apiClient = axios.create()

apiClient.interceptors.request.use(config => {
	console.log('--- Axios Request ---')
	console.log('Method:', config.method?.toUpperCase())
	console.log('URL:', config.baseURL ? config.baseURL + config.url : config.url)
	console.log('Headers:', JSON.stringify(config.headers, null, 2))
	console.log('Body:', JSON.stringify(config.data, null, 2))
	console.log('---------------------')
	return config
}, error => {
	return Promise.reject(error)
})

const {
	ONE_C_SKLAD3PL_DZO_HOST,
	ONE_C_SKLAD3PL_DZO_SEND_ENDPOINT,
	ONE_C_SKLAD3PL_DZO_AUTH_TOKEN
} = process.env

module.exports = {
	name: 'one-c.sklad3pl.dzo',

	settings: {
		kafkaGroupId: 'bus-one-c-sklad3pl-dzo-groupid',
		sendHost: ONE_C_SKLAD3PL_DZO_HOST,
		sendEndpoint: ONE_C_SKLAD3PL_DZO_SEND_ENDPOINT,
		sendToken: ONE_C_SKLAD3PL_DZO_AUTH_TOKEN,
		topicsConfig
	},

	mixins: [OneCMixin, StateMixin, KafkaMixin],

	methods: {
		async consumerProcess(topic, message) {
			const key = message.key.toString()
			const parsedMessage = JSON.parse(message.value.toString())
			this.logger.info(`Method consumerProcess: ${JSON.stringify({parsedMessage, topic, key})}`)
			this.broker.call(`${this.name}.putKeyValue`, {
				bucket: `${this.name}:${topic.split('-topic')[0]}:upsert`,
				key,
				value: {...parsedMessage, recid: key}
			})

			await this.oneCUpload(topic, this.settings.topicsConfig[topic].requestType, parsedMessage)
		},

		async oneCUpload(topic, requestType, record) {
			try {
				this.logger.info(`Method oneCUpload input: ${JSON.stringify({topic, requestType, record})}`)

				const httpsAgent = new https.Agent({
					rejectUnauthorized: false
				})

				await apiClient.post(this.settings.sendHost + this.settings.sendEndpoint + requestType,
					record,
					{
						timeout: 20 * 1000,
						withCredentials: true,
						headers: {
							token: this.settings.sendToken
						},
						httpsAgent
					})
				this.logger.info(`ONE-C upload ${topic} with record: ${JSON.stringify(record)} successfully posted to 1C from ${this.name} service at ${new Date()}`)
			} catch (e) {
				this.logger.error('Message:', e.message)
				this.logger.error('Code:', e.code)
				this.logger.error('Config URL:', e.config?.url)
				this.logger.error('Underlying cause:', e.cause)

				if (e.response) {
					this.logger.error('Response status:', e.response.status)
					this.logger.error('Response headers:', JSON.stringify(e.response.headers, null, 2))
					this.logger.error('Response data:', JSON.stringify(e.response.data, null, 2))
				}

				this.logger.error(`One-c upload error in topic ${topic} with payload: ${JSON.stringify({
					topic,
					record
				}, null, 2)}, error: ${JSON.stringify({'stack': e.stack}, null, 2)}`)

				if (e.response.status !== 400) {
					throw new MoleculerServerError(e)
				}
			}
		}
	}
}
