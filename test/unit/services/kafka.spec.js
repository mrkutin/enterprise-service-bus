'use strict'

process.env.CRM_AGREEMENTS_TABLE_NAME = 'crm-agreements'

const ServiceSchema = require('../../../services/kafka.service')

describe('kafka service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'kafka',
			settings: { db: null },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			getRecords: jest.fn(),
			applyMessages: jest.fn(),
			applyBiPaymentOrders: function(table_name, records, action) {
				return ServiceSchema.methods.applyBiPaymentOrders.call(this, table_name, records, action)
			}
		}
	})

	describe('method: applyBiPaymentOrders', () => {
		it('filters by agreements and bulk upserts matched records', async () => {
			const table_name = 'bi-payment-orders'
			const records = [
				{ recid: '1', agreement_number: 'A-1', amount: 10 },
				{ recid: '2', agreement_number: 'A-2', amount: 20 }
			]

			// Mock getRecords to return crm agreements for A-1 only, mapping back to original record
			service.getRecords = jest.fn(async () => ([{ code: 'A-1' }]))

			let createdIndexOn
			let capturedOps
			service.settings.db = {
				collection: (name) => ({
					createIndex: jest.fn((index) => { createdIndexOn = name }),
					bulkWrite: jest.fn(async (ops) => { capturedOps = ops })
				})
			}

			await ServiceSchema.methods.applyBiPaymentOrders.call(service, table_name, records, 'insert')

			// Ensures index created on target table
			expect(createdIndexOn).toBe(table_name)
			// Only one record (A-1) should be upserted
			expect(Array.isArray(capturedOps)).toBe(true)
			expect(capturedOps).toHaveLength(1)
			const op = capturedOps[0].updateOne
			expect(op.filter).toEqual({ recid: '1' })
			expect(op.upsert).toBe(true)
			expect(op.update.$set).toEqual(expect.objectContaining({
				attempts: 0,
				crm_status: 'ready',
				updated_at: expect.any(Date)
			}))
			expect(op.update.$setOnInsert).toEqual(expect.objectContaining({ created_at: expect.any(Date) }))
		})
	})

	describe('action: stateProcess', () => {
		it('routes to applyBiPaymentOrders for bi-payment-orders and publishes', async () => {
			const table_name = 'bi-payment-orders'
			const records = [{ recid: '10' }, { recid: '20' }]
			// Spy on real method call
			const spyApply = jest.spyOn(service, 'applyBiPaymentOrders').mockResolvedValue()

			await ServiceSchema.actions.stateProcess.call(service, {
				action: { name: 'kafka.stateProcess' },
				params: { table_name, records, action: 'upsert' }
			})

			expect(spyApply).toHaveBeenCalledWith(table_name, records, 'upsert')
			expect(service.applyMessages).not.toHaveBeenCalled()
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				1,
				'channel.message.kafka.applied',
				{ table_name, record: { recid: '10' }, action: 'upsert' },
				{ key: '10' }
			)
			expect(service.broker.sendToChannel).toHaveBeenNthCalledWith(
				2,
				'channel.message.kafka.applied',
				{ table_name, record: { recid: '20' }, action: 'upsert' },
				{ key: '20' }
			)
		})

		it('routes to applyMessages for other tables and publishes', async () => {
			const table_name = 'pim-content-kz'
			const records = [{ recid: 'X' }]
			await ServiceSchema.actions.stateProcess.call(service, {
				action: { name: 'kafka.stateProcess' },
				params: { table_name, records, action: 'delete' }
			})
			expect(service.applyMessages).toHaveBeenCalledWith(table_name, records, 'delete')
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				'channel.message.kafka.applied',
				{ table_name, record: { recid: 'X' }, action: 'delete' },
				{ key: 'X' }
			)
		})
	})

	describe('channels', () => {
		it('bi-accounts-receivable-topic maps key and bucket', async () => {
			const handler = ServiceSchema.channels['bi-accounts-receivable-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const raw = { key: Buffer.from('K-1') }
			const message = { foo: 1 }
			await handler.call(service, { channelName: 'bi-accounts-receivable-topic', params: message }, raw)
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:bi-accounts-receivable:upsert`, key: 'K-1', value: { foo: 1, recid: 'K-1' } }
			)
		})

		it('bi-kpi-sales-topic normalizes empty fias_region to null', async () => {
			const handler = ServiceSchema.channels['bi-kpi-sales-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const raw = { key: Buffer.from('K-2') }
			await handler.call(service, { channelName: 'bi-kpi-sales-topic', params: { fias_region: '' , bar: 2 } }, raw)
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:bi-kpi-sales:upsert`, key: 'K-2', value: { bar: 2, fias_region: null, recid: 'K-2' } }
			)
		})

		it('pim-attributes-catalog-topic uses data.pimId as key', async () => {
			const handler = ServiceSchema.channels['pim-attributes-catalog-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const msg = { data: { pimId: 77 }, baz: 1 }
			await handler.call(service, { channelName: 'pim-attributes-catalog-topic', params: msg })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:pim-attributes-catalog:upsert`, key: '77', value: { ...msg, recid: '77' } }
			)
		})

		it('pim-attributes-nps-topic uses pimId as key', async () => {
			const handler = ServiceSchema.channels['pim-attributes-nps-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const msg = { pimId: 88, x: 5 }
			await handler.call(service, { channelName: 'pim-attributes-nps-topic', params: msg })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:pim-attributes-nps:upsert`, key: '88', value: { pimId: 88, x: 5, recid: '88' } }
			)
		})

		it('pim-product-nps-topic sets to_be_deleted when event is delete', async () => {
			const handler = ServiceSchema.channels['pim-product-nps-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const msg = { event: 'delete', data: { id: 99, v: 1 } }
			await handler.call(service, { channelName: 'pim-product-nps-topic', params: msg })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:pim-product-nps:upsert`, key: '99', value: { event: 'delete', data: { id: 99, v: 1 }, recid: '99', to_be_deleted: true } }
			)
		})

		it('ps-feed-price-stock-catalog iterates products and stores each', async () => {
			const handler = ServiceSchema.channels['ps-feed-price-stock-catalog'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const msg = { data: { products: [ { id: 'A' , price: 10 }, { id: 'B', price: 20 } ] } }
			await handler.call(service, { channelName: 'ps-feed-price-stock-catalog', params: msg })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:ps-feed-price-stock-catalog:upsert`, key: 'A', value: { id: 'A', price: 10, recid: 'A' } }
			)
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:ps-feed-price-stock-catalog:upsert`, key: 'B', value: { id: 'B', price: 20, recid: 'B' } }
			)
		})

		it('m3activity-actor-statement-finished-topic stores when object id starts with multiplume:', async () => {
			const handler = ServiceSchema.channels['m3activity-actor-statement-finished-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const msg = {
				data: {
					request: {
						payload: {
							statement: {
								object: {
									id: 'multiplume:task-1',
									definition: { extensions: { userId: 'U1', nomenclature: 'N1' } }
								},
								timestamp: '2025-02-10T12:58:37.996Z'
							}
						}
					}
				}
			}
			await handler.call(service, { channelName: 'm3activity-actor-statement-finished-topic', params: msg })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:m3activity-actor-statement-finished:upsert`, key: 'U1:N1:multiplume:task-1', value: { ...msg, recid: 'U1:N1:multiplume:task-1' } }
			)
		})
	})
})


