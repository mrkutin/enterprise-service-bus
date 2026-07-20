'use strict'

const Mixin = require('../../../mixins/accumulator.mixin')

describe('accumulator.mixin (unit)', () => {
	let service, redis, multi

	beforeEach(() => {
		multi = {
			sadd: jest.fn().mockReturnThis(),
			rpush: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue()
		}
		redis = {
			keys: jest.fn(async () => ['a','b']),
			sadd: jest.fn(async () => 1),
			multi: jest.fn(() => multi),
			spop: jest.fn(),
			lpop: jest.fn(),
			getdel: jest.fn()
		}
		service = {
			name: 'accumulator.mixin',
			settings: { redis }
		}
		jest.clearAllMocks()
	})

	describe('basic actions', () => {
		it('search calls redis.keys with pattern', async () => {
			const res = await Mixin.actions.search.handler.call(service, { params: { pattern: 'x:*' } })
			expect(redis.keys).toHaveBeenCalledWith('x:*')
			expect(res).toEqual(['a','b'])
		})

		it('putKey uses sadd with bucket and key stringified', async () => {
			await Mixin.actions.putKey.handler.call(service, { params: { bucket: 'bkt', key: 42 } })
			expect(redis.sadd).toHaveBeenCalledWith('bkt', '42')
		})

		it('putKeyValue chains sadd+set via multi and exec', async () => {
			await Mixin.actions.putKeyValue.handler.call(service, { params: { bucket: 'b', key: 'k', value: { foo: 1 } } })
			expect(redis.multi).toHaveBeenCalled()
			expect(multi.sadd).toHaveBeenCalledWith('b', 'key:b:k')
			expect(multi.set).toHaveBeenCalledWith('key:b:k', JSON.stringify({ foo: 1 }))
			expect(multi.exec).toHaveBeenCalled()
		})

		it('putFifoKeyValue chains rpush+set via multi and exec', async () => {
			await Mixin.actions.putFifoKeyValue.handler.call(service, { params: { bucket: 'b', key: 'k', value: { foo: 2 } } })
			expect(redis.multi).toHaveBeenCalled()
			expect(multi.rpush).toHaveBeenCalledWith('b', 'key:b:k')
			expect(multi.set).toHaveBeenCalledWith('key:b:k', JSON.stringify({ foo: 2 }))
			expect(multi.exec).toHaveBeenCalled()
		})
	})

	describe('take actions', () => {
		it('takeValues pops set members, getdel and filters nulls', async () => {
			redis.spop.mockResolvedValueOnce(['key:x:1', 'key:x:2'])
			redis.getdel
				.mockResolvedValueOnce(JSON.stringify({ a: 1 }))
				.mockResolvedValueOnce(null)
			const res = await Mixin.actions.takeValues.handler.call(service, { params: { bucket: 'x', limit: 2 } })
			expect(redis.spop).toHaveBeenCalledWith('x', 2)
			expect(redis.getdel).toHaveBeenCalledWith('key:x:1')
			expect(redis.getdel).toHaveBeenCalledWith('key:x:2')
			expect(res).toEqual([{ a: 1 }])
		})

		it('takeFifoValues lpop list, getdel and filters nulls', async () => {
			redis.lpop.mockResolvedValueOnce(['key:y:1', 'key:y:2'])
			redis.getdel
				.mockResolvedValueOnce(JSON.stringify({ b: 2 }))
				.mockResolvedValueOnce(JSON.stringify({ c: 3 }))
			const res = await Mixin.actions.takeFifoValues.handler.call(service, { params: { bucket: 'y', limit: 2 } })
			expect(redis.lpop).toHaveBeenCalledWith('y', 2)
			expect(res).toEqual([{ b: 2 }, { c: 3 }])
		})

		it('takeValuesUpToSize loops until size reached or set empty', async () => {
			// First spop returns keys sequentially, then null to stop
			redis.spop
				.mockResolvedValueOnce('key:z:1')
				.mockResolvedValueOnce('key:z:2')
				.mockResolvedValueOnce(null)
			// getdel returns JSON strings of varying length
			const v1 = JSON.stringify({ x: 'aa' }) // length 10
			const v2 = JSON.stringify({ y: 'bbbbbbbb' }) // longer
			redis.getdel
				.mockResolvedValueOnce(v1)
				.mockResolvedValueOnce(v2)
			const res = await Mixin.actions.takeValuesUpToSize.handler.call(service, { params: { bucket: 'z', size: v1.length + 1 } })
			expect(redis.spop).toHaveBeenCalledWith('z')
			expect(redis.getdel).toHaveBeenCalledTimes(2)
			expect(res).toEqual([{ x: 'aa' }, { y: 'bbbbbbbb' }])
		})
	})

	describe('takeKeys', () => {
		it('returns spop(bucket, limit)', async () => {
			redis.spop.mockResolvedValueOnce(['K1'])
			const res = await Mixin.actions.takeKeys.handler.call(service, { params: { bucket: 'b', limit: 1 } })
			expect(redis.spop).toHaveBeenCalledWith('b', 1)
			expect(res).toEqual(['K1'])
		})
	})
})

const {ServiceBroker} = require('moleculer')
const {ValidationError} = require('moleculer').Errors
const TestMixin = require('../../../mixins/accumulator.mixin')

