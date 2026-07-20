const OneCMixin = require('../mixins/one-c.mixin')
const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require(`../configs/one-c/${process.env.NAMESPACE}/one-c.erpuh.crm.clients.topics.config`)

const {
	ONE_C_ERPUH_CRM_CLIENTS_HOST,
	ONE_C_ERPUH_CRM_CLIENTS_SEND_ENDPOINT,
	ONE_C_ERPUH_CRM_CLIENTS_AUTH_TOKEN
} = process.env

module.exports = {
	name: 'one-c.erpuh.crm.clients',

	settings: {
		kafkaGroupId: 'bus-one-c-erpuh-crm-clients-groupid',
		sendHost: ONE_C_ERPUH_CRM_CLIENTS_HOST,
		sendEndpoint: ONE_C_ERPUH_CRM_CLIENTS_SEND_ENDPOINT,
		sendToken: ONE_C_ERPUH_CRM_CLIENTS_AUTH_TOKEN,
		topicsConfig
	},

	mixins: [OneCMixin, StateMixin, KafkaMixin]
}
