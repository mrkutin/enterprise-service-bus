const {ServiceBroker} = require('moleculer')
const TestMixin = require('../../../mixins/generator.mixin')

const MongoClient = () => {
	return {
		connect: () => { return Promise.resolve },
		db: (DB_NAME) =>  { return Promise.resolve },
		close: () => { return Promise.resolve }
	}
}

describe('Test \'generator\' mixin', () => {
	TestMixin.created = jest.fn()
	TestMixin.started = jest.fn()
	TestMixin.stopped = jest.fn()

	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestMixin)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	service.settings.nativeTableName = 'nativeTestTable'
	service.settings.crmTableName = 'crmTestTable'

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	const originalBrokerCall = broker.call

	describe('Lifecycle hooks', () => {
		it('generatorLoop should run generatorProcess method', async () => {
			broker.call = jest.fn(() => {
				return ['123']
			})

			const processMock = jest.fn()
			const oldProcess = service.generatorProcess
			service.generatorProcess = processMock

			await service.generatorLoop()
			expect(service.generatorProcess).toBeCalledTimes(1)
			expect(service.generatorProcess).toBeCalledWith(['123'])

			broker.call = originalBrokerCall
			service.generatorProcess = oldProcess
		})

		it('generatorMongoConnect method must run client.connect and return db', async () => {
			const res = await service.generatorMongoConnect()
			expect(res).toHaveProperty('client')
			expect(res).toHaveProperty('db')

			service.generatorMongoConnect = jest.fn()
		})
	})

	describe('\'generator\' mixin methods', () => {
		it('\'generatorSaveNativeRecords\' method must sendToChannel \'nativeTestTable.aggregate.generated\' channel', async () => {
			broker.sendToChannel = jest.fn()

			await service.generatorSaveNativeRecords([{recid: '123'}])

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith('aggregate.generated', {
				'action': 'upsert',
				'record': {'recid': '123'},
				'shardKey': '123',
				'table_name': 'nativeTestTable'
			}, {'xaddMaxLen': '~250000'})

			broker.sendToChannel.mockClear()
		})

		it('\'generatorSaveCrmRecords\' method must sendToChannel \'crmTestTable.aggregate.generated\' channel', async () => {
			broker.sendToChannel = jest.fn()

			await service.generatorSaveCrmRecords([{recid: '123'}])

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith('aggregate.generated', {
				'action': 'upsert',
				'record': {'recid': '123'},
				'shardKey': '123',
				'table_name': 'crmTestTable'
			}, {'xaddMaxLen': '~250000'})

			broker.sendToChannel.mockClear()
		})
	})

	describe('\'generator\' mixin actions', () => {
		it('\'aggregate\' action test', async () => {
			try {
				await broker.call('generator.mixin.aggregate')
			} catch (err) {
				expect(err).toBeInstanceOf(Error)
			}
		})

		it('\'mapOrders\' action test', async () => {
			try {
				await broker.call('generator.mixin.aggregate')
			} catch (err) {
				expect(err).toBeInstanceOf(Error)
			}
		})
	})
})