const Redis = () => {
	const state = {}
	return {
		keys: pattern => {
			const regex = new RegExp(pattern.replace('*', '(.*?)'), 'gi')
			return Object.keys(state).filter(key => {
				const res = regex.test(key)
				return res
			})
		},
		sadd: (bucket, key) => {
			if (!state[bucket]) {
				state[bucket] = []
			}
			state[bucket].push(key)
			return
		},
		spop: (bucket, limit) => {
			if (limit) {
				const elements = state[bucket].splice(0, limit)
				return elements
			}

			const element = state[bucket].splice(0, 1)[0]
			return element
		},
		set: (key, value) => {
			state[key] = value
			return
		},
		get: key => {
			return state[key]
		},
		getdel: key => {
			const value = state[key]
			delete state[key]
			return value
		},
		multi: () => ({
			sadd: (bucket, key) => {
				if (!state[bucket]) {
					state[bucket] = []
				}
				state[bucket].push(key)
				return {
					set: (key, value) => {
						state[key] = value
						return {
							exec: jest.fn()
						}
					}
				}
			}
		})
	}
}
describe('Test \'accumulator\' actions', () => {
	const broker = new ServiceBroker({logger: false})

	const mockFunction = jest.fn()
	TestMixin.created = mockFunction
	TestMixin.stopped = mockFunction

	const service = broker.createService(TestMixin)
	service.settings.redis = Redis()

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	describe('Test \'key\' actions', () => {
		it('\'putKey\' action should reject with a ValidationError', async () => {
			expect.assertions(1)
			try {
				await broker.call('accumulator.mixin.putKey', {name: 123})
			} catch (err) {
				expect(err).toBeInstanceOf(ValidationError)
			}
		})

		it('\'putKeyValue\' action should reject with a ValidationError', async () => {
			expect.assertions(1)
			try {
				await broker.call('accumulator.mixin.putKeyValue', {name: 123})
			} catch (err) {
				expect(err).toBeInstanceOf(ValidationError)
			}
		})

		it('\'takeKeys\' action should reject with a ValidationError', async () => {
			expect.assertions(1)
			try {
				await broker.call('accumulator.mixin.takeKeys', {name: 123})
			} catch (err) {
				expect(err).toBeInstanceOf(ValidationError)
			}
		})

		it('\'takeValues\' action should reject with a ValidationError', async () => {
			expect.assertions(1)
			try {
				await broker.call('accumulator.mixin.takeValues', {name: 123})
			} catch (err) {
				expect(err).toBeInstanceOf(ValidationError)
			}
		})

		it('key should persist once', async () => {
			await broker.call('accumulator.mixin.putKey', {
				bucket: 'bucket-name',
				key: 'some-key'
			})

			await broker.call('accumulator.mixin.putKey', {
				bucket: 'bucket-name',
				key: 'another-key'
			})

			const res1 = await broker.call('accumulator.mixin.takeKeys', {
				bucket: 'bucket-name',
				limit: 2
			})
			expect(res1).toContain('some-key')
			expect(res1).toContain('another-key')

			const res2 = await broker.call('accumulator.mixin.takeKeys', {
				bucket: 'bucket-name',
				limit: 2
			})
			expect(res2).toHaveLength(0)
		})

		it('key-value should persist once', async () => {
			await broker.call('accumulator.mixin.putKeyValue', {
				bucket: 'bucket-name',
				key: 'some-key',
				value: {a: 'some-value'}
			})

			const res1 = await broker.call('accumulator.mixin.takeValues', {
				bucket: 'bucket-name',
				limit: 2
			})
			expect(res1).toHaveLength(1)
			expect(res1[0]).toMatchObject({a: 'some-value'})

			const res2 = await broker.call('accumulator.mixin.takeValues', {
				bucket: 'bucket-name',
				limit: 2
			})
			expect(res2).toHaveLength(0)
		})

		it('takeValuesUpToSize should return data of desired length', async () => {
			await broker.call('accumulator.mixin.putKeyValue', {
				bucket: 'bucket-name',
				key: 'some-key',
				value: {a: 'some-value'}
			})

			await broker.call('accumulator.mixin.putKeyValue', {
				bucket: 'bucket-name',
				key: 'another-key',
				value: {a: 'another-value'}
			})

			const res1 = await broker.call('accumulator.mixin.takeValuesUpToSize', {
				bucket: 'bucket-name',
				size: 17
			})
			expect(res1).toHaveLength(1)
			expect(res1[0]).toMatchObject({a: 'some-value'})

			const res2 = await broker.call('accumulator.mixin.takeValuesUpToSize', {
				bucket: 'bucket-name',
				size: 17
			})
			expect(res2).toHaveLength(1)
			expect(res2[0]).toMatchObject({a: 'another-value'})
		})

		it('search should find by pattern', async () => {
			await broker.call('accumulator.mixin.putKeyValue', {
				bucket: 'bucket-name',
				key: 'some-key',
				value: {a: 'some-value'}
			})

			await broker.call('accumulator.mixin.putKeyValue', {
				bucket: 'another-bucket-name',
				key: 'another-key',
				value: {a: 'another-value'}
			})

			const res1 = await broker.call('accumulator.mixin.search', {
				pattern: '*key'
			})
			expect(res1).toHaveLength(2)
			expect(res1).toContain('key:bucket-name:some-key')
			expect(res1).toContain('key:another-bucket-name:another-key')
		})
	})
})
