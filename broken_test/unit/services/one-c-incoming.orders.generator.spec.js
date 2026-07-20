const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/one-c-incoming.orders.generator.service')
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

describe('Test \'one-c-incoming.orders.generator\' service', () => {
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

	const originalBrokerCall = broker.call

	describe('\'one-c-incoming.orders.generator\' methods', () => {
		it('process method must call actions and use  methods', async () => {
			// method must call 'one-c-incoming.orders.generator.aggregate' and 'incoming.orders.mapOrders' actions
			// and use 'generatorSaveNativeRecords', 'orderMapper' and 'generatorSaveCrmRecords' methods

			broker.call = jest.fn((actionName) => {
				if (actionName === 'one-c-incoming.orders.generator.aggregate') {
					return ['nativeOneCIncomingOrders']
				}
				if (actionName === 'one-c-incoming.orders.generator.mapOrders') {
					return ['crmOneCIncomingOrders']
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
				'one-c-incoming.orders.generator.aggregate',
				{
					recids: [123]
				}
			)
			expect(broker.call).toHaveBeenCalledWith(
				'one-c-incoming.orders.generator.mapOrders',
				{ nativeOrders: ['nativeOneCIncomingOrders'] }
			)

			expect(service.orderMapper).toBeCalledTimes(1)
			expect(service.orderMapper).toBeCalledWith('nativeOneCIncomingOrders', 0, ['nativeOneCIncomingOrders'])

			expect(service.generatorSaveNativeRecords).toBeCalledTimes(1)
			expect(service.generatorSaveCrmRecords).toBeCalledTimes(1)

			broker.call = originalBrokerCall
			service.orderMapper = oldOrderMapper
		})

		it('orderMapper method test', async () => {
			const res = await service.orderMapper({
				_id: 123,
				created_at: 'testDate',
				testKey: 456
			})

			expect(res).toStrictEqual({
				testKey: 456
			})
		})
	})

	describe('\'one-c-incoming.orders.generator\' channels', () => {
		it('\'one-c-incoming.orders.recid.transformed\' channel must call \'accumulator.putKey\' action', async () => {
			broker.call = jest.fn()

			await service.emitLocalChannelHandler('one-c-incoming.orders.recid.transformed', {
				params: {recid: 123}
			})

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'accumulator.putKey',
				{
					bucket: 'one-c-incoming.orders.generator',
					key: 123
				}
			)

			broker.call = originalBrokerCall
		})
	})

	describe('\'one-c-incoming.orders.generator\' service actions', () => {
		it('\'aggregate\' action test', async () => {
			const res = await broker.call('one-c-incoming.orders.generator.aggregate', {
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testMongoResult'])
		})

		it('\'mapOrders\' action test', async () => {
			const res = await broker.call('one-c-incoming.orders.generator.mapOrders', {
				nativeOrders: [{
					'recid': 'testRecid',
					'суммадокумента': 100,
					'год': 'testYear',
					'датасозданиядокумента': 'testDate',
					'договорконтрагента': {
						'IDAX': 'testIdax'
					},
					'договорконтрагентаканалкод': 'tesChannelCode',
					'контрагент': {
						'IDAX': 'testIdax'
					},
					'номер': 'testNumber',
					'основнойтипноменклатуры': 'testType',
					'ответственный': {
						'_name': 'testName'
					},
					'сделка': {
						'Номер': 'testNumber',
						'Год': 'testYear'
					},
					'статус': 'testStatus',
					'суммавключаетндс': 'testSign',
					'счетфактурадата': 'testDate',
					'счетфактураномер': 'testNumber',
					'товары': [
						{
							'НомерСтроки': 1,
							'КодSKU': 'testCode',
							'Количество': 3,
							'ЕдиницаИзмерения': 'testUnit',
							'ЦенаБезНДС': 10,
							'ЦенаСНДС': 15,
							'СуммаСНДС': 20
						}
					],
					'accountDirpartytable': {
						'custaccount': 'testCustaccount'
					},
					'consigneeDirpartytable': {
						'custaccount': 'testCustaccount'
					}
				}]
			})

			expect(res).toStrictEqual([{
				'account_code': 'testCustaccount',
				'amount': 100,
				'amount_without_vat': 0,
				'axapta_created_date': 'testDate',
				'axapta_createdby': 'testName',
				'axapta_status_code': 'testStatus',
				'channel_code': 'tesChannelCode',
				'company': 'PSV',
				'consignee_code': 'testCustaccount',
				'consolidated_number': 'testYear-testNumber',
				'contract_number': 'testIdax',
				'gak': 'testIdax',
				'is_1c_order': true,
				'is_correct_efu': false,
				'is_tax_price': 'testSign',
				'number': 'testYear-testNumber-testCustaccount',
				'product_details': [{
					'item_code': 'testCode',
					'price': 10,
					'quantity': 3,
					'rec_id': '1',
					'string_pos': 1,
					'tax_rate': 0,
					'total_amount': 20,
					'total_amount_without_vat': 0,
					'unit': 'testUnit',
					'vat_price': 15
				}],
				'recid': 'testRecid',
				'start_amount': 100
			}])
		})
	})
})
