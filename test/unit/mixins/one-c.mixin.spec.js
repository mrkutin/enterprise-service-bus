'use strict'

jest.mock('axios', () => ({
	post: jest.fn()
}))

describe('one-c.mixin (unit)', () => {
	const axios = require('axios')
	const { Errors } = require('moleculer')
	const Mixin = require('../../../mixins/one-c.mixin')

	let service

	beforeEach(() => {
		service = {
			name: 'one-c.service',
			settings: {
				sendHost: 'https://api.example.com',
				sendEndpoint: '/v1/send',
				sendToken: 'token-123',
				topicsConfig: {
					'orders-topic': { headersTopicName: 'hdr-orders' }
				}
			},
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { call: jest.fn() },
			consumerProcess: function(topic, message) { return Mixin.methods.consumerProcess.call(this, topic, message) },
			oneCUpload: function(topic, record) { return Mixin.methods.oneCUpload.call(this, topic, record) }
		}
		jest.clearAllMocks()
	})

	describe('methods: consumerProcess', () => {
		it('stores key/value and invokes oneCUpload with derived topic', async () => {
			const key = Buffer.from('k-1')
			const valueObj = { foo: 'bar' }
			const message = { key, value: Buffer.from(JSON.stringify(valueObj)) }
			const uploadSpy = jest.spyOn(service, 'oneCUpload').mockResolvedValue()

			await service.consumerProcess('orders-topic', message)

			expect(service.broker.call).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:orders:upsert`,
					key: 'k-1',
					value: { ...valueObj, recid: 'k-1' }
				}
			)
			expect(uploadSpy).toHaveBeenCalledWith('hdr-orders', { ...valueObj, recid: 'k-1' })
			expect(service.logger.info).toHaveBeenCalled()
		})
	})

	describe('methods: oneCUpload', () => {
		it('posts to 1C with proper URL and headers (success path)', async () => {
			axios.post.mockResolvedValue({ status: 200 })
			const topic = 'hdr-orders'
			const record = { recid: 'abc', x: 1 }

			await service.oneCUpload(topic, record)

			expect(axios.post).toHaveBeenCalledWith(
				'https://api.example.com/v1/send',
				record,
				{
					timeout: 20000,
					withCredentials: true,
					headers: {
						topic,
						keyMessage: 'abc',
						Authorization: `Basic ${service.settings.sendToken}`
					}
				}
			)
			expect(service.logger.info).toHaveBeenCalled()
		})

		it('logs error and throws MoleculerServerError on failure', async () => {
			const err = new Error('network')
			// emulate axios error shape
			err.response = { data: { errorMessage: 'bad' } }
			axios.post.mockRejectedValue(err)
			const topic = 'hdr-orders'
			const record = { recid: 'abc', x: 1 }

			await expect(service.oneCUpload(topic, record)).rejects.toBeInstanceOf(Errors.MoleculerServerError)
			expect(service.logger.error).toHaveBeenCalled()
		})
	})
})


