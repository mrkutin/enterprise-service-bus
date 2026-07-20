'use strict'

const Mixin = require('../../../mixins/kafka.mixin')

describe('kafka.mixin (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'kafka.service',
			settings: {
				kafkaGroupId: 'grp-1',
				kafkaRetryTimeout: 123, // non-default to verify reset
				kafka: {
					consumer: jest.fn(() => ({
						connect: jest.fn().mockResolvedValue(),
						subscribe: jest.fn().mockResolvedValue(),
						run: jest.fn().mockResolvedValue(),
						commitOffsets: jest.fn().mockResolvedValue(),
						seek: jest.fn().mockResolvedValue(),
						pause: jest.fn(),
						resume: jest.fn(),
						disconnect: jest.fn().mockResolvedValue()
					}))
				},
				topicsConfig: { t: { retriesCount: 1 }, a: {}, b: {} },
				consumer: null
			},
			logger: { info: jest.fn(), error: jest.fn() },
			broker: {
				waitForServices: jest.fn().mockResolvedValue(),
				call: jest.fn().mockResolvedValue()
			},
			consumerStart: function() { return Mixin.methods.consumerStart.call(this) },
			consumerErrorHandler: function(error, topic, partition, offset){ return Mixin.methods.consumerErrorHandler.call(this, error, topic, partition, offset) },
			consumerRetryHandler: function(topic){ return Mixin.methods.consumerRetryHandler.call(this, topic) },
			consumerPause: function(topics){ return Mixin.methods.consumerPause.call(this, topics) },
			consumerProcess: jest.fn()
		}
		jest.useFakeTimers()
		jest.clearAllMocks()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	describe('methods: consumerStart', () => {
		it('creates consumer and calls consumerConnectAndRun', async () => {
			await service.consumerStart()
			expect(service.broker.waitForServices).toHaveBeenCalledWith([service.name])
			expect(service.settings.kafka.consumer).toHaveBeenCalledWith({ groupId: service.settings.kafkaGroupId })
			expect(service.broker.call).toHaveBeenCalledWith(`${service.name}.consumerConnectAndRun`)
			expect(service.settings.consumer).toBeTruthy()
		})
	})

	describe('methods: consumerRetryHandler', () => {
		it('increments retriesCount and returns false when below max', () => {
			service.settings.topicsConfig.t.retriesCount = 1
			const res = service.consumerRetryHandler('t')
			expect(res).toBe(false)
			expect(service.settings.topicsConfig.t.retriesCount).toBe(2)
		})
		it('resets retries and returns true when reached max', () => {
			// At boundary before increment, default max = 72
			service.settings.topicsConfig.t.retriesCount = 72
			const res = service.consumerRetryHandler('t')
			expect(res).toBe(true)
			expect(service.settings.topicsConfig.t.retriesCount).toBe(0)
		})
	})

	describe('methods: consumerPause', () => {
		it('pauses topic then resumes after timeout', () => {
			service.settings.consumer = { pause: jest.fn(), resume: jest.fn() }
			service.settings.kafkaRetryTimeout = 100
			service.consumerPause('x')
			expect(service.settings.consumer.pause).toHaveBeenCalledWith([{ topic: 'x' }])
			jest.runOnlyPendingTimers()
			expect(service.settings.consumer.resume).toHaveBeenCalledWith([{ topic: 'x' }])
		})
	})

	describe('actions: consumerConnectAndRun', () => {
		it('connects, subscribes, and handles eachMessage success', async () => {
			// prepare fake consumer with interception of run().eachMessage
			const consumer = service.settings.kafka.consumer()
			service.settings.consumer = consumer
			let eachMessageFn
			consumer.run.mockImplementation(async ({ eachMessage }) => { eachMessageFn = eachMessage })

			// ensure topicsConfig has entry for 't'
			service.settings.topicsConfig = { t: { retriesCount: 5 } }
			service.consumerProcess.mockResolvedValue()

			await Mixin.actions.consumerConnectAndRun.call(service)

			expect(consumer.connect).toHaveBeenCalled()
			expect(consumer.subscribe).toHaveBeenCalledWith({ topics: Object.keys(service.settings.topicsConfig), fromBeginning: true })
			// simulate message
			await eachMessageFn({ topic: 't', partition: 0, message: { offset: '10' } })
			expect(service.consumerProcess).toHaveBeenCalledWith('t', { offset: '10' })
			// offset committed to next
			expect(consumer.commitOffsets).toHaveBeenCalledWith([{ topic: 't', partition: 0, offset: 11 }])
			// retries reset
			expect(service.settings.topicsConfig.t.retriesCount).toBe(0)
		})

		it('on error calls consumerErrorHandler with topic, partition, offset', async () => {
			const consumer = service.settings.kafka.consumer()
			service.settings.consumer = consumer
			let eachMessageFn
			consumer.run.mockImplementation(async ({ eachMessage }) => { eachMessageFn = eachMessage })

			const spyErr = jest.spyOn(service, 'consumerErrorHandler').mockResolvedValue()
			service.consumerProcess.mockRejectedValue(new Error('boom'))
			await Mixin.actions.consumerConnectAndRun.call(service)
			await eachMessageFn({ topic: 't', partition: 1, message: { offset: '5' } })
			expect(spyErr).toHaveBeenCalledWith(expect.any(Error), 't', 1, '5')
		})
	})

	describe('methods: consumerErrorHandler', () => {
		it('seek and pause topic when retries not over', async () => {
			service.settings.consumer = { seek: jest.fn().mockResolvedValue() }
			service.settings.topicsConfig = { a: {}, b: {} }
			jest.spyOn(service, 'consumerRetryHandler').mockReturnValue(false)
			const pauseSpy = jest.spyOn(service, 'consumerPause').mockResolvedValue()
			await service.consumerErrorHandler(new Error('x'), 'a', 0, '7')
			expect(service.settings.consumer.seek).toHaveBeenCalledWith({ topic: 'a', partition: 0, offset: '7' })
			expect(pauseSpy).toHaveBeenCalledWith('a')
		})
	})

	describe('lifecycle', () => {
		it('started calls consumerStart', async () => {
			const spy = jest.spyOn(service, 'consumerStart').mockResolvedValue()
			await Mixin.started.call(service)
			expect(spy).toHaveBeenCalled()
		})
		it('stopped disconnects consumer', async () => {
			const consumer = service.settings.kafka.consumer()
			service.settings.consumer = consumer
			await Mixin.stopped.call(service)
			expect(consumer.disconnect).toHaveBeenCalled()
		})
	})
})


