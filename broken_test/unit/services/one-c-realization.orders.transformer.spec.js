const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/one-c-realization.orders.transformer.service')
const Mixin = require('../../../mixins/transformer.mixin')

const MongoClient = () => {
	const collection = {
		aggregate: jest.fn((p1) => ({
			toArray: () => new Promise((resolve) => resolve([
				{
					'account-one-c-act-provision-production-services': [
						{
							recid: 'testAccountRecid'
						}
					],
					'consignee-one-c-act-provision-production-services': [
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

describe('Test \'one-c-realization.orders.transformer\' service', () => {
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

	describe('\'one-c-realization.orders.transformer\' methods', () => {
		it('process method must sendToChannel \'one-c-realization.orders.recid.transformed\' event', async () => {
			broker.call = jest.fn(() => {
				return ['testRecid']
			})
			broker.sendToChannel = jest.fn()

			await service.process('testTable', [])

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith(
				'one-c-realization.orders.recid.transformed',
				{
					recid: 'testRecid',
					shardKey: 'testRecid'
				}
			)

			broker.call = originalBrokerCall
			broker.sendToChannel.mockClear()
		})
	})

	describe('\'one-c-realization.orders.transformer\' actions', () => {
		it('\'aggregate\' action test  on \'dirpartytable\' table', async () => {
			service.settings.db = service.settings.client.db()
			broker.sendToChannel = jest.fn()

			const res = await broker.call('one-c-realization.orders.transformer.aggregate', {
				table_name: 'dirpartytable',
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testAccountRecid', 'testConsigneeRecid'])
		})

		it('\'aggregate\' action test  on \'one-c-customers-order\' table', async () => {
			service.settings.db = service.settings.client.db()
			broker.sendToChannel = jest.fn()

			const res = await broker.call('one-c-realization.orders.transformer.aggregate', {
				table_name: 'one-c-act-provision-production-services',
				recids: ['testRecid']
			})

			expect(res).toStrictEqual(['testRecid'])
		})
	})
})
