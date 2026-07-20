const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/one-c-incoming.orders.transformer.service')
const Mixin = require('../../../mixins/transformer.mixin')

const MongoClient = () => {
	const collection = {
		aggregate: jest.fn((p1) => ({
			toArray: () => new Promise((resolve) => resolve([
				{
					'account-one-c-customers-order': [
						{
							recid: 'testAccountRecid'
						}
					],
					'consignee-one-c-customers-order': [
						{
							recid: 'testConsigneeRecid'
						}
					]
				}
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

describe('Test \'one-c-incoming.orders.transformer\' service', () => {
	Mixin.created = jest.fn()
	Mixin.started = jest.fn()
	Mixin.stopped = jest.fn()
	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestService)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	const originalBrokerCall = broker.call

	describe('\'one-c-incoming.orders.transformer\' methods', () => {
		it('process method must sendToChannel \'one-c-incoming.orders.recid.transformed\' event', async () => {
			broker.call = jest.fn(() => {
				return ['testRecid']
			})
			broker.sendToChannel = jest.fn()

			await service.process('testTable', [])

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith(
				'one-c-incoming.orders.recid.transformed',
				{
					recid: 'testRecid',
					shardKey: 'testRecid'
				}
			)

			broker.call = originalBrokerCall
			broker.sendToChannel.mockClear()
		})
	})

	describe('\'one-c-incoming.orders.transformer\' actions', () => {
		it('\'aggregate\' action test  on \'dirpartytable\' table', async () => {
			service.settings.db = service.settings.client.db()
			broker.sendToChannel = jest.fn()

			const res = await broker.call('one-c-incoming.orders.transformer.aggregate', {
				table_name: 'dirpartytable',
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testAccountRecid', 'testConsigneeRecid'])
		})

		it('\'aggregate\' action test  on \'one-c-customers-order\' table', async () => {
			service.settings.db = service.settings.client.db()
			broker.sendToChannel = jest.fn()

			const res = await broker.call('one-c-incoming.orders.transformer.aggregate', {
				table_name: 'one-c-customers-order',
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testRecid'])
		})
	})
})
