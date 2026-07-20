'use strict'

process.env.NAMESPACE = 'test'
process.env.ONE_C_TMS_ERPUH_HOST = 'https://one-c-erpuh.local'
process.env.ONE_C_TMS_ERPUH_SEND_ENDPOINT = '/send'
process.env.ONE_C_TMS_ERPUH_AUTH_TOKEN = 'erpuh-token-123'

// Mock topics config for selected namespace
jest.mock('../../../configs/one-c/test/one-c.tms.erpuh.topics.config', () => ({ t1: {}, t2: {} }), { virtual: true })

const ServiceSchema = require('../../../services/one-c.tms.erpuh.service')
const topicsConfig = require('../../../configs/one-c/test/one-c.tms.erpuh.topics.config')

describe('one-c.tms.erpuh service (unit)', () => {
	it('exports correct name, settings (from env), topicsConfig and mixins', () => {
		expect(ServiceSchema.name).toBe('one-c.tms.erpuh')

		expect(ServiceSchema.settings).toEqual({
			kafkaGroupId: 'bus-one-c-tms-erpuh-groupid',
			sendHost: process.env.ONE_C_TMS_ERPUH_HOST,
			sendEndpoint: process.env.ONE_C_TMS_ERPUH_SEND_ENDPOINT,
			sendToken: process.env.ONE_C_TMS_ERPUH_AUTH_TOKEN,
			topicsConfig
		})

		expect(Array.isArray(ServiceSchema.mixins)).toBe(true)
		expect(ServiceSchema.mixins).toHaveLength(3)
	})
})


