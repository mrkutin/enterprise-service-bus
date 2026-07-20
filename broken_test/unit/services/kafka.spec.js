const {ServiceBroker} = require('moleculer')
let {Kafka} = require('kafkajs')
const TestService = require('../../../services/kafka.service')
const ChannelsMiddleware = require('@moleculer/channels').Middleware

describe('Test \'kafka\' service', () => {
	const broker = new ServiceBroker({
		logger: false,
		middlewares: [
			ChannelsMiddleware({
				adapter: {type: 'Fake'}
			})
		]
	})
	const service = broker.createService(TestService)

	global.setTimeout = jest.fn(cb => cb())

	service.settings.kafkaReadTables = [
		'testReadTable'
	]

	describe('Lifecycle hooks', () => {
		it('started should run startLoop method', async () => {
			const originKafkaConnectAndRun = service.kafkaConnectAndRun
			service.kafkaConnectAndRun = jest.fn()

			await broker.start()
			expect(service.kafkaConnectAndRun).toBeCalledTimes(1)

			service.kafkaConnectAndRun = originKafkaConnectAndRun
			broker.stop()
		})
	})

	describe('\'kafka\' channels', () => {
		service.settings.producer = {
			send: jest.fn()
		}

		it('\'one-c-products-price-table.changed\' channel test', async () => {
			await service.emitLocalChannelHandler('one-c-products-price-table.changed', {
				params: {
					record: {
						recid: 'testRecid',
						testKey: 'testValue'
					}
				}
			})

			expect(service.settings.producer.send).toBeCalledTimes(1)
			expect(service.settings.producer.send).toBeCalledWith({
				'messages': [{
					'key': 'testRecid',
					'value': '{"recid":"testRecid","testKey":"testValue"}'
				}],
				'topic': 'one-c-products-price-topic'
			})

			service.settings.producer.send.mockClear()
		})

		it('\'state.applied\' channel test', async () => {
			await service.emitLocalChannelHandler('state.applied', {
				params: {
					table_name: 'testTable',
					record: {
						recid: 'testRecid',
						testKey: 'testValue'
					}
				}
			})

			expect(service.settings.producer.send).toBeCalledTimes(1)
			expect(service.settings.producer.send).toBeCalledWith({
				'messages': [{
					'key': 'testRecid',
					'value': '{"recid":"testRecid","testKey":"testValue"}'
				}],
				'topic': 'testTable-topic'
			})

			service.settings.producer.send.mockClear()
		})

		it('\'cust-table-response-kz\' channel test', async () => {
			await service.emitLocalChannelHandler('cust-table-response-kz', {
				params: {
					record: {
						recid: 'testRecid',
						testKey: 'testValue'
					}
				}
			})

			expect(service.settings.producer.send).toBeCalledTimes(1)
			expect(service.settings.producer.send).toBeCalledWith({
				'messages': [{
					'key': 'testRecid',
					'value': '{"recid":"testRecid"}'
				}],
				'topic': 'cust-table-response-kz-topic'
			})

			service.settings.producer.send.mockClear()
		})
	})

	describe('\'kafka\' methods', () => {
		it('\'isJson\' method test', async () => {
			const res = service.isJson('{"testKey":"testValue"}')
			expect(res).toEqual(true)
		})

		it('\'kafkaConnectAndRun\' method test', async () => {
			const producerConnectMock = jest.fn()
			const consumerConnectMock = jest.fn()
			const consumerSubscribeMock = jest.fn()
			const consumerRunMock = jest.fn()
			const producerMock = jest.fn(() => ({
				connect: producerConnectMock,
			}))
			Kafka.prototype.producer = producerMock

			const consumerMock = jest.fn(() => ({
				connect: consumerConnectMock,
				subscribe: consumerSubscribeMock,
				run: consumerRunMock
			}))
			Kafka.prototype.consumer = consumerMock

			service.settings.kafkaRebalanceTimeout = 0

			await service.kafkaConnectAndRun()

			expect(producerConnectMock).toBeCalledTimes(1)
			expect(consumerConnectMock).toBeCalledTimes(1)
			expect(consumerSubscribeMock).toBeCalledTimes(1)
			expect(consumerRunMock).toBeCalledTimes(1)


		})
	})
})
