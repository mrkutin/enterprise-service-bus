'use strict'

process.env.NAMESPACE = 'test'
process.env.ONE_C_ERPUH_KZ_CLIENTS_HOST = 'https://one-c-kz.local'
process.env.ONE_C_ERPUH_KZ_CLIENTS_SEND_ENDPOINT = '/send'
process.env.ONE_C_ERPUH_KZ_CLIENTS_AUTH_TOKEN = 'kz-token-123'

// Mock topics config for selected namespace
jest.mock('../../../configs/one-c/test/one-c.erpuh.kz.clients.topics.config', () => ({ topic1: {}, topic2: {} }), { virtual: true })

const ServiceSchema = require('../../../services/one-c.erpuh.kz.clients.service')
const topicsConfig = require('../../../configs/one-c/test/one-c.erpuh.kz.clients.topics.config')

describe('one-c.erpuh.kz.clients service (unit)', () => {
	it('exports correct name, settings (from env), topicsConfig and mixins', () => {
		expect(ServiceSchema.name).toBe('one-c.erpuh.kz.clients')

		expect(ServiceSchema.settings).toEqual({
			kafkaGroupId: 'bus-one-c-erpuh-kz-clients-groupid',
			sendHost: process.env.ONE_C_ERPUH_KZ_CLIENTS_HOST,
			sendEndpoint: process.env.ONE_C_ERPUH_KZ_CLIENTS_SEND_ENDPOINT,
			sendToken: process.env.ONE_C_ERPUH_KZ_CLIENTS_AUTH_TOKEN,
			topicsConfig
		})

		expect(Array.isArray(ServiceSchema.mixins)).toBe(true)
		expect(ServiceSchema.mixins).toHaveLength(3)
	})
})


