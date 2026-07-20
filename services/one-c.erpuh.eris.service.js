const OneCMixin = require('../mixins/one-c.mixin')
const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require(`../configs/one-c/${process.env.NAMESPACE}/one-c.erpuh.eris.topics.config`)

const {
	ONE_C_ERPUH_ERIS_HOST,
	ONE_C_ERPUH_ERIS_SEND_ENDPOINT,
	ONE_C_ERPUH_ERIS_AUTH_TOKEN
} = process.env

module.exports = {
	name: 'one-c.erpuh.eris',

	settings: {
		kafkaGroupId: 'bus-one-c-erpuh-eris-groupid',
		sendHost: ONE_C_ERPUH_ERIS_HOST,
		sendEndpoint: ONE_C_ERPUH_ERIS_SEND_ENDPOINT,
		sendToken: ONE_C_ERPUH_ERIS_AUTH_TOKEN,
		topicsConfig
	},

	mixins: [OneCMixin, StateMixin, KafkaMixin]
}
