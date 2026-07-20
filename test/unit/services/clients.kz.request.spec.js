'use strict'

process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME = 'cust-table-request-kz'
process.env.KZ_CLIENTS_RESPONSES_TABLE_NAME = 'cust-table-response-kz'

const ServiceSchema = require('../../../services/clients.kz.request.service')

describe('clients.kz.request service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'clients.kz.request',
			settings: {
				requestsTable: process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME,
				responsesTable: process.env.KZ_CLIENTS_RESPONSES_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			requestMapper: function(record) {
				return ServiceSchema.methods.requestMapper.call(this, record)
			},
			generateResponses: function(responses) {
				return ServiceSchema.methods.generateResponses.call(this, responses)
			}
		}
	})

	describe('method: requestMapper', () => {
		it('returns identity mapping (same object)', () => {
			const record = {inn: '7701234567', kpp: '770101001', channel: '000000006', source: 1, account_type: 'ORG'}
			const mapped = service.requestMapper(record)
			expect(mapped).toBe(record)
		})
	})

	describe('method: generateResponses', () => {
		it('sends each response to responses topic with recid as key', async () => {
			const responses = [{recid: '1', ok: true}, {recid: '2', ok: false}]
			await service.generateResponses(responses)

			expect(service.broker.sendToChannel).toHaveBeenCalledTimes(2)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				`${service.settings.responsesTable}-topic`,
				{recid: '1', ok: true},
				{key: '1'}
			)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				`${service.settings.responsesTable}-topic`,
				{recid: '2', ok: false},
				{key: '2'}
			)
		})
	})

	describe('channels', () => {
		it('requests topic forwards to putKeyValue with recid when present', async () => {
			const topicName = `${process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '42', foo: 'bar'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME}`,
					key: '42',
					value: record
				}
			)
		})

		it('requests topic falls back to raw.key when recid missing', async () => {
			const topicName = `${process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {foo: 'x'}
			const raw = {key: Buffer.from('K-99')}
			await handler.call(service, {channelName: topicName, params: record}, raw)

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.KZ_CLIENTS_REQUESTS_TABLE_NAME}`,
					key: 'K-99',
					value: record
				}
			)
		})

		it('responses-generated topic forwards to putKeyValue bucket with recid key', async () => {
			const topicName = `${process.env.KZ_CLIENTS_RESPONSES_TABLE_NAME}-generated-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '7', baz: 'qux'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.KZ_CLIENTS_RESPONSES_TABLE_NAME}`,
					key: '7',
					value: record
				}
			)
		})
	})
})


