'use strict'

jest.mock('crypto', () => {
	const digestQueue = []
	const createHash = jest.fn(() => {
		return {
			update: jest.fn().mockReturnThis(),
			digest: jest.fn(() => (digestQueue.length ? digestQueue.shift() : 'hash-default'))
		}
	})
	return { createHash, __setDigests: (arr) => { digestQueue.splice(0, digestQueue.length, ...arr) } }
})

const crypto = require('crypto')
const ServiceSchema = require('../../../services/leads.crm.service')

describe('leads.crm service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'leads.crm',
			settings: { rest: '/' },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() }
		}
	})

	describe('action: leads', () => {
		it('sends one record when body is object and returns OK', async () => {
			crypto.__setDigests(['h-1'])
			const body = { Account: 'ACC1', foo: 'bar' }

			const res = await ServiceSchema.actions.leads.handler.call(service, {
				action: { name: 'leads.crm.leads' },
				params: { body }
			})

			expect(res).toBe('OK')
			expect(service.broker.sendToChannel).toHaveBeenCalledTimes(1)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'channel.message.api.received',
				{ table_name: 'crm-leads', record: { Account: 'ACC1', foo: 'bar', recid: 'h-1' }, action: 'upsert' },
				{ key: 'h-1' }
			)
		})

		it('sends multiple records when body is array', async () => {
			crypto.__setDigests(['h-1','h-2'])
			const body = [ { Account: 'A1', a: 1 }, { Account: 'A2', b: 2 } ]

			const res = await ServiceSchema.actions.leads.handler.call(service, {
				action: { name: 'leads.crm.leads' },
				params: { body }
			})

			expect(res).toBe('OK')
			expect(service.broker.sendToChannel).toHaveBeenCalledTimes(2)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				1,
				'channel.message.api.received',
				{ table_name: 'crm-leads', record: { Account: 'A1', a: 1, recid: 'h-1' }, action: 'upsert' },
				{ key: 'h-1' }
			)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				2,
				'channel.message.api.received',
				{ table_name: 'crm-leads', record: { Account: 'A2', b: 2, recid: 'h-2' }, action: 'upsert' },
				{ key: 'h-2' }
			)
		})
	})
})


