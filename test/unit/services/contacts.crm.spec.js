'use strict'

jest.mock('uuid', () => ({ v4: jest.fn() }))
const { v4: uuidv4 } = require('uuid')

const ServiceSchema = require('../../../services/contacts.crm.service')

describe('contacts.crm service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'contacts.crm',
			settings: { rest: '/' },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() }
		}
	})

	describe('action: contacts', () => {
		it('sends one record when body is object and returns OK', async () => {
			uuidv4.mockReset().mockReturnValue('u-1')
			const body = { foo: 'bar' }

			const res = await ServiceSchema.actions.contacts.handler.call(service, {
				action: { name: 'contacts.crm.contacts' },
				params: { body }
			})

			expect(res).toBe('OK')
			expect(service.broker.sendToChannel).toHaveBeenCalledTimes(1)
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'channel.message.api.received',
				{ table_name: 'crm-contacts', record: { ...body, recid: 'u-1' }, action: 'upsert' },
				{ key: 'u-1' }
			)
		})

		it('sends multiple records when body is array', async () => {
			uuidv4.mockReset().mockReturnValueOnce('u-1').mockReturnValueOnce('u-2')
			const body = [ { a: 1 }, { b: 2 } ]

			const res = await ServiceSchema.actions.contacts.handler.call(service, {
				action: { name: 'contacts.crm.contacts' },
				params: { body }
			})

			expect(res).toBe('OK')
			expect(service.broker.sendToChannel).toHaveBeenCalledTimes(2)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				1,
				'channel.message.api.received',
				{ table_name: 'crm-contacts', record: { a: 1, recid: 'u-1' }, action: 'upsert' },
				{ key: 'u-1' }
			)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				2,
				'channel.message.api.received',
				{ table_name: 'crm-contacts', record: { b: 2, recid: 'u-2' }, action: 'upsert' },
				{ key: 'u-2' }
			)
		})
	})
})


