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

describe('transformer.mixin (unit)', () => {
	const timers = require('node:timers/promises')
	const Mixin = require('../../../mixins/transformer.mixin')

	const makeService = () => ({
		name: 'transformer.service',
		settings: {
			recidsToTransformReadCount: '3'
		},
		logger: { info: jest.fn(), error: jest.fn() },
		broker: {
			call: jest.fn(),
			stopping: false
		},
		mongoDisconnect: jest.fn().mockResolvedValue(),
		transformerStartLoop: function(){ return Mixin.methods.transformerStartLoop.call(this) },
		transformerLoop: function(){ return Mixin.methods.transformerLoop.call(this) }
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('lifecycle: started', () => {
		it('invokes transformerStartLoop', () => {
			const service = makeService()
			const spy = jest.spyOn(service, 'transformerStartLoop').mockResolvedValue()
			Mixin.started.call(service)
			expect(spy).toHaveBeenCalled()
		})
	})

	describe('methods: transformerStartLoop', () => {
		it('runs one interval tick and then disconnects', async () => {
			const service = makeService()
			// avoid exercising real loop internals here
			service.transformerLoop = jest.fn().mockResolvedValue()
			await service.transformerStartLoop()
			expect(timers.setInterval).toHaveBeenCalledWith(1000, expect.any(Number))
			expect(service.transformerLoop).toHaveBeenCalled()
			expect(service.mongoDisconnect).toHaveBeenCalled()
		})
	})

	describe('methods: transformerLoop', () => {
		it('calls process with parsed numeric recids when keys present', async () => {
			const service = makeService()
			service.broker.call.mockImplementation(async (action, params) => {
				if (action === 'transformer.service.search') return ['transformer.service:orders']
				if (action === 'transformer.service.takeKeys') return ['1', 'x2', '03']
				return undefined
			})

			await service.transformerLoop()

			expect(service.broker.call).toHaveBeenCalledWith(
				'transformer.service.search',
				{ pattern: 'transformer.service:*' }
			)
			expect(service.broker.call).toHaveBeenCalledWith(
				'transformer.service.takeKeys',
				{ bucket: 'transformer.service:orders', limit: 3 }
			)
			expect(service.broker.call).toHaveBeenCalledWith(
				'transformer.service.process',
				{ table_name: 'orders', recids: [1, 'x2', 3] }
			)
		})

		it('does not call process when no keys returned', async () => {
			const service = makeService()
			service.broker.call.mockImplementation(async (action) => {
				if (action === 'transformer.service.search') return ['transformer.service:orders']
				if (action === 'transformer.service.takeKeys') return []
				return undefined
			})

			await service.transformerLoop()

			expect(service.broker.call).toHaveBeenCalledWith(
				'transformer.service.takeKeys',
				{ bucket: 'transformer.service:orders', limit: 3 }
			)
			expect(service.broker.call).not.toHaveBeenCalledWith(
				'transformer.service.process',
				expect.any(Object)
			)
		})
	})
})


