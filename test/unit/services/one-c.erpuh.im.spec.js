'use strict'

process.env.NAMESPACE = 'test'
process.env.ONE_C_ERPUH_IM_HOST = 'https://one-c.local'
process.env.ONE_C_ERPUH_IM_SEND_ENDPOINT = '/send'
process.env.ONE_C_ERPUH_IM_AUTH_TOKEN = 'token-123'

// Mock topics config for selected namespace
jest.mock('../../../configs/one-c/test/one-c.erpuh.im.topics.config', () => ({ topicA: {}, topicB: {} }), { virtual: true })

const ServiceSchema = require('../../../services/one-c.erpuh.im.service')
const topicsConfig = require('../../../configs/one-c/test/one-c.erpuh.im.topics.config')

describe('one-c.erpuh.im service (unit)', () => {
	it('exports correct name, settings (from env), topicsConfig and mixins', () => {
		expect(ServiceSchema.name).toBe('one-c.erpuh.im')

		expect(ServiceSchema.settings).toEqual({
			kafkaGroupId: 'bus-one-c-erpuh-im-groupid',
			sendHost: process.env.ONE_C_ERPUH_IM_HOST,
			sendEndpoint: process.env.ONE_C_ERPUH_IM_SEND_ENDPOINT,
			sendToken: process.env.ONE_C_ERPUH_IM_AUTH_TOKEN,
			topicsConfig
		})

		expect(Array.isArray(ServiceSchema.mixins)).toBe(true)
		expect(ServiceSchema.mixins).toHaveLength(3)
	})
})


