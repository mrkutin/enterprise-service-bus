'use strict'

const ServiceSchema = require('../../../services/api.service')

describe('api service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'api',
			settings: { API_TOKENS: {}, db: null },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			// Stubs for methods used internally
			getRecords: jest.fn(),
			applyMessages: jest.fn(),
			applyProductsPriceMessages: jest.fn()
		}
	})

	describe('action: ping', () => {
		it('returns OK', async () => {
			const res = await ServiceSchema.actions.ping.handler.call(service)
			expect(res).toBe('OK')
		})
	})

	describe('action: stateProcess', () => {
		it('calls applyMessages for allowed table and sends to topic', async () => {
			const ctx = {
				action: { name: 'api.stateProcess' },
				params: {
					table_name: 'crm-jobs',
					records: [
						{ recid: 10, kafkakey: undefined, a: 1 },
						{ recid: 20, kafkakey: 'K-20', b: 2 }
					],
					action: 'insert'
				}
			}

			await ServiceSchema.actions.stateProcess.handler.call(service, ctx)

			// applyMessages called with recid normalized to kafkakey || recid
			expect(service.applyMessages).toHaveBeenCalledTimes(1)
			expect(service.applyMessages).toHaveBeenCalledWith('crm-jobs', [
				{ recid: 10, a: 1 },
				{ recid: 'K-20', b: 2 }
			], 'insert')

			// Both records forwarded to table topic with original body (without kafkakey) and correct key
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'crm-jobs-topic',
				{ a: 1, recid: 10 },
				{ key: '10' }
			)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'crm-jobs-topic',
				{ b: 2, recid: 20 },
				{ key: 'K-20' }
			)
		})

		it('routes one-c-products-price-table to applyProductsPriceMessages', async () => {
			const ctx = {
				action: { name: 'api.stateProcess' },
				params: {
					table_name: 'one-c-products-price-table',
					records: [ { recid: 1, price: 100 } ],
					action: 'upsert'
				}
			}

			await ServiceSchema.actions.stateProcess.handler.call(service, ctx)

			expect(service.applyProductsPriceMessages).toHaveBeenCalledTimes(1)
			expect(service.applyProductsPriceMessages).toHaveBeenCalledWith('one-c-products-price-table', [ { recid: 1, price: 100 } ], 'upsert')
		})
	})

	describe('action: applyJSONtoKafka', () => {
		it('sends to channel.message.api.received when recid present (base64)', async () => {
			const payload = { recid: 123, foo: 'bar' }
			const table_name = 'crm-contacts'
			const body = { messages: Buffer.from(JSON.stringify(payload)).toString('base64') }
			const ctx = { action: { name: 'api.applyJSONtoKafka' }, params: { params: { table_name }, body } }

			await ServiceSchema.actions.applyJSONtoKafka.handler.call(service, ctx)

			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'channel.message.api.received',
				{ table_name, record: payload, action: 'insert' },
				{ key: '123' }
			)
		})
	})

	describe('action: get', () => {
		it('builds filter, pagination and projection correctly', async () => {
			const table_name = 'crm-jobs'
			// Mock getRecords: first call (count) then data
			service.getRecords
				.mockResolvedValueOnce([{ count: 15 }])
				.mockResolvedValueOnce([{ recid: 1 }, { recid: 2 }])

			const ctx = {
				action: { name: 'api.get' },
				params: {
					params: { table_name },
					query: {
						page: '1',
						perPage: '2',
						fields: 'recid,foo',
						_id: '64b6f5b1d5f1a2b3c4d5e6f7,64b6f5b1d5f1a2b3c4d5e6f8',
						status: 'A,B'
					}
				}
			}

			const res = await ServiceSchema.actions.get.handler.call(service, ctx)

			// Validate return value
			expect(res).toEqual({ total: 15, pages: 8, data: [{ recid: 1 }, { recid: 2 }] })

			// Validate pipelines passed to getRecords
			const firstCall = service.getRecords.mock.calls[0]
			const secondCall = service.getRecords.mock.calls[1]
			expect(firstCall[0]).toBe('crm-jobs')
			expect(secondCall[0]).toBe('crm-jobs')

			const firstMatch = firstCall[1][0].$match
			expect(firstMatch).toHaveProperty('to_be_deleted')
			expect(firstMatch).toHaveProperty('status')
			expect(firstMatch.status.$in).toEqual(['A', 'B'])
			expect(firstMatch).toHaveProperty('_id')
			expect(Array.isArray(firstMatch._id.$in)).toBe(true)
			expect(firstCall[1][1]).toEqual({ $count: 'count' })

			// Data pipeline: has $project with fields and skip/limit
			const dataPipeline = secondCall[1]
			expect(dataPipeline[0]).toHaveProperty('$match')
			expect(dataPipeline[1]).toHaveProperty('$project')
			expect(dataPipeline[1].$project).toEqual({ recid: 1, foo: 1 })
			expect(dataPipeline[2]).toEqual({ $skip: 2 })
			expect(dataPipeline[3]).toEqual({ $limit: 2 })
		})
	})

	describe('channel: channel.message.api.received', () => {
		it('puts key/value with recid', async () => {
			const handler = ServiceSchema.channels['channel.message.api.received'].handler
			await handler.call(service, {
				channelName: 'channel.message.api.received',
				params: { table_name: 'crm-jobs', action: 'insert', record: { recid: '42', foo: 'bar' } }
			})

			expect(service.broker.call).toHaveBeenCalledWith(
				'api.putKeyValue',
				{
					bucket: 'api:crm-jobs:insert',
					key: '42',
					value: { recid: '42', foo: 'bar' }
				}
			)
		})

		it('falls back to kafkakey when recid is missing', async () => {
			const handler = ServiceSchema.channels['channel.message.api.received'].handler
			await handler.call(service, {
				channelName: 'channel.message.api.received',
				params: { table_name: 'crm-contacts', action: 'delete', record: { kafkakey: 'K-1', foo: 'x' } }
			})

			expect(service.broker.call).toHaveBeenCalledWith(
				'api.putKeyValue',
				{
					bucket: 'api:crm-contacts:delete',
					key: 'K-1',
					value: { kafkakey: 'K-1', foo: 'x' }
				}
			)
		})
	})
})


