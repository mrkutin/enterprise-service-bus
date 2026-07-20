const {ServiceBroker} = require('moleculer')
const TestMixin = require('../../../mixins/transformer.mixin')

const MongoClient = () => {
	return {
		connect: () => { return Promise.resolve },
		db: (DB_NAME) =>  { return Promise.resolve },
		close: () => { return Promise.resolve },
	}
}

describe('Test \'transformer\' mixin', () => {
	TestMixin.created = jest.fn()
	TestMixin.started = jest.fn()
	TestMixin.stopped = jest.fn()
	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestMixin)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()
	service.settings.allowedTables  = [
		'test'
	]

	describe('Lifecycle hooks', () => {
		it('transformerLoop should run process method', async () => {
			broker.call = jest.fn((actionName) => {
				if (actionName === 'accumulator.search') {
					return ['test:testTable']
				}
				if (actionName === 'accumulator.takeKeys') {
					return ['123']
				}
			})

			const processMock = jest.fn()
			const oldProcess = service.process
			service.process = processMock

			await service.transformerLoop()
			expect(service.process).toBeCalledTimes(1)

			broker.call.mockRestore()
			service.process = oldProcess
		})

		it('transformerMongoConnect method must run client.connect and return db', async () => {
			const res = await service.transformerMongoConnect()
			expect(res).toHaveProperty('client')
			expect(res).toHaveProperty('db')

			service.transformerMongoConnect = jest.fn()
		})
	})
})
