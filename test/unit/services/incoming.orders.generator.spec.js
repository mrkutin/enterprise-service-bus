process.env.INCOMING_ORDERS_TABLE_NAME = 'incoming-orders'
process.env.CRM_INCOMING_ORDERS_TABLE_NAME = 'crm-incoming-orders'
process.env.CRM_CLIENTS_TABLE_NAME = 'crm-clients'
process.env.REDIS_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT = '100'

const ServiceSchema = require('../../../services/incoming.orders.generator.service')

describe('incoming.orders.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'incoming.orders.generator',
			settings: {
				nativeTableName: process.env.INCOMING_ORDERS_TABLE_NAME,
				crmTableName: process.env.CRM_INCOMING_ORDERS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			getSalesConsigneeLine: jest.fn(),
			getRecords: jest.fn(),
			crmMapper: function(nativeRecord) { return ServiceSchema.methods.crmMapper.call(this, nativeRecord) }
		}
	})

	describe('action: generatorProcess', () => {
		it('aggregates, lowers salesline keys, and sends native + CRM records', async () => {
			const aggregationResult = {
				recid: '101',
				salesconsigneecode: 'SO-1',
				centralizedordertype: 10,
				consignee: 'ACC-CONS',
				custaccount: 'ACC-1',
				salesid: 'S-123',
				incltax: 1,
				priceagreementdate: new Date('1900-01-01T00:00:00.000Z'),
				maintype: 'MT',
				deliverydate: new Date('2024-03-01T00:00:00.000Z'),
				shippingdaterequested: new Date('1900-01-01T00:00:00.000Z'),
				deliveryaddressing: 'Addr',
				contract_number: 'CN-1',
				inventlocationid: 'ST-1',
				channelid: '000000005',
				salesordertype: 2,
				createddatetime: new Date('2024-02-01T00:00:00.000Z'),
				modifieddatetime: new Date('1900-01-01T00:00:00.000Z'),
				createdby: 'u1',
				modifiedby: 'u2',
				ordersource: 3,
				deletestatus: 0,
				extcode_kz: { exagreementnum: 77 },
				extcode_pik: { exagreementnum: 88 }
			}

			let capturedPipeline
			const cursor = (() => {
				let idx = 0
				const items = [aggregationResult]
				return {
					hasNext: async () => idx < items.length,
					next: async () => items[idx++],
					close: async () => {}
				}
			})()

			service.settings.db = {
				collection: () => ({
					aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return cursor })
				})
			}

			service.getSalesConsigneeLine.mockResolvedValue([
				{ ItemId: 'IT1', SalesUnit: 'pcs', Qty: 2, SalesPrice: 10.5, SalesPriceVAT: 12.6, LineDisc: 1.1, LinePercent: 5, TotalAmount: 25.2, TotalAmountExclTax: 22.0, TaxValue: 12.34, InventTableRecId: 999, ActivityId: 'A1', RegProject: 1, IsDeleted: false },
				{ ItemId: 'IT2', SalesUnit: 'pcs', Qty: 1, SalesPrice: 5, SalesPriceVAT: 6, LineDisc: 0, LinePercent: 0, TotalAmount: 6, TotalAmountExclTax: 5, TaxValue: 10, InventTableRecId: 1000, ActivityId: '', RegProject: 0, IsDeleted: true }
			])
			service.getRecords.mockResolvedValueOnce([{ _id: 1 }])

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'incoming.orders.generator.generatorProcess'},
				params: {keys: ['101']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toHaveProperty('$match')
			expect(capturedPipeline[0].$match.recid.$in).toEqual(['101'])

			// Native send
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				`${service.settings.nativeTableName}-topic`,
				expect.objectContaining({ recid: '101', saleslines: expect.any(Array) }),
				{ key: '101' }
			)

			// CRM send
			const sentCrm = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${service.settings.crmTableName}-topic`)
			expect(sentCrm).toBeTruthy()
			const crmPayload = sentCrm[1]
			expect(crmPayload).toMatchObject({
				recid: crmPayload.number,
				company: 'psv',
				account_code: 'ACC-CONS',
				consignee_code: 'ACC-CONS',
				consolidated_number: 'S-123',
				is_tax_price: true,
				price_date: null,
				top_num_typ_code: 'MT',
				actual_date: aggregationResult.deliverydate,
				due_date: null,
				agreementiid_kz: '77',
				agreementid_pik: '88',
				is_realization_order_created: true,
				axapta_status_code: '0',
				order_source_code: '3'
			})
			expect(Array.isArray(crmPayload.product_details)).toBe(true)
			expect(crmPayload.product_details).toHaveLength(1)
			const pd = crmPayload.product_details[0]
			expect(pd).toMatchObject({
				item_code: 'IT1',
				unit: 'pcs',
				quantity: 2,
				price: 10.5,
				vat_price: 12.6,
				one_discount: 1.1,
				discount_percent: 5,
				total_amount: 25.2,
				total_amount_without_vat: 22,
				tax_rate: 12.34,
				rec_id: '999',
				activity_id: 'A1',
				is_reg_project: true
			})
			expect(crmPayload.amount).toBeCloseTo(25.2, 5)
			expect(crmPayload.amount_without_vat).toBeCloseTo(22.0, 5)
		})
	})

	describe('method: crmMapper edge cases', () => {
		it('sets axapta_status_code to 99 for deletestatus 50 and omits product_details', async () => {
			const native = {
				salesconsigneecode: 'SO-2',
				centralizedordertype: 0,
				consignee: 'C',
				custaccount: 'ACC',
				saleslines: [],
				incltax: 0,
				priceagreementdate: new Date('1900-01-01T00:00:00.000Z'),
				maintype: 'X',
				deliverydate: new Date('1900-01-01T00:00:00.000Z'),
				shippingdaterequested: new Date('1900-01-01T00:00:00.000Z'),
				deliveryaddressing: '',
				contract_number: '',
				inventlocationid: 'S',
				channelid: '000000001',
				salesordertype: 1,
				createddatetime: new Date('1900-01-01T00:00:00.000Z'),
				modifieddatetime: new Date('1900-01-01T00:00:00.000Z'),
				createdby: '',
				modifiedby: '',
				ordersource: 0,
				deletestatus: 50,
				extcode_kz: null,
				extcode_pik: null
			}
			service.getRecords.mockResolvedValueOnce([])
			const mapped = await service.crmMapper(native)
			expect(mapped.axapta_status_code).toBe('99')
			expect(mapped.product_details).toBeUndefined()
		})
	})

	describe('channels handlers', () => {
		it('source topic calls putKey with recid', async () => {
			const handler = ServiceSchema.channels['salesconsigneetable-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, {channelName: 'salesconsigneetable-topic', params: { recid: '5' }})
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: '5' }
			)
		})

		it('native table topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.INCOMING_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: '10', a: 1 }
			await handler.call(service, {channelName: topicName, params: record})
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.INCOMING_ORDERS_TABLE_NAME}:insert`, key: '10', value: record }
			)
		})

		it('CRM table topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.CRM_INCOMING_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: '11', b: 2 }
			await handler.call(service, {channelName: topicName, params: record})
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.CRM_INCOMING_ORDERS_TABLE_NAME}:insert`, key: '11', value: record }
			)
		})
	})
})


