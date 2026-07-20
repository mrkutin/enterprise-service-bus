const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/realization.orders.generator.service')
const Mixin = require('../../../mixins/generator.mixin')
const ChannelsMiddleware = require('@moleculer/channels').Middleware

const MongoClient = () => {
	const collection = {
		aggregate: jest.fn(() => ({
			toArray: () => new Promise((resolve) => resolve([
				'testMongoResult'
			]))
		}))
	}
	const db = {
		collection: () => {
			return collection
		}
	}
	return {
		connect: () => { return Promise.resolve },
		db: (DB_NAME) => {
			return db
		},
		close: () => { return Promise.resolve }
	}
}

describe('Test \'realization.orders.generator\' service', () => {
	Mixin.created = jest.fn()
	Mixin.started = jest.fn()
	Mixin.stopped = jest.fn()
	const broker = new ServiceBroker({
		logger: false,
		middlewares: [
			ChannelsMiddleware({
				adapter: {type: 'Fake'}
			})
		]
	})
	const service = broker.createService(TestService)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	const originalBrokerCall = broker.call.bind(broker)

	describe('\'realization.orders.generator\' methods', () => {
		it('process method must call actions and use methods', async () => {
			// method must call 'realization.orders.generator.aggregate' and 'realization.orders.mapOrders' actions
			// and use 'generatorSaveNativeRecords', 'orderMapper' and 'generatorSaveCrmRecords' methods

			broker.call = jest.fn((actionName) => {
				if (actionName === 'realization.orders.generator.aggregate') {
					return ['nativeRealizationOrder']
				}
				if (actionName === 'realization.orders.generator.mapOrders') {
					return [
						{
							testKey: 456,
							number: 789
						}
					]
				}
			})

			const orderMapperMock = jest.fn()
			const oldOrderMapper = service.orderMapper
			service.orderMapper = orderMapperMock

			service.generatorSaveNativeRecords = jest.fn()
			service.generatorSaveCrmRecords = jest.fn()

			await service.generatorProcess([123])

			expect(broker.call).toBeCalledTimes(2)
			expect(broker.call).toHaveBeenCalledWith(
				'realization.orders.generator.aggregate',
				{
					salesIds: [123]
				}
			)
			expect(broker.call).toHaveBeenCalledWith(
				'realization.orders.generator.mapOrders',
				{
					nativeOrders: ['nativeRealizationOrder']
				}
			)

			expect(service.orderMapper).toBeCalledTimes(1)
			expect(service.orderMapper).toBeCalledWith('nativeRealizationOrder', 0, ['nativeRealizationOrder'])

			expect(service.generatorSaveNativeRecords).toBeCalledTimes(1)

			expect(service.generatorSaveCrmRecords).toBeCalledTimes(1)
			expect(service.generatorSaveCrmRecords).toBeCalledWith([{number: 789, recid: 789, testKey: 456}])

			broker.call = originalBrokerCall
			service.orderMapper = oldOrderMapper
		})

		it('orderMapper method test', async () => {
			const res = await service.orderMapper({
				_id: {
					salesid: 'testSalesId',
					consignee: 'testConsignee'
				},
				testKey: 456
			})

			expect(res).toStrictEqual({
				recid: 'testSalesId',
				testKey: 456
			})
		})

		it('regenerateIncomingOrders method test', async () => {
			broker.sendToChannel = jest.fn()

			const res = await service.regenerateIncomingOrders([
				{
					consolidated_number: 'testSalesid'
				}
			])

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith(
				'consolidated.salesid.transformed',
				{
					salesId: 'testSalesid'
				}, {"xaddMaxLen": "~250000"}
			)
		})
	})

	describe('\'realization.orders.generator\' channels', () => {
		it('\'consolidated.salesid.transformed\' channel must call \'accumulator.putKey\' action', async () => {
			broker.call = jest.fn()

			await service.emitLocalChannelHandler('nonconsolidated.salesid.transformed', {
				params: {salesId: 'test'}
			})

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'accumulator.putKey',
				{
					bucket: 'realization.orders.generator',
					key: 'test'
				}
			)

			broker.call = originalBrokerCall
		})
	})

	describe('\'realization.orders.generator\' service actions', () => {
		it('\'aggregate\' action test', async () => {
			const res = await broker.call('realization.orders.generator.aggregate', {
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testMongoResult'])
		})

		it('\'mapOrders\' action test', async () => {
			const res = await broker.call('realization.orders.generator.mapOrders', {
				nativeOrders: [
					{
						_id: {
							salesid: 'testSalesid',
							consignee: 'testConsignee'
						},
						salestable: {
							createddatetime: 'testDate',
							channelid: 'testChannelid',
							invoiceaccount: 'testInvoiceaccount',
							salesid: 'testSalesid',
							psv_salesstatus: 'testStatus',
							incltax: 10,
							priceagreementdate_ru: 'testDate',
							psv_maintype: 'testType',
							deliverydate: 'testDate',
							shippingdaterequested: 'testDate',
							address: 'testAddress',
							documenttitle: 'testTitle',
							documentexternalreference: 'testDesc',
							psv_deliverydate: 'testDate',
							agreementid: 'testId',
							inventlocationid: 'testId',
							modifieddatetime: 'testDate',
							deliverymode_sales: 'testDesc',
							psv_ordersource: 'testSource',
							psv_salesidconsolidated: 'testNumber',
							isbudgetary: 1,
							wmsstatusid: 'testId',
							psv_salesordertype: 'testType',
							psv_facturedate: 'testDate',
							psv_factureid: 'testId',
							psv_invoiceactid: 'testId'
						},
						salestableru: {
							consigneeaccount_ru: 'testConsignee'
						},
						salesline: [
							{
								recid: 'testRecid',
								psv_salespricevat: 10,
								psv_regproject: 1,
								itemid: 'testItemid',
								salesunit: 'testSalesunit',
								saleslineconsignee: {
									qty: 3
								}
							}
						],
						userinfo_createdby: {
							name: 'testName'
						},
						userinfo_modifiedby: {
							name: 'testName'
						}
					}
				]
			})

			expect(res).toStrictEqual([{
				account_code: 'testInvoiceaccount',
				act_number: 'testId',
				actual_date: 'testDate',
				amount: 0,
				amount_without_vat: 0,
				axapta_created_date: 'testDate',
				axapta_createdby: 'testName',
				axapta_modified_date: 'testDate',
				axapta_modifiedby: 'testName',
				axapta_status_code: 'testStatus',
				channel_code: 'testChannelid',
				company: 'psv',
				consignee_code: 'testConsignee',
				consolidated_number: 'testNumber',
				contract_delivery_date: 'testDate',
				contract_description: 'testDesc',
				contract_name: 'testTitle',
				contract_number: 'testId',
				delivery_address: 'testAddress',
				delivery_method: 'testDesc',
				due_date: 'testDate',
				invoice_date: 'testDate',
				invoice_number: 'testId',
				is_budget: true,
				is_tax_price: true,
				number: 'testSalesid',
				order_number: 'testNumber-testConsignee',
				order_source_code: 'testSource',
				order_type_code: 'testType',
				price_date: 'testDate',
				product_details: [{
					delivery_left: 0,
					discount_percent: 0,
					is_reg_project: true,
					item_code: 'testItemid',
					on_pvm: 0,
					on_stock: 0,
					one_discount: 0,
					price: 0,
					quantity: 0,
					rec_id: 'testRecid',
					stock_disable: 0,
					tax_rate: 0,
					to_delivery: 0,
					total_amount: 0,
					total_amount_without_vat: 0,
					unit: 'testSalesunit',
					vat_price: 10
				}],
				stock: 'testId',
				top_num_typ_code: 'testType',
				warehouse_status_code: 'testId'
			}])
		})
	})
})
