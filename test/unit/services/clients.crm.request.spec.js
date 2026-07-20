'use strict'

process.env.CRM_CLIENTS_REQUESTS_TABLE_NAME = 'cust-table-request-crm'
process.env.CRM_CLIENTS_RESPONSES_TABLE_NAME = 'cust-table-response-crm'

const ServiceSchema = require('../../../services/clients.crm.request.service')

describe('clients.crm.request service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'clients.crm.request',
			settings: {
				requestsTable: process.env.CRM_CLIENTS_REQUESTS_TABLE_NAME,
				responsesTable: process.env.CRM_CLIENTS_RESPONSES_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			updateRecords: jest.fn(),
			requestMapper: function(record) {
				return ServiceSchema.methods.requestMapper.call(this, record)
			},
			generateResponses: function(responses) {
				return ServiceSchema.methods.generateResponses.call(this, responses)
			}
		}
	})

	describe('method: requestMapper', () => {
		it('maps fields correctly from request record', () => {
			const record = {
				inn: '7701234567',
				kpp: '770101001',
				channel: '000000006',
				source: 1,
				account_type: 'ORG'
			}
			const mapped = service.requestMapper(record)
			expect(mapped).toEqual({
				inn: '7701234567',
				kpp: '770101001',
				channelid: '000000006',
				custvendsource: 1,
				custvendtype: 'ORG'
			})
		})
	})

	describe('method: generateResponses', () => {
		it('updates responses table with ready status and attempts reset', async () => {
			const responses = [{recid: '1'}, {recid: '2'}]
			await service.generateResponses(responses)

			expect(service.updateRecords).toHaveBeenCalledTimes(1)
			expect(service.updateRecords).toHaveBeenCalledWith(
				service.settings.responsesTable,
				{ recid: { $in: ['1', '2'] } },
				{
					$set: expect.objectContaining({
						crm_status: 'ready',
						attempts: 0,
						updated_at: expect.any(Date)
					})
				}
			)
		})
	})

	describe('channels', () => {
		it('requests topic forwards to putKeyValue with correct bucket', async () => {
			const topicName = `${process.env.CRM_CLIENTS_REQUESTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '42', foo: 'bar'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.CRM_CLIENTS_REQUESTS_TABLE_NAME}`,
					key: '42',
					value: record
				}
			)
		})

		it('responses topic forwards to putKeyValue with correct bucket', async () => {
			const topicName = `${process.env.CRM_CLIENTS_RESPONSES_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '7', baz: 'qux'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.CRM_CLIENTS_RESPONSES_TABLE_NAME}`,
					key: '7',
					value: record
				}
			)
		})
	})
})


