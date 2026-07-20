const {ServiceBroker} = require('moleculer')
const TestMixin = require('../../../mixins/state.mixin')
const REDIS_XADD_MAX_LEN = process.env.REDIS_XADD_MAX_LEN || '~250000'

const MongoClient = () => {
	const collection = {
		createIndex: jest.fn(),
		bulkWrite: jest.fn()
	}
	const db = {
		collection: () => {
			return collection
		}
	}
	return {
		connect: () => { return Promise.resolve },
		db: () => {
			return db
		},
		close: () => { return Promise.resolve }
	}
}

describe('Test \'state\' mixin', () => {
	TestMixin.created = jest.fn()
	TestMixin.started = jest.fn()
	TestMixin.stopped = jest.fn()
	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestMixin)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	describe('Lifecycle hooks', () => {
		it('stateLoop should run stateProcess method', async () => {
			const oldBrokerCall = broker.call
			broker.call = jest.fn((actionName) => {
				if (actionName === 'accumulator.search') {
					return ['test:testTable:upsert']
				}
				if (actionName === 'accumulator.takeValues') {
					return ['testValue']
				}
			})

			const processMock = jest.fn()
			const oldProcess = service.stateProcess
			service.stateProcess = processMock

			await service.stateLoop()
			expect(service.stateProcess).toBeCalledTimes(1)
			expect(service.stateProcess).toBeCalledWith('testTable', ['testValue'], 'upsert')

			broker.call = oldBrokerCall
			service.stateProcess = oldProcess
		})

	})

	describe('\'state\' methods', () => {
		it('stateProcess method must call actions and sendToChannel channels', async () => {
			const oldBrokerCall = broker.call

			broker.call = jest.fn((actionName) => {
				if (actionName === `${service.name}.applyMessages`) {
					return [{recid: 123}]
				}
			})
			broker.sendToChannel = jest.fn()

			await service.stateProcess('test', [{recid: 123}], 'upsert')

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'state.mixin.applyMessages',
				{
					'action': 'upsert',
					'records': [{recid: 123}],
					'table_name': 'test'
				}
			)

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith(
				'state.applied',
				{
					'table_name': 'test',
					'record': {recid: 123},
					'shardKey': 123
				}, {"xaddMaxLen": REDIS_XADD_MAX_LEN}
			)

			broker.call = oldBrokerCall
			broker.sendToChannel.mockClear()
		})
	})

	describe('\'state\' mixin actions', () => {
		it('\'applyMessages\' action test', async () => {
			service.settings.db = service.settings.client.db()

			await broker.call('state.mixin.applyMessages', {
				table_name: 'testTable',
				records: [{recid: 123}],
				action: 'upsert'
			})

			expect(service.settings.db.collection('testTable').createIndex).toHaveBeenCalledTimes(1)
			expect(service.settings.db.collection('testTable').createIndex).toHaveBeenCalledWith({'recid': 1}, {'unique': true})

			expect(service.settings.db.collection('testTable').bulkWrite).toHaveBeenCalledTimes(1)
		})
	})
})
