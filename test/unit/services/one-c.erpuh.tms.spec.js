'use strict'

process.env.NAMESPACE = 'test'
process.env.ONE_C_ERPUH_TMS_HOST = 'https://one-c-tms.local'
process.env.ONE_C_ERPUH_TMS_SEND_ENDPOINT = '/send'
process.env.ONE_C_ERPUH_TMS_AUTH_TOKEN = 'tms-token-123'

// Mock topics config for selected namespace
jest.mock('../../../configs/one-c/test/one-c.erpuh.tms.topics.config', () => ({ topicX: {}, topicY: {} }), { virtual: true })

const ServiceSchema = require('../../../services/one-c.erpuh.tms.service')
const topicsConfig = require('../../../configs/one-c/test/one-c.erpuh.tms.topics.config')

describe('one-c.erpuh.tms service (unit)', () => {
	it('exports correct name, settings (from env), topicsConfig and mixins', () => {
		expect(ServiceSchema.name).toBe('one-c.erpuh.tms')

		expect(ServiceSchema.settings).toEqual({
			kafkaGroupId: 'bus-one-c-erpuh-tms-groupid',
			sendHost: process.env.ONE_C_ERPUH_TMS_HOST,
			sendEndpoint: process.env.ONE_C_ERPUH_TMS_SEND_ENDPOINT,
			sendToken: process.env.ONE_C_ERPUH_TMS_AUTH_TOKEN,
			topicsConfig
		})

		expect(Array.isArray(ServiceSchema.mixins)).toBe(true)
		expect(ServiceSchema.mixins).toHaveLength(3)
	})
})


