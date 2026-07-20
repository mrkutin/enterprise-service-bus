'use strict'

const ServiceSchema = require('../../../services/one-c-incoming.orders.transformer.service')

describe('one-c-incoming.orders.transformer service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'one-c-incoming.orders.transformer',
			settings: { db: null, recidsToTransformReadCount: '100' },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			getRecords: jest.fn(),
			aggregate: function(table_name, recids) { return ServiceSchema.methods.aggregate.call(this, table_name, recids) }
		}
		jest.clearAllMocks()
	})

	describe('method: aggregate', () => {
		it('returns recids as-is when table is one-c-customers-order', async () => {
			const recids = ['X1','X2']
			const out = await service.aggregate('one-c-customers-order', recids)
			expect(out).toEqual(['X1','X2'])
			expect(service.getRecords).not.toHaveBeenCalled()
		})

		it('builds pipeline and flattens recids for dirpartytable', async () => {
			const recids = ['10']
			let capturedPipeline
			service.getRecords.mockImplementationOnce(async (table, pipeline) => {
				capturedPipeline = pipeline
				// Shape returned by aggregation: keys with arrays of objects having recid
				return [{
					'account-one-c-customers-order': [{ recid: 'A1' }],
					'consignee-one-c-customers-order': [{ recid: 'B1' }]
				}]
			})
			const out = await service.aggregate('dirpartytable', recids)
			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: recids } } })
			expect(out).toEqual(['A1','B1'])
		})

		it('builds pipeline and returns recids for extcode', async () => {
			const recids = ['20']
			let capturedPipeline
			service.getRecords.mockImplementationOnce(async (t, p) => {
				capturedPipeline = p
				// Emulate lookup result: field is an array of docs
				return [{ 'one-c-customers-order': [{ recid: 'E1' }] }]
			})
			const out = await service.aggregate('extcode', recids)
			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: recids } } })
			expect(out).toEqual(['E1'])
		})
	})

	describe('action: process', () => {
		it('sends transformed recids to channel when aggregate returns ids', async () => {
			service.aggregate = jest.fn().mockResolvedValue(['R1','R2'])
			await ServiceSchema.actions.process.call(service, {
				action: { name: 'one-c-incoming.orders.transformer.process' },
				params: { table_name: 'dirpartytable', recids: ['x'] }
			})
			expect(service.aggregate).toHaveBeenCalledWith('dirpartytable', ['x'])
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				1,
				'channel.one-c-incoming.orders.recid.transformed',
				{ recid: 'R1' },
				{ key: 'R1' }
			)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				2,
				'channel.one-c-incoming.orders.recid.transformed',
				{ recid: 'R2' },
				{ key: 'R2' }
			)
		})

		it('logs when no recids found', async () => {
			service.aggregate = jest.fn().mockResolvedValue([])
			await ServiceSchema.actions.process.call(service, {
				action: { name: 'one-c-incoming.orders.transformer.process' },
				params: { table_name: 'dirpartytable', recids: [] }
			})
			expect(service.logger.info).toHaveBeenCalledWith('dirpartytable recids not found!')
			expect(service.broker.sendToChannel).not.toHaveBeenCalled()
		})
	})

	describe('channels', () => {
		it('dirpartytable-topic puts recid into bucket', async () => {
			const handler = ServiceSchema.channels['dirpartytable-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'dirpartytable-topic', params: { recid: 'D1' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}:dirpartytable`, key: 'D1' }
			)
		})
		it('one-c-customers-order-topic puts recid into bucket', async () => {
			const handler = ServiceSchema.channels['one-c-customers-order-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'one-c-customers-order-topic', params: { recid: 'O1' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}:one-c-customers-order`, key: 'O1' }
			)
		})
		it('extcode-topic puts recid into bucket', async () => {
			const handler = ServiceSchema.channels['extcode-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'extcode-topic', params: { recid: 'E1' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}:extcode`, key: 'E1' }
			)
		})
	})
})


