'use strict'

const Mixin = require('../../../mixins/clients.mixin')

describe('clients.mixin (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'clients.mixin',
			settings: {
				requestsTable: 'cust-table-request-crm',
				responsesTable: 'cust-table-response-crm',
				redisStateRecordsCount: '100'
			},
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			applyMessages: jest.fn(),
			getRecords: jest.fn(),
			updateRecords: jest.fn(),
			generateResponses: jest.fn(),
			requestMapper: jest.fn(),
			createCustomer: jest.fn()
		}
		jest.clearAllMocks()
	})

	describe('action: stateProcess', () => {
		it('calls applyMessages with table_name, records, action', async () => {
			await Mixin.actions.stateProcess.call(service, {
				action: { name: 'clients.mixin.stateProcess' },
				params: { table_name: 'T', records: [{ recid: 1 }], action: 'insert' }
			})
			expect(service.applyMessages).toHaveBeenCalledWith('T', [{ recid: 1 }], 'insert')
		})
	})

	describe('action: processRequest', () => {
		it('updates pending requests, sends cached responses, and creates missing customers', async () => {
			const requests = [
				{ inn: '7701', kpp: 'A', channel: '000000006', source: 1, account_type: 'ORG' },
				{ inn: '7702', kpp: 'B', channel: '000000006', source: 1, account_type: 'ORG' }
			]
			// getRecords returns a client only for (7701,A)
			const foundClients = [
				{ inn: '7701', kpp: 'A', recid: '7701:A', foo: 1 }
			]
			service.getRecords.mockResolvedValueOnce(foundClients)
			service.requestMapper.mockImplementation((req) => ({
				inn: req.inn, kpp: req.kpp, channelid: req.channel, custvendsource: req.source, custvendtype: req.account_type
			}))

			await Mixin.actions.processRequest.call(service, {
				action: { name: 'clients.mixin.processRequest' },
				params: { requests }
			})

			// applyMessages called to set pending on requests
			expect(service.applyMessages).toHaveBeenCalledWith(
				'cust-table-request-crm',
				expect.arrayContaining([
					expect.objectContaining({ recid: '7701:A', status: 'pending', response: null }),
					expect.objectContaining({ recid: '7702:B', status: 'pending', response: null })
				]),
				'update'
			)

			// updateRecords marks cached for found clients
			expect(service.updateRecords).toHaveBeenCalledWith(
				'cust-table-request-crm',
				{ recid: { $in: ['7701:A'] } },
				expect.objectContaining({ $set: expect.objectContaining({ status: 'sent_cached' }) })
			)
			// generateResponses called with clients
			expect(service.generateResponses).toHaveBeenCalledWith(foundClients)

			// createCustomer called for missing (7702,B) with mapped args
			expect(service.createCustomer).toHaveBeenCalledWith('7702', 'B', '000000006', 1, 'ORG')
		})
	})

	describe('action: processResponse', () => {
		it('updates matched pending requests to sent_response and generates responses grouped by inn:kpp', async () => {
			const responses = [
				{ inn: '7701', kpp: 'A', recid: '7701:A', data: 1 },
				{ inn: '7701', kpp: 'A', recid: '7701:A', data: 2 },
				{ inn: '7702', kpp: 'B', recid: '7702:B', data: 3 }
			]
			// getRecords returns pending requests; only the ones with status pending
			service.getRecords.mockResolvedValueOnce([
				{ inn: '7701', kpp: 'A' },
				{ inn: '7702', kpp: 'B' }
			])

			await Mixin.actions.processResponse.call(service, {
				action: { name: 'clients.mixin.processResponse' },
				params: { responses }
			})

			// update pending to sent_response
			expect(service.updateRecords).toHaveBeenCalledWith(
				'cust-table-request-crm',
				{ recid: { $in: ['7701:A','7702:B'] } },
				{ $set: { status: 'sent_response', updated_at: expect.any(Date) } }
			)
			// generateResponses called twice: once for each inn:kpp group
			expect(service.generateResponses).toHaveBeenCalledTimes(2)
			// group (7701:A)
			const firstCall = service.generateResponses.mock.calls[0][0]
			expect(firstCall.every(r => r.inn === '7701' && r.kpp === 'A')).toBe(true)
			// group (7702:B)
			const secondCall = service.generateResponses.mock.calls[1][0]
			expect(secondCall.every(r => r.inn === '7702' && r.kpp === 'B')).toBe(true)
		})
	})
})


