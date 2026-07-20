const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/contacts.crm.service')
const Mixin = require('../../../mixins/crm.mixin')
const {v4: uuid} = require('uuid')
const REDIS_XADD_MAX_LEN = process.env.REDIS_XADD_MAX_LEN || '~250000'

const MongoClient = () => {
	const aggregate = () => ({
		toArray: jest.fn(() => ([
			{recid: 123}
		]))
	})
	const collection = {
		updateMany: jest.fn(),
		aggregate: aggregate
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

jest.mock('uuid')

describe('Test \'contacts.crm\' service', () => {
	Mixin.created = jest.fn()
	Mixin.started = jest.fn()
	Mixin.stopped = jest.fn()

	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestService)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()
	service.crmLoop = jest.fn()

	uuid.mockImplementation(() => 'testid')

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	describe('\'contacts.crm\' actions', () => {
		it('\'contacts\' action must call \'message.api.received\' channel', async () => {
			broker.sendToChannel = jest.fn()

			await broker.call('contacts.crm.contacts', {
				records: ['testRecord']
			})

			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toBeCalledWith('message.api.received', {
					action: 'upsert',
					record: {
						0: 'testRecord',
						recid: 'testid'
					},
					shardKey: 'testid',
					table_name: 'crm-contacts'
				}, {"xaddMaxLen": REDIS_XADD_MAX_LEN}
			)
		})
	})
})
