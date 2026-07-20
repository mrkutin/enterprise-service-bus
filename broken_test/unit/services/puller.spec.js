const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/puller.service')
const sql = require('mssql')
const ChannelsMiddleware = require('@moleculer/channels').Middleware
const Mixin = require('../../../mixins/mongo.mixin')
describe('Test \'puller\' service', () => {
	Mixin.created = jest.fn()
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

	const originalImportTable = service.import_table
	const originalPullStoredProc = service.pullStoredProc
	const originalCreateCustomer = service.createCustomer
	const originalSendConfirmation = service.sendConfirmation
	const originalPush = service.push
	const originalNormalize = service.normalize

	broker.waitForServices = jest.fn()

	describe('Lifecycle hooks', () => {
		it('loop should run import_table method', async () => {
			service.import_table = jest.fn()

			await service.loop(['test_table'])
			expect(service.import_table).toHaveBeenCalled()

			service.import_table = originalImportTable
		})
	})

	describe('\'puller\' methods', () => {
		it('import_table method test', async () => {
			// method must use 'pullStoredProc' and 'push' methods

			service.pullStoredProc = jest.fn(() => ['testMessage'])
			service.push = jest.fn()

			await service.import_table({
				table_name: 'testTable'
			})

			expect(service.push).toBeCalledTimes(1)
			expect(service.push).toBeCalledWith({table_name: 'testTable'}, ['testMessage'])

			service.pullStoredProc = originalPullStoredProc
			service.push = originalPush
		})

		it('\'pullStoredProc\' method test', async () => {
			sql.connect = jest.fn(() => ({
				request: () => ({
					input: () => ({
						input: () => ({
							execute: () => new Promise((resolve) => resolve({
								recordset: 'testRecordset'
							}))
						})
					})
				})
			}))

			const res = await service.pullStoredProc('testProcedure', 'testConsumer')
			expect(res).toEqual('testRecordset')
		})

		it('\'createCustomer\' method test', async () => {
			sql.connect = jest.fn(() => ({
				request: () => ({
					input: () => ({
						input: () => ({
							input: () => ({
								input: () => ({
									input: () => ({
										input: () => ({
											execute: () => new Promise((resolve) => resolve({
												recordset: 'testRecordset'
											}))
										})
									})
								})
							})
						})
					})
				})
			}))

			await service.createCustomer()
			expect(sql.connect).toHaveBeenCalled()
		})

		it('\'sendConfirmation\' method test', async () => {
			sql.connect = jest.fn(() => ({
				request: () => ({
					input: () => ({
						input: () => ({
							input: () => ({
								execute: () => new Promise((resolve) => resolve({
									recordset: 'testRecordset'
								}))
							})
						})
					})
				})
			}))

			await service.sendConfirmation()
			expect(sql.connect).toHaveBeenCalled()
		})

		it('\'push\' method test', async () => {
			service.normalize = jest.fn(() => ({
				normalizedRecordKey: 'normalizedRecordValue',
				recid: 'normalizedRecordRecid'
			}))

			service.sendConfirmation = jest.fn()
			broker.sendToChannel = jest.fn()

			await service.push({
				confirm_procedure: 'testConfirmProcedure',
				ax_consumer_id: 'testConsumerId',
				table_name: 'testTable'
			}, [{
				EventType: 0,
				EventRecId: 'testRecid',
				testKey: 'testValue'
			}])

			expect(service.normalize).toHaveBeenCalledTimes(1)
			expect(service.normalize).toHaveBeenCalledWith({testKey: 'testValue'})

			expect(broker.sendToChannel).toHaveBeenCalledTimes(1)
			expect(broker.sendToChannel).toHaveBeenCalledWith(
				'message.puller.received',
				{
					action: 'insert',
					record: {
						normalizedRecordKey: 'normalizedRecordValue',
						recid: 'normalizedRecordRecid'
					},
					shardKey: 'normalizedRecordRecid',
					table_name: 'testtable'
				}, {'xaddMaxLen': '~250000'}
			)

			expect(service.sendConfirmation).toHaveBeenCalledTimes(1)
			expect(service.sendConfirmation).toHaveBeenCalledWith('testConfirmProcedure', 'testRecid')

			service.sendConfirmation = originalSendConfirmation
			service.normalize = originalNormalize
		})

		it('\'normalize\' method test', async () => {
			const res = await service.normalize({
				testRecid: '123',
				testPrice: '100.52'
			})

			expect(res).toStrictEqual({
				testprice: 100.52,
				testrecid: 123,
			})
		})
	})

	describe('\'puller\' channels', () => {
		it('\'cust-table.request\' channel must use \'createCustomer\' method', async () => {
			service.createCustomer = jest.fn()

			await service.emitLocalChannelHandler('cust-table.request', {
				params: {
					inn: 'testInn',
					kpp: 'testKpp',
					channelid: 'testChannelid',
					custvendsource: 'testCustvendsource',
					custvendtype: 'testCustvendtype'
				}
			})

			expect(service.createCustomer).toBeCalledTimes(1)
			expect(service.createCustomer).toHaveBeenCalledWith(
				'PSV_SP_SysExchCustTableInsert_DirectSQL',
				'psv',
				'testInn',
				'testKpp',
				'testChannelid',
				'testCustvendsource',
				'testCustvendtype'
			)

			service.createCustomer = originalCreateCustomer
		})
	})
})
