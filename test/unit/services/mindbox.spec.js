'use strict'

jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }))
const axios = require('axios')

process.env.MINDBOX_HOST = 'https://mindbox.local'
process.env.MINDBOX_SEND_ENDPOINT = '/send'
process.env.MINDBOX_ENDPOINT_ID = 'ep-1'
process.env.MINDBOX_SECRET_KEY = 'secret'
process.env.MINDBOX_REFERRAL_ATTEMPTS_COUNT = '3'

// Mock topics config used by service
jest.mock('../../../configs/mindbox.topics.config', () => ({
	'test-topic-with-mapping-topic': {
		tableName: 'mapped-table',
		mapping: (msg) => ({ mapped: true, sum: msg.a + msg.b }),
		sendingOperation: 'OpX',
		isDeviceUUIDRequired: false,
		sendMode: 'sync'
	}
}), { virtual: true })

const topicsConfig = require('../../../configs/mindbox.topics.config')
const ServiceSchema = require('../../../services/mindbox.service')
const { MoleculerServerError } = require('moleculer').Errors

describe('mindbox service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'mindbox',
			settings: { topicsConfig },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn(), emit: jest.fn() },
			applyMessages: jest.fn(),
			updateRecords: jest.fn(),
			mindboxProccess: jest.fn(),
			mindboxUpload: function(topic, message, key, op, needDev, deviceUUID, mode) {
				return ServiceSchema.methods.mindboxUpload.call(this, topic, message, key, op, needDev, deviceUUID, mode)
			},
			consumerRetryHandler: jest.fn(),
			consumerPause: jest.fn()
		}
		jest.clearAllMocks()
	})

	describe('method: consumerProcess (mapping branch)', () => {
		it('applies base and mapped messages then calls mindboxProccess', async () => {
			const topic = 'test-topic-with-mapping-topic'
			const key = 'K-1'
			const body = { a: 2, b: 3, deviceUUID: 'dev-1' }
			const message = { key: Buffer.from(key), value: Buffer.from(JSON.stringify(body)) }

			await ServiceSchema.methods.consumerProcess.call(service, topic, message)

			// Base apply (topic split before -topic)
			expect(service.applyMessages).toHaveBeenCalledWith('test', [{ a: 2, b: 3, recid: key, deviceUUID: 'dev-1' }], 'insert')
			// Mapped apply
			expect(service.applyMessages).toHaveBeenCalledWith('mapped-table', [{ mapped: true, sum: 5, recid: key }], 'insert')
			// Upload
			expect(service.mindboxProccess).toHaveBeenCalledWith(topic, key, { mapped: true, sum: 5 }, 'dev-1')
		})
	})

	describe('method: mindboxUpload', () => {
		it('posts to Mindbox, updates records and returns data', async () => {
			axios.post.mockResolvedValueOnce({ data: { ok: 1 } })
			const res = await service.mindboxUpload('abc-topic', { x: 1 }, 'K', 'Operate', false, undefined, 'sync')
			// axios called with composed URL and headers
			expect(axios.post).toHaveBeenCalledWith(
				expect.stringContaining('https://mindbox.local'),
				{ x: 1 },
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: 'Mindbox secretKey="secret"' })
				})
			)
			// updates status
			expect(service.updateRecords).toHaveBeenCalledWith(
				'abc-topic'.split('-topic')[0],
				{ recid: 'K' },
				expect.objectContaining({ $set: expect.objectContaining({ mindbox_status: 'success', attempts: 1 }) })
			)
			expect(res).toEqual({ ok: 1 })
		})

		it('throws MoleculerServerError on axios error', async () => {
			const err = new Error('boom')
			err.response = { status: 502, data: { errorMessage: 'Bad gateway' } }
			err.stack = 'stack'
			axios.post.mockRejectedValueOnce(err)
			await expect(service.mindboxUpload('abc-topic', {}, 'K', 'Op', false, undefined, 'sync'))
				.rejects.toBeInstanceOf(MoleculerServerError)
		})
	})

	describe('helpers', () => {
		it('parseAndExtractTSV parses valid rows', () => {
			const tsv =
				`ym:pv:parsedParamsKey2\tym:pv:parsedParamsKey3\n` +
				`["referralCustomerCode","websiteID","productinregister","pointOfContact"]\t["RC1","W1","P1","PC1"]\n` +
				`[]\t[]\n`
			const out = ServiceSchema.methods.parseAndExtractTSV(tsv)
			expect(out).toEqual([{ referralCustomerCode: 'RC1', websiteID: 'W1', productinregister: 'P1', pointOfContact: 'PC1' }])
		})

		it('getUniqueRecords removes duplicates', () => {
			const arr = [{ a: 1 }, { a: 1 }, { a: 2 }]
			const unique = ServiceSchema.methods.getUniqueRecords(arr)
			expect(unique).toEqual([{ a: 1 }, { a: 2 }])
		})
	})
})


