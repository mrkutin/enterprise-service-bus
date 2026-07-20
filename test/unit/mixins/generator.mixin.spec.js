'use strict'

const Mixin = require('../../../mixins/generator.mixin')

describe('generator.mixin (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'foo.generator',
			settings: { recordsCount: '100' },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { call: jest.fn(), stopping: false },
			generatorStartLoop: jest.fn(), // for started() test
			generatorLoop: function() { return Mixin.methods.generatorLoop.call(this) }
		}
		jest.clearAllMocks()
	})

	describe('methods: generatorLoop', () => {
		it('calls takeKeys and triggers generatorProcess when keys present', async () => {
			// First call to takeKeys returns ['1','2']; second (generatorProcess) will be asserted
			service.broker.call
				.mockResolvedValueOnce(['1','2']) // takeKeys
				.mockResolvedValueOnce(undefined) // generatorProcess

			await service.generatorLoop()

			expect(service.broker.call).toHaveBeenNthCalledWith(
				1,
				'foo.generator.takeKeys',
				{ bucket: 'foo.generator', limit: 100 }
			)
			expect(service.broker.call).toHaveBeenNthCalledWith(
				2,
				'foo.generator.generatorProcess',
				{ keys: ['1','2'] }
			)
		})

		it('does not call generatorProcess when no keys returned', async () => {
			service.broker.call.mockResolvedValueOnce([]) // takeKeys
			await service.generatorLoop()

			// Only one call (takeKeys) expected
			expect(service.broker.call).toHaveBeenCalledTimes(1)
			expect(service.broker.call).toHaveBeenCalledWith(
				'foo.generator.takeKeys',
				{ bucket: 'foo.generator', limit: 100 }
			)
		})
	})

	describe('lifecycle: started', () => {
		it('invokes generatorStartLoop', () => {
			Mixin.started.call(service)
			expect(service.generatorStartLoop).toHaveBeenCalled()
		})
	})

	describe('actions: aggregate', () => {
		it('throws when not implemented', async () => {
			await expect(Mixin.actions.aggregate()).rejects.toThrow('Action aggregate must be implemented')
		})
	})
})


