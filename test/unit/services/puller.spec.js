'use strict'

const ServiceSchema = require('../../../services/puller.service')
const { NVarChar, BigInt, Int } = require('mssql')

describe('puller service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'puller',
			settings: { db: null, pool: null },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn(), waitForServices: jest.fn() },
			getRecords: jest.fn(),
			deleteAllRecords: jest.fn(),
			applyMessages: jest.fn(),
			createIndexes: function() { return ServiceSchema.methods.createIndexes.call(this) },
			normalize: function(record) { return ServiceSchema.methods.normalize.call(this, record) },
			split: function(arr, size) { return ServiceSchema.methods.split.call(this, arr, size) },
			pullStoredProc: function(pull_procedure, ax_consumer_id, limit) { return ServiceSchema.methods.pullStoredProc.call(this, pull_procedure, ax_consumer_id, limit) },
			sendConfirmation: function(confirm_procedure, EventRecId) { return ServiceSchema.methods.sendConfirmation.call(this, confirm_procedure, EventRecId) }
		}
		jest.clearAllMocks()
	})

	describe('helpers', () => {
		it('normalize lowercases keys, parses numbers except inn/kpp/partynumber, and excludes eventcreateddatetime/eventtypestr', () => {
			const rec = {
				INN: '7701', // stays string
				KPP: '123', // stays string
				PartyNumber: '42', // stays string
				Qty: '2', // becomes number
				Price: '10.5', // becomes float
				EventCreatedDateTime: '2024-01-01', // excluded
				EventTypeStr: 'X' // excluded
			}
			const out = service.normalize(rec)
			expect(out).toEqual({ inn: '7701', kpp: '123', partynumber: '42', qty: 2, price: 10.5 })
		})

		it('split groups array by size', () => {
			const res = service.split([1,2,3,4,5], 2)
			expect(res).toEqual([[1,2],[3,4],[5]])
		})
	})

	describe('mssql integration helpers', () => {
		it('pullStoredProc passes inputs and returns recordset (with limit and without)', async () => {
			const req = {
				input: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ recordset: [{ recid: 1 }] })
			}
			service.settings.pool = { request: jest.fn(() => req) }

			const resWithLimit = await service.pullStoredProc('spPull', 5, 100)
			expect(service.settings.pool.request).toHaveBeenCalledTimes(1)
			expect(req.input).toHaveBeenCalledWith('DAI', NVarChar, 'psv')
			expect(req.input).toHaveBeenCalledWith('DBType', Int, 5)
			expect(req.input).toHaveBeenCalledWith('Limit', Int, 100)
			expect(req.execute).toHaveBeenCalledWith('spPull')
			expect(resWithLimit).toEqual([{ recid: 1 }])

			// reset spy counters
			req.input.mockClear(); req.execute.mockClear(); service.settings.pool.request.mockClear()
			const resNoLimit = await service.pullStoredProc('spPull', 7)
			expect(req.input).toHaveBeenCalledWith('DAI', NVarChar, 'psv')
			expect(req.input).toHaveBeenCalledWith('DBType', Int, 7)
			expect(req.execute).toHaveBeenCalledWith('spPull')
			expect(resNoLimit).toEqual([{ recid: 1 }])
		})

		it('sendConfirmation posts mapping of EventRecId and returns execute result', async () => {
			const req = {
				input: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ rowsAffected: [1] })
			}
			service.settings.pool = { request: jest.fn(() => req) }
			await service.sendConfirmation('spConfirm', '99')
			expect(req.input).toHaveBeenCalledWith('EventRecId', BigInt, 99)
			expect(req.input).toHaveBeenCalledWith('Status', Int, 100)
			expect(req.input).toHaveBeenCalledWith('Description', NVarChar, 'Строка успешно обработана')
			expect(req.execute).toHaveBeenCalledWith('spConfirm')
		})
	})

	describe('action: pullerProcess', () => {
		it('end-to-end: filters, normalizes, builds recids, dedups, groups actions, applies and confirms with channel send when ax_consumer_id=61', async () => {
			// stub MSSQL result
			const records = [
				{ RecId: 'A', Inn: '7701', Qty: '2', Price: '10.5', EventType: 1, EventRecId: '11' }, // delete
				{ RecId: 'A', Inn: '7701', Qty: '3', Price: '11', EventType: 2, EventRecId: '12' }, // will be deduped by recid later
				{ RecId: 'B', Inn: '7702', Qty: '1', Price: '5.5', EventType: 3, EventRecId: '13' } // insert
			]
			service.pullStoredProc = jest.fn(async () => records)
			service.applyMessages = jest.fn(async () => {})
			service.sendConfirmation = jest.fn(async () => {})
			// mock db not used here

			await ServiceSchema.actions.pullerProcess.handler.call(service, {
				params: {
					pull_procedure: 'spPull',
					ax_consumer_id: 61,
					limit: 100,
					table_name: 'testtable',
					filters: { Inn: '7701' }, // filters in original records before normalize
					recid_fields: ['RecId','Inn']
				}
			})

			// ensure MSSQL pull called
			expect(service.pullStoredProc).toHaveBeenCalledWith('spPull', 61, 100)

			// After filtering only 2 records with Inn 7701 remain → normalized recids 'A-7701'
			// dedup by recid should collapse to one record per recid, group by eventtype: record with eventtype 1 → delete; 2 → update
			// Dedup keeps the last record per recid, so only 'update' remains → no delete apply
			expect(service.applyMessages).toHaveBeenCalled()

			// For ax_consumer_id 61: send to channel and confirm for each normalized record (after dedup we send 1)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'testtable-topic',
				expect.objectContaining({ recid: expect.any(String) }),
				expect.objectContaining({ key: expect.any(String) })
			)
			// Confirmation called with env-driven procedure (may be undefined in test) and numeric EventRecId
			expect(service.sendConfirmation).toHaveBeenCalledTimes(2)
			const confirmCalls = service.sendConfirmation.mock.calls
			expect(confirmCalls[0][0]).toBeUndefined()
			expect(confirmCalls[0][1]).toEqual(expect.any(Number))
			expect(confirmCalls[1][0]).toBeUndefined()
			expect(confirmCalls[1][1]).toEqual(expect.any(Number))
		})
	})
})


