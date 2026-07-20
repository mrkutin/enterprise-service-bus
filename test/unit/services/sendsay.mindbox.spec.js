'use strict'

jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }))
const axios = require('axios')

process.env.MINDBOX_HOST = 'https://mindbox.local'
process.env.MINDBOX_SEND_ENDPOINT = '/send'
process.env.MINDBOX_ENDPOINT_ID = 'ep-1'
process.env.MINDBOX_SECRET_KEY = 'secret'
process.env.SENDSAY_HOST = 'https://sendsay.local'
process.env.SENDSAY_API_KEY = 'sendsay-key'
process.env.SENDSAY_ACCOUNT = 'acc-1'

// Mock topics config used by sendsay.mindbox service
jest.mock('../../../configs/mindbox.sendsay.topics.config', () => ({
	'mindbox-client-email-unsubscribed-topic': {
		mindboxOperation: 'ExportUnsubscribed',
		sendsayAction: 'unsubscribe',
		sendsayCreateList: (emails) => ({ maillist: emails }),
		sendsayAdditionalBodyParams: { async: true }
	},
	'mindbox-client-email-contacted-24h-topic': {
		mindboxOperation: 'ExportContacted24h',
		sendsayAction: 'import',
		sendsayCreateList: (emails) => ({ emails }),
		sendsayAdditionalBodyParams: { deduplicate: true }
	}
}), { virtual: true })

const topicsConfig = require('../../../configs/mindbox.sendsay.topics.config')
const ServiceSchema = require('../../../services/sendsay.mindbox.service')
const { MoleculerServerError } = require('moleculer').Errors

describe('sendsay.mindbox service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'sendsay.mindbox',
			settings: { topicsConfig },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn(), emit: jest.fn(), stopping: false, waitForServices: jest.fn() },
			getRecords: jest.fn(),
			updateRecords: jest.fn(),
			deleteRecordByRecid: jest.fn(),
			mongoDisconnect: jest.fn()
		}

		Object.assign(service, ServiceSchema.methods)

		jest.clearAllMocks()
	})

	describe('channel handlers', () => {
		it('stores message in bucket with recid from key', async () => {
			const ctx = {
				channelName: 'mindbox-client-email-unsubscribed-topic',
				params: { emails: ['a@b.com'] }
			}
			const raw = { key: Buffer.from('123') }

			await ServiceSchema.channels['mindbox-client-email-unsubscribed-topic'].handler.call(service, ctx, raw)

			expect(service.broker.call).toHaveBeenCalledWith(
				'sendsay.mindbox.putKeyValue',
				{
					bucket: 'sendsay.mindbox:mindbox-client-email-unsubscribed:insert',
					key: '123',
					value: { emails: ['a@b.com'], recid: 123 }
				}
			)
		})
	})

	describe('method: sendsayUpload', () => {
		it('posts to Sendsay with correct URL and body', async () => {
			axios.post.mockReset().mockResolvedValueOnce({ status: 200 })
			const topic = 'mindbox-client-email-unsubscribed-topic'
			const emails = ['x@y.com']

			const result = await service.sendsayUpload(topic, emails)

			expect(result).toBe(true)
			expect(axios.post).toHaveBeenCalledWith(
				`${process.env.SENDSAY_HOST}/general/api/v100/json/${process.env.SENDSAY_ACCOUNT}`,
				{
					apikey: process.env.SENDSAY_API_KEY,
					action: topicsConfig[topic].sendsayAction,
					...topicsConfig[topic].sendsayCreateList(emails),
					...topicsConfig[topic].sendsayAdditionalBodyParams
				},
				{ headers: { 'Content-Type': 'application/json' } }
			)
		})

		it('returns false on axios error', async () => {
			const err = new Error('boom'); err.stack = 'stack'
			axios.post.mockReset().mockRejectedValueOnce(err)
			const result = await service.sendsayUpload('mindbox-client-email-unsubscribed-topic', ['a@b.com'])
			expect(result).toBe(false)
		})
	})

	describe('method: sendsayLoop', () => {
		it('processes pending records and deletes on successful upload', async () => {
			const record = {
				recid: 1001,
				emails: ['test@example.com'],
				sendsay_status: null,
				attempts: 0,
				updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
			}
			service.getRecords.mockResolvedValue([record])
			service.sendsayUpload = jest.fn().mockResolvedValue(true)

			await service.sendsayLoop()

			const topicName = 'mindbox-client-email-unsubscribed-topic'
			const tableName = 'mindbox-client-email-unsubscribed'

			expect(service.updateRecords).toHaveBeenCalledWith(
				tableName,
				{ recid: 1001 },
				{ $inc: { attempts: 1 }, $set: { sendsay_status: 'pending', updated_at: expect.any(Date) } }
			)
			expect(service.sendsayUpload).toHaveBeenCalledWith(topicName, ['test@example.com'])
			expect(service.deleteRecordByRecid).toHaveBeenCalledWith(tableName, 1001)
		})

		it('does not delete record if upload fails', async () => {
			const record = {
				recid: 1002,
				emails: ['fail@example.com'],
				sendsay_status: 'pending',
				attempts: 5,
				updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
			}
			service.getRecords.mockResolvedValue([record])
			service.sendsayUpload = jest.fn().mockResolvedValue(false)

			await service.sendsayLoop()

			expect(service.deleteRecordByRecid).not.toHaveBeenCalled()
		})
	})

	describe('action: processMindboxRequests', () => {
		it('with exportId Ready: triggers processMindboxUrls', async () => {
			const topicName = 'mindbox-client-email-unsubscribed-topic'
			axios.post.mockReset().mockResolvedValueOnce({
				data: {
					exportResult: {
						processingStatus: 'Ready',
						urls: ['https://u1','https://u2']
					}
				}
			})

			await ServiceSchema.actions.processMindboxRequests.handler.call(service, {
				action: { name: 'sendsay.mindbox.processMindboxRequests' },
				params: { exportId: 'E1', topicName }
			})

			expect(axios.post).toHaveBeenCalledTimes(1)
			expect(service.broker.call).toHaveBeenCalledWith(
				'sendsay.mindbox.processMindboxUrls',
				{ urls: ['https://u1','https://u2'], topicName }
			)
		})
	})

	describe('action: processMindboxUrls', () => {
		it('fetches urls, collects unique emails and sends to channel', async () => {
			const topicName = 'mindbox-client-email-unsubscribed-topic'
			axios.get
				.mockResolvedValueOnce({ data: { customers: [{ email: 'a@b.com' }, { email: 'c@d.com' }] } })
				.mockResolvedValueOnce({ data: { customers: [{ email: 'a@b.com' }, { email: null }] } })

			await ServiceSchema.actions.processMindboxUrls.handler.call(service, {
				action: { name: 'sendsay.mindbox.processMindboxUrls' },
				params: { urls: ['u1','u2'], topicName }
			})

			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				topicName,
				{ emails: ['a@b.com','c@d.com'] },
				expect.objectContaining({ key: expect.any(String) })
			)
		})
	})
})


