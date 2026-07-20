process.env.REDIS_REALIZATION_ORDERS_GENERATOR_RECORDS_COUNT = '100'
process.env.REALIZATION_ORDERS_TABLE_NAME = 'realization-orders'
process.env.CRM_REALIZATION_ORDERS_TABLE_NAME = 'crm-realization-orders'

const ServiceSchema = require('../../../services/realization.orders.generator.service')

describe('realization.orders.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'realization.orders.generator',
			settings: {
				nativeTableName: process.env.REALIZATION_ORDERS_TABLE_NAME,
				crmTableName: process.env.CRM_REALIZATION_ORDERS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			getSalesInvConsigneeLine: jest.fn(),
			crmMapper: function(nativeRecord) { return ServiceSchema.methods.crmMapper.call(this, nativeRecord) }
		}
	})

	function makeCursor(items) {
		let idx = 0
		return {
			hasNext: async () => idx < items.length,
			next: async () => items[idx++],
			close: async () => {}
		}
	}

	describe('action: generatorProcess', () => {
		it('aggregates, lowers salesline keys, sends native and mapped CRM records', async () => {
			const aggregationResult = {
				recid: 'RZ-1',
				salesid: 'SID-1',
				salesidconsolidated: 'CONS-1',
				invoiceaccount: 'ACC1',
				consigneeaccount: 'ACC2',
				wmsrequeststatusid: 'WMS',
				salesordertype: 1,
				facturedate: new Date('2025-05-06T00:00:00.000Z'),
				factureid: 'INV-1',
				salesconsigneecode: 'SO-1',
				incltax: 1,
				priceagreementdate: new Date('2025-05-07T00:00:00.000Z'),
				maintype: 'MT',
				deliverydate: new Date('2025-05-08T00:00:00.000Z'),
				shippingdaterequested: new Date('1900-01-01T00:00:00.000Z'),
				carrierdeliverydatefact: new Date('2025-05-10T00:00:00.000Z'),
				address: 'addr',
				dimagreementid: 'AG-1',
				inventlocationid: 'ST1',
				channelid: 'CH1',
				createddatetime: new Date('2025-05-01T00:00:00.000Z'),
				modifieddatetimecreateddatetime: new Date('2025-05-02T00:00:00.000Z'),
				createdby: 'u1',
				modifiedby: 'u2',
				ordersource: 3,
				deletestatus: 0,
				salesstatus: 10,
				extcode_kz: { exagreementnum: 77 },
				extcode_pik: { exagreementnum: 88 }
			}
			service.getSalesInvConsigneeLine.mockResolvedValue([
				{ ItemId: 'IT1', SalesUnit: 'pcs', Qty: 2, SalesPrice: 10, SalesPriceVAT: 12.2, LineDisc: 1, LinePercent: 5, LineAmountInclTax: 24.4, LineAmountExclTax: 20, TaxValue: 12.34, InventTableRecId: 999, ActivityId: 'A1', RegProject: 1, IsDeleted: false },
				{ ItemId: 'IT2', SalesUnit: 'pcs', Qty: 1, SalesPrice: 5, SalesPriceVAT: 6.1, LineDisc: 0, LinePercent: 0, LineAmountInclTax: 6.1, LineAmountExclTax: 5, TaxValue: 10, InventTableRecId: 1000, ActivityId: '', RegProject: 0, IsDeleted: true }
			])

			let capturedPipeline
			service.settings.db = {
				collection: () => ({ aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return makeCursor([aggregationResult]) }) })
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'realization.orders.generator.generatorProcess'},
				params: {keys: ['RZ-1']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: ['RZ-1'] } } })

			// Native send
			const nativeSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.REALIZATION_ORDERS_TABLE_NAME}-topic`)
			expect(nativeSend).toBeTruthy()
			expect(nativeSend[1]).toMatchObject({ recid: 'RZ-1', saleslines: expect.any(Array) })
			expect(nativeSend[2]).toEqual({ key: 'RZ-1' })

			// CRM send (recid is overridden to number field)
			const crmSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_REALIZATION_ORDERS_TABLE_NAME}-topic`)
			expect(crmSend).toBeTruthy()
			const payload = crmSend[1]
			expect(payload.recid).toBe(payload.number)
			expect(payload).toMatchObject({
				company: 'psv',
				account_code: 'ACC1',
				consignee_code: 'ACC2',
				consolidated_number: 'CONS-1',
				warehouse_status_code: 'WMS',
				order_type_code: 1,
				invoice_date: aggregationResult.facturedate,
				invoice_number: 'INV-1',
				order_number: 'SO-1',
				start_amount: expect.any(Number),
				is_tax_price: true,
				price_date: aggregationResult.priceagreementdate,
				top_num_typ_code: 'MT',
				actual_date: aggregationResult.deliverydate,
				due_date: null,
				date_actual_delivery: aggregationResult.carrierdeliverydatefact,
				delivery_address: 'addr',
				contract_name: '',
				contract_description: '',
				contract_delivery_date: aggregationResult.deliverydate,
				contract_number: 'AG-1',
				stock: 'ST1',
				channel_code: 'CH1',
				is_budget: false,
				axapta_created_date: aggregationResult.createddatetime,
				axapta_modified_date: aggregationResult.modifieddatetimecreateddatetime,
				axapta_createdby: 'u1',
				axapta_modifiedby: 'u2',
				number: 'SID-1',
				order_source_code: '3',
				agreementiid_kz: '77',
				agreementid_pik: '88',
				axapta_status_code: '10'
			})
			expect(Array.isArray(payload.product_details)).toBe(true)
			expect(payload.product_details).toHaveLength(1)
			expect(crmSend[2]).toEqual({ key: payload.number })
		})
	})

	describe('channels handlers', () => {
		it('source topic puts recid into bucket', async () => {
			const handler = ServiceSchema.channels['salesinvconsigneetable-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'salesinvconsigneetable-topic', params: { recid: '42' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: '42' }
			)
		})
		it('native topic stores record with insert bucket', async () => {
			const topicName = `${process.env.REALIZATION_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const rec = { recid: 'N1', a: 1 }
			await handler.call(service, { channelName: topicName, params: rec })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.REALIZATION_ORDERS_TABLE_NAME}:insert`, key: 'N1', value: rec }
			)
		})
		it('crm topic stores record with insert bucket', async () => {
			const topicName = `${process.env.CRM_REALIZATION_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const rec = { recid: 'C1', b: 2 }
			await handler.call(service, { channelName: topicName, params: rec })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.CRM_REALIZATION_ORDERS_TABLE_NAME}:insert`, key: 'C1', value: rec }
			)
		})
	})
})


