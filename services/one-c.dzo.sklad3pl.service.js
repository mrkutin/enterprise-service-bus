const OneCMixin = require('../mixins/one-c.mixin')
const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require(`../configs/one-c/${process.env.NAMESPACE}/one-c.dzo.sklad3pl.topics.config`)
const axios = require('axios')
const crypto = require('crypto')
const {MoleculerServerError} = require('moleculer').Errors

const {
	ONE_C_DZO_SKLAD3PL_HOST,
	ONE_C_DZO_SKLAD3PL_SEND_ENDPOINT,
	ONE_C_DZO_SKLAD3PL_AUTH_TOKEN
} = process.env

module.exports = {
	name: 'one-c.dzo.sklad3pl',

	settings: {
		kafkaGroupId: 'bus-one-c-dzo-sklad3pl-groupid',
		sendHost: ONE_C_DZO_SKLAD3PL_HOST,
		sendEndpoint: ONE_C_DZO_SKLAD3PL_SEND_ENDPOINT,
		sendToken: ONE_C_DZO_SKLAD3PL_AUTH_TOKEN,
		topicsConfig
	},

	mixins: [OneCMixin, StateMixin, KafkaMixin],

	methods: {
		async oneCUpload(topic, record) {
			try {
				this.logger.info(`Method oneCUpload input: ${JSON.stringify({topic, record})}`)
				const md5KeyMessage = crypto.createHash('md5').update(record.recid).digest('hex')
				await axios.post(this.settings.sendHost + this.settings.sendEndpoint,
					record,
					{
						timeout: 20 * 1000,
						withCredentials: true,
						headers: {
							topic,
							keyMessage: md5KeyMessage,
							Authorization: `Basic ${this.settings.sendToken}`
						}
					})
				this.logger.info(`ONE-C upload ${topic} with record: ${JSON.stringify(record)} successfully posted to 1C from ${this.name} service at ${new Date()}`)
			} catch (e) {
				this.logger.error(`One-c upload error in topic ${topic} with payload: ${JSON.stringify({
					topic,
					record
				}, null, 2)}, error: ${JSON.stringify({'stack': e.stack, 'data': e?.response?.data?.errorMessage}, null, 2)}`)
				throw new MoleculerServerError(e)
			}
		}
	}
}
