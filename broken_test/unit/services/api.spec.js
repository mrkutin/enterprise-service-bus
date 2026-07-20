const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/api.service')
const axios = require('axios')

describe('Test \'api\' service', () => {
	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestService)

	const originalPwdAuthorize = service.pwdAuthorize
	service.pwdAuthorize = jest.fn()

	service.settings.CONSUMERS_TOKENS = {}
	service.settings.PRODUCERS_TOKENS = {}

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	describe('Lifecycle hooks', () => {
		it('started should run pwdAuthorize method', async () => {
			service.pwdAuthorize = jest.fn()

			await broker.stop()
			await broker.start()

			expect(service.pwdAuthorize).toBeCalledTimes(1)
		})
	})

	describe('\'api\' methods', () => {
		it('\'authorize\' method', async () => {
			service.settings.CONSUMERS_TOKENS['testToken'] = 1

			const res = await service.authorize('testCtx', 'testRoute', {
				headers: {
					authorization: 'Bearer testToken'
				},
				method: 'GET'
			})

			expect(res).toStrictEqual('testCtx')
			service.settings.CONSUMERS_TOKENS = {}
		})

		it('\'pwdLogin\' method', async () => {
			axios.post = jest.fn(() => ({
				status: 200,
				data: {
					data: {
						token: 'testToken'
					}
				}
			}))

			const res = await service.pwdLogin('testCtx', 'testRoute', {
				headers: {
					authorization: 'Bearer testToken'
				},
				method: 'GET'
			})

			expect(res).toStrictEqual('testToken')
		})

		it('\'pwdLogout\' method', async () => {
			axios.post = jest.fn()

			await service.pwdLogout()

			expect(axios.post).toBeCalled()
		})

		it('\'pwdGetPasswordsKeys\' method', async () => {
			axios.get = jest.fn(() => ({
				status: 200,
				data: {
					data: [
						{id: 1}
					]
				}
			}))

			const res = await service.pwdGetPasswordsKeys('someToken', 10)

			expect(res).toEqual([1])
		})

		it('\'pwdGetPasswordValues\' method', async () => {
			axios.get = jest.fn(() => ({
				status: 200,
				data: {
					data: {
						login: 'someLogin',
						cryptedPassword: 'password'
					}
				}
			}))

			const res = await service.pwdGetPasswordValues('someToken', 10)

			expect(res.login).toBe('someLogin')
		})

		it('\'pwdAuthorize\' method', async () => {
			service.pwdAuthorize = originalPwdAuthorize
			service.pwdLogin = jest.fn(() => 'testToken')
			service.pwdLogout = jest.fn()
			service.pwdGetPasswordsKeys = jest.fn(() => ['testKey'])
			service.pwdGetPasswordValues = jest.fn(() => ({
				password: 'testPassword',
				login: 'testLogin'
			}))

			await service.pwdAuthorize()
			expect(service.settings.CONSUMERS_TOKENS).toStrictEqual({testPassword: 'testLogin'})
			expect(service.settings.PRODUCERS_TOKENS).toStrictEqual({testPassword: 'testLogin'})
			service.pwdAuthorize = jest.fn()
		})
	})

	describe('\'api\' actions', () => {
		it('\'ping\' action', async () => {
			const result = await broker.call('api.ping')
			expect(result).toEqual('OK')
		})

		it('\'apply\' action with unknown table_name', async () => {
			broker.sendToChannel = jest.fn()

			await broker.call('api.apply', {
				messages: 'W3sidGFibGUiOiJmaXJzdFRhYmxlIiwiYXhfY29uc3VtZXJfaWQiOjEsInJlY29yZCI6eyJSRUNJRCI6MTIzfX1d'
			})
			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toBeCalledWith(
				'message.api.received',{
					action: 'upsert',
					record: { recid: 123 },
					shardKey: 123,
					table_name: 'firsttable'
				}, {'xaddMaxLen': '~250000'}
			)
		})

		it('\'apply\' action with known table_name', async () => {
			broker.sendToChannel = jest.fn()

			await broker.call('api.apply', {
				messages: 'W3sidGFibGUiOiJzYWxlc2xpbmVjb25zaWduZWUiLCJheF9jb25zdW1lcl9pZCI6MSwicmVjb3JkIjp7IlJFQ0lEIjoxMjN9fV0='
			})
			expect(broker.sendToChannel).toBeCalledTimes(1)
			expect(broker.sendToChannel).toBeCalledWith('message.api.received', {
				'action': 'upsert',
				'record': {'recid': 123},
				'shardKey': 123,
				'table_name': 'saleslineconsignee'
			}, {'xaddMaxLen': '~250000'})
		})
	})
})
