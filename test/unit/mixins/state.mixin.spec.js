'use strict'

// Mock timers/promises setInterval to yield a single tick
jest.mock('node:timers/promises', () => {
	return {
		setInterval: jest.fn(() => ({
			[Symbol.asyncIterator]: async function* () {
				yield Date.now()
			}
		}))
	}
})

// We will stub MongoClient constructor in tests as needed
jest.mock('mongodb', () => {
	return { MongoClient: jest.fn() }
})

describe('state.mixin (unit)', () => {
	const path = require('path')
	const { MongoClient } = require('mongodb')
	const timers = require('node:timers/promises')

	const mockCrmTables = [{ tableName: 'crm_customers' }]
	const crmConfigAbsPath = path.join(__dirname, '../../../configs/crm.config.js')

	const makeService = () => ({
		name: 'state.service',
		settings: {
			redisStateRecordsCount: '2',
			client: undefined,
			db: undefined
		},
		logger: { info: jest.fn(), error: jest.fn() },
		broker: {
			waitForServices: jest.fn().mockResolvedValue(),
			call: jest.fn(),
			sendToChannel: jest.fn()
		},
		// bind mixin methods on demand per test
		mongoConnect: undefined,
		mongoDisconnect: undefined,
		createIndexes: undefined,
		startStateLoop: undefined,
		stateLoop: undefined,
		applyMessages: undefined,
		deleteAllRecords: undefined,
		updateRecords: undefined,
		getRecords: undefined
	})

	beforeEach(() => {
		jest.clearAllMocks()
		delete process.env.MONGO_DB_RS
		delete process.env.MONGO_DB_NAME
		delete process.env.MONGO_HOST
		delete process.env.MONGO_SECONDARY_HOST
		delete process.env.MONGO_USER
		delete process.env.MONGO_PASSWORD
		delete process.env.MONGO_CA_CERT
		delete process.env.REDIS_STATE_RECORDS_COUNT
	})

	const loadMixinWithMockedCrm = () => {
		jest.isolateModules(() => {
			jest.doMock(crmConfigAbsPath, () => mockCrmTables, { virtual: false })
		})
		// eslint-disable-next-line global-require
		return require('../../../mixins/state.mixin')
	}

	describe('lifecycle: started', () => {
		it('creates MongoClient with env url/options, connects, and starts loop', async () => {
			process.env.MONGO_DB_NAME = 'mydb'
			process.env.MONGO_HOST = 'host1'
			process.env.MONGO_SECONDARY_HOST = 'host2'
			process.env.MONGO_USER = 'u'
			process.env.MONGO_PASSWORD = 'p'
			process.env.REDIS_STATE_RECORDS_COUNT = '5'

			const fakeClient = { connect: jest.fn(), close: jest.fn(), db: jest.fn() }
			MongoClient.mockImplementation(() => fakeClient)

			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			// Spy on helper calls to avoid running the real loop
			service.startStateLoop = jest.fn()
			service.mongoConnect = jest.fn().mockResolvedValue()

			await Mixin.started.call(service)

			expect(MongoClient).toHaveBeenCalledWith(
				'mongodb://u:p@host1:27018,host2:27018/?maxPoolSize=500',
				{ useNewUrlParser: true, useUnifiedTopology: true }
			)
			expect(service.settings.client).toBe(fakeClient)
			expect(service.mongoConnect).toHaveBeenCalled()
			expect(service.startStateLoop).toHaveBeenCalled()
		})
	})

	describe('methods: startStateLoop', () => {
		it('waits for service, creates indexes, runs one loop tick, then disconnects', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			service.createIndexes = jest.fn().mockResolvedValue()
			service.stateLoop = jest.fn().mockResolvedValue()
			service.mongoDisconnect = jest.fn().mockResolvedValue()

			await Mixin.methods.startStateLoop.call(service)

			expect(service.broker.waitForServices).toHaveBeenCalledWith([service.name])
			expect(service.createIndexes).toHaveBeenCalled()
			expect(service.stateLoop).toHaveBeenCalledTimes(1)
			expect(service.mongoDisconnect).toHaveBeenCalled()
			expect(timers.setInterval).toHaveBeenCalledWith(1000, expect.any(Number))
		})
	})

	describe('methods: stateLoop', () => {
		it('processes buckets, calls stateProcess, and sends channel events per record', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const buckets = [
				'state.service:orders:upsert:full',
				'state.service:leads:delete:full'
			]
			const valuesForOrders = [
				{ recid: '1', a: 1 },
				{ recid: '2', a: 2 }
			]
			service.broker.call.mockImplementation(async (action, params) => {
				if (action === 'state.service.search') return buckets
				if (action === 'state.service.takeValues') {
					return params.bucket.includes(':orders:') ? valuesForOrders : []
				}
				return undefined
			})

			await Mixin.methods.stateLoop.call(service)

			// took buckets
			expect(service.broker.call).toHaveBeenCalledWith('state.service.search', { pattern: 'state.service:*' })
			// processed orders
			expect(service.broker.call).toHaveBeenCalledWith('state.service.stateProcess', {
				table_name: 'orders',
				records: valuesForOrders,
				action: 'upsert',
				importType: 'full'
			})
			// for leads bucket no values -> no stateProcess call
			expect(service.broker.call).not.toHaveBeenCalledWith('state.service.stateProcess', expect.objectContaining({ table_name: 'leads' }))
		})
	})

	describe('methods: applyMessages', () => {
		it('upserts CRM table with crm_status and attempts fields', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const createIndex = jest.fn()
			const bulkWrite = jest.fn().mockResolvedValue()
			service.settings.db = {
				collection: jest.fn(() => ({ createIndex, bulkWrite }))
			}
			const records = [
				{ _id: 'x', created_at: 'y', recid: 'r1', foo: 1 },
				{ recid: 'r2', bar: 2 }
			]

			await Mixin.methods.applyMessages.call(service, 'crm_customers', records, 'upsert')

			expect(service.settings.db.collection).toHaveBeenCalledWith('crm_customers')
			expect(createIndex).toHaveBeenCalledWith({ recid: 1 }, { unique: true })
			expect(bulkWrite).toHaveBeenCalled()
			const ops = bulkWrite.mock.calls[0][0]
			expect(ops).toHaveLength(2)
			for (const op of ops) {
				expect(op.updateOne.filter).toEqual({ recid: expect.any(String) })
				expect(op.updateOne.update.$set).toEqual(expect.objectContaining({
					crm_status: 'ready',
					attempts: 0
				}))
				expect(op.updateOne.update.$set.updated_at).toBeInstanceOf(Date)
				expect(op.updateOne.update.$setOnInsert.created_at).toBeInstanceOf(Date)
				expect(op.updateOne.upsert).toBe(true)
			}
		})

		it('marks records to be deleted for delete action', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const bulkWrite = jest.fn().mockResolvedValue()
			const createIndex = jest.fn()
			service.settings.db = {
				collection: jest.fn(() => ({ createIndex, bulkWrite }))
			}
			const records = [{ recid: 'r1' }]

			await Mixin.methods.applyMessages.call(service, 'other_table', records, 'delete')

			const ops = bulkWrite.mock.calls[0][0]
			expect(ops[0].updateOne.update.$set).toEqual({ to_be_deleted: true })
		})
	})

	describe('actions and CRUD helpers', () => {
		it('actions.stateProcess logs and calls applyMessages', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			service.applyMessages = jest.fn().mockResolvedValue()
			const ctx = {
				action: { name: 'stateProcess' },
				params: { table_name: 't', records: [{ recid: '1' }], action: 'upsert' }
			}

			await Mixin.actions.stateProcess.call(service, ctx)
			expect(service.applyMessages).toHaveBeenCalledWith('t', [{ recid: '1' }], 'upsert')
			expect(service.logger.info).toHaveBeenCalled()
		})

		it('deleteAllRecords calls deleteMany on lowercase collection', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const deleteMany = jest.fn().mockResolvedValue()
			service.settings.db = { collection: jest.fn(() => ({ deleteMany })) }

			await Mixin.methods.deleteAllRecords.call(service, 'SomeTable')

			expect(service.settings.db.collection).toHaveBeenCalledWith('sometable')
			expect(deleteMany).toHaveBeenCalled()
		})

		it('updateRecords calls updateMany and returns its result', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 })
			service.settings.db = { collection: jest.fn(() => ({ updateMany })) }

			const res = await Mixin.methods.updateRecords.call(service, 'tbl', { a: 1 }, { $set: { b: 2 } })
			expect(res).toEqual({ modifiedCount: 2 })
		})

		it('getRecords aggregates and returns toArray output', async () => {
			const Mixin = loadMixinWithMockedCrm()
			const service = makeService()
			const toArray = jest.fn().mockResolvedValue([{ x: 1 }])
			const aggregate = jest.fn(() => ({ toArray }))
			service.settings.db = { collection: jest.fn(() => ({ aggregate })) }

			const res = await Mixin.methods.getRecords.call(service, 'tbl', [{ $match: {} }])
			expect(res).toEqual([{ x: 1 }])
			expect(aggregate).toHaveBeenCalledWith([{ $match: {} }])
		})
	})
})


