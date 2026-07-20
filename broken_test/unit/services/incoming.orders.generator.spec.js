const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/incoming.orders.generator.service')
const GeneratorMixin = require('../../../mixins/generator.mixin')
const AccumulatorMixin = require('../../../mixins/accumulator.mixin')
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

describe('Test \'incoming.orders.generator\' service', () => {
	GeneratorMixin.created = jest.fn()
	GeneratorMixin.started = jest.fn()
	AccumulatorMixin.created = jest.fn()


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

	describe('\'incoming.orders.generator\' methods', () => {
		it('generatorProcess method must call actions and use  methods', async () => {
			// method must call 'incoming.orders.generator.aggregate' and 'incoming.orders.mapOrders' actions
			// and use 'generatorSaveNativeRecords', 'orderMapper' and 'generatorSaveCrmRecords' methods

			broker.call = jest.fn((actionName) => {
				if (actionName === 'incoming.orders.generator.aggregate') {
					return ['nativeIncomingOrder']
				}
				if (actionName === 'incoming.orders.generator.mapOrders') {
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
				'incoming.orders.generator.aggregate',
				{
					salesIds: [123]
				}
			)

			expect(broker.call).toHaveBeenCalledWith(
				'incoming.orders.generator.mapOrders',
				{
					nativeOrders: ['nativeIncomingOrder']
				}
			)

			expect(service.orderMapper).toBeCalledTimes(1)
			expect(service.orderMapper).toBeCalledWith('nativeIncomingOrder', 0, ['nativeIncomingOrder'])

			expect(service.generatorSaveNativeRecords).toBeCalledTimes(1)

			expect(service.generatorSaveCrmRecords).toBeCalledTimes(1)
			expect(service.generatorSaveCrmRecords).toBeCalledWith([{'number': 789, 'recid': 789, 'testKey': 456}])

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
				recid: 'testSalesId-testConsignee',
				testKey: 456
			})
		})

		it('createPositions method test', async () => {
			const res = await service.createPositions(
				{
					saleslines: [
						{
							itemid: 'testItemid',
							salesunit: 'testIncomingSalesunit',
							recid: 'testIncomingRecid',
							psv_salespricevat: 4,
							salesprice: 6,
							saleslineconsignee: {}
						}
					]
				},
				[
					{
						product_details: [
							{
								item_code: 'testItemid',
								unit: 'testRealizationSalesunit',
								quantity: 5,
								on_pvm: 0,
								stock_disable: 0,
								on_stock: 0,
								delivery_left: 0,
								to_delivery: 0,
								price: 0,
								vat_price: 0,
								one_discount: 0,
								discount_percent: 0,
								total_amount: 0,
								total_amount_without_vat: 0,
								tax_rate: 0,
								rec_id: 'testRealizationRecid',
								is_reg_project: false
							}
						]
					}
				]
			)

			expect(res).toStrictEqual([
				{
					delivery_left: 0,
					discount_percent: 0,
					is_reg_project: false,
					item_code: 'testItemid',
					on_pvm: 0,
					on_stock: 0,
					one_discount: 0,
					price: 6,
					quantity: 5,
					rec_id: 'testIncomingRecid',
					stock_disable: 0,
					tax_rate: 0,
					to_delivery: 0,
					total_amount: 20,
					total_amount_without_vat: 30,
					unit: 'testIncomingSalesunit',
					vat_price: 4,
				}
			])
		})
	})

	describe('\'incoming.orders.generator\' channels', () => {
		it('\'consolidated.salesid.transformed\' channel must call \'incoming.orders.generator.putKey\' action', async () => {
			broker.call = jest.fn()

			await service.emitLocalChannelHandler('consolidated.salesid.transformed', {
				params: {salesId: 'test'}
			})

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'incoming.orders.generator.putKey',
				{
					bucket: 'incoming.orders.generator',
					key: 'test'
				}
			)

			broker.call = originalBrokerCall
		})
	})

	describe('\'incoming.orders.generator\' service actions', () => {
		it('\'aggregate\' action test', async () => {
			const res = await broker.call('incoming.orders.generator.aggregate', {
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testMongoResult'])
		})

		it('\'mapOrders\' action test', async () => {
			broker.call = jest.fn((actionName, params) => {
				if (actionName === 'state.getRecords') {
					return ['realizationOrder']
				}
				return originalBrokerCall('incoming.orders.generator.mapOrders', params)
			})

			service.createPositions = jest.fn(() => [{
				total_amount: 10,
				total_amount_without_vat: 8
			}])

			const res = await broker.call('incoming.orders.generator.mapOrders', {
				nativeOrders: [
					{
						_id: {
							salesid: 'testSalesid',
							consignee: 'testConsignee',
							salesnumbersequence: 'testSalesnumbersequence'
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
							psv_ordersource: 'testSource'
						},
						saleslines: [
							{
								psv_salespricevat: 10,
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
				actual_date: 'testDate',
				amount: 10,
				amount_without_vat: 8,
				axapta_created_date: 'testDate',
				axapta_createdby: 'testName',
				axapta_modified_date: 'testDate',
				axapta_modifiedby: 'testName',
				axapta_status_code: 'testStatus',
				channel_code: 'testChannelid',
				company: 'psv',
				consignee_code: 'testConsignee',
				consolidated_number: 'testSalesid',
				contract_delivery_date: 'testDate',
				contract_description: 'testDesc',
				contract_name: 'testTitle',
				contract_number: 'testSalesnumbersequence',
				delivery_address: 'testAddress',
				delivery_method: 'testDesc',
				due_date: 'testDate',
				is_budget: false,
				is_realization_order_created: true,
				is_tax_price: true,
				number: 'testSalesid-testConsignee',
				order_source_code: 'testSource',
				price_date: 'testDate',
				product_details: [{'total_amount': 10, 'total_amount_without_vat': 8}],
				start_amount: 30,
				stock: 'testId',
				top_num_typ_code: 'testType'
			}])
		})
	})
})
