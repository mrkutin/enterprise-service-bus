const OneCMixin = require('../mixins/one-c.mixin')
const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require(`../configs/one-c/${process.env.NAMESPACE}/one-c.tms.erpuh.topics.config`)

const {
	ONE_C_TMS_ERPUH_HOST,
	ONE_C_TMS_ERPUH_SEND_ENDPOINT,
	ONE_C_TMS_ERPUH_AUTH_TOKEN
} = process.env

module.exports = {
	name: 'one-c.tms.erpuh',

	settings: {
		kafkaGroupId: 'bus-one-c-tms-erpuh-groupid',
		sendHost: ONE_C_TMS_ERPUH_HOST,
		sendEndpoint: ONE_C_TMS_ERPUH_SEND_ENDPOINT,
		sendToken: ONE_C_TMS_ERPUH_AUTH_TOKEN,
		topicsConfig
	},

	mixins: [OneCMixin, StateMixin, KafkaMixin]
}
