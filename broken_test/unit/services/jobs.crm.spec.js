const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/jobs.crm.service')
const Mixin = require('../../../mixins/crm.mixin')
const {v4: uuid} = require('uuid')
const ChannelsMiddleware = require('@moleculer/channels').Middleware

const MongoClient = () => {
	const collection = {
		updateMany: jest.fn(),
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

describe('Test \'jobs.crm\' service', () => {
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
	service.crmLoop = jest.fn()

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	uuid.mockImplementation(() => 'testid')

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	describe('\'jobs.crm\' actions', () => {
		it('\'jobs\' action must call \'\'message.api.received\' event', async () => {
			broker.sendToChannel = jest.fn()
			await broker.call('jobs.crm.jobs', {
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
				table_name: 'crm-jobs'
			})
		})
	})

	describe('\'jobs.crm\' channels', () => {
		it('\'jobs\' action must send into \'\'message.api.received\' channel', async () => {
			broker.call = jest.fn()
			await service.emitLocalChannelHandler('state.applied', {
				params: {
					table_name: 'crm-jobs',
					record: ['testRecord']
				}
			})

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toBeCalledWith('jobs.crm.updateRecords',
				{
					records: [['testRecord']],
					updatedFields:
						{
							attempts: 0,
							crm_status: 'ready'
						}
				}
			)
		})
	})
})
