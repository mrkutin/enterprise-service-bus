'use strict'

jest.mock('axios', () => ({ post: jest.fn() }))
const axios = require('axios')

process.env.CRM_CLIENTS_TABLE_NAME = 'crm-clients'
process.env.CRM_HOST = 'https://crm.local'
process.env.CRM_LOGIN_ENDPOINT = '/login'
process.env.CRM_LOGOUT_ENDPOINT = '/logout'

const ServiceSchema = require('../../../services/crm.service')

describe('crm service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'crm',
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			updateRecords: jest.fn(),
			getRecords: jest.fn(),
			// Bind methods to service context when delegating to schema
			split: function(arr, size) { return ServiceSchema.methods.split.call(this, arr, size) },
			openSession: function() { return ServiceSchema.methods.openSession.call(this) },
			upload: function(tableName, cookies, csrf, records, url) { return ServiceSchema.methods.upload.call(this, tableName, cookies, csrf, records, url) },
			closeSession: function(cookies, csrf) { return ServiceSchema.methods.closeSession.call(this, cookies, csrf) }
		}
		jest.clearAllMocks()
	})

	describe('method: split', () => {
		it('groups array into chunks of given size', () => {
			const res = service.split([1,2,3,4,5], 2)
			expect(res).toEqual([[1,2],[3,4],[5]])
		})
	})

	describe('action: crmProcess', () => {
		it('successfully uploads and updates records, then forces clients update', async () => {
			const records = [
				{ recid: 1, account_code: 'AC-1' },
				{ recid: 2, account_code: 'AC-2' }
			]
			const ctx = {
				action: { name: 'crm.crmProcess' },
				params: {
					tableName: 'crm-jobs',
					sendUrl: 'https://crm.local/endpoint',
					records,
					accountCodesMapping: (recs) => recs.map(r => r.account_code)
				}
			}

			const cookies = ['sid=1']
			const csrf = ['BPMCSRF', 'token']
			service.openSession = jest.fn().mockResolvedValue({ cookies, crmCsrfHeaderArray: csrf })
			service.upload = jest.fn().mockResolvedValue(cookies)
			service.closeSession = jest.fn().mockResolvedValue()

			await ServiceSchema.actions.crmProcess.handler.call(service, ctx)

			// First update to pending
			expect(service.updateRecords).toHaveBeenNthCalledWith(
				1,
				'crm-jobs',
				{ recid: { $in: [1, 2] } },
				{ $inc: { attempts: 1 }, $set: expect.objectContaining({ crm_status: 'pending', updated_at: expect.any(Date) }) }
			)
			// Session + upload + close
			expect(service.openSession).toHaveBeenCalledTimes(1)
			expect(service.upload).toHaveBeenCalledWith('crm-jobs', cookies, csrf, records, 'https://crm.local/endpoint')
			expect(service.closeSession).toHaveBeenCalledTimes(1)
			// Success update
			expect(service.updateRecords).toHaveBeenNthCalledWith(
				2,
				'crm-jobs',
				{ recid: { $in: [1, 2] } },
				{ $set: expect.objectContaining({ crm_status: 'success', attempts: 1, sent_to_crm: expect.any(Date), updated_at: expect.any(Date) }) }
			)
			// Forced clients update
			expect(service.updateRecords).toHaveBeenNthCalledWith(
				3,
				process.env.CRM_CLIENTS_TABLE_NAME,
				{
					account_code: { $in: ['AC-1','AC-2'] },
					'ax_identificators.channel_code': { $nin: ['000000001', '000000008'] }
				},
				{ $set: expect.objectContaining({ forced: true, crm_status: 'ready', attempts: 0, updated_at: expect.any(Date) }) }
			)
		})

		it('logs and continues on 504 timeout without throwing', async () => {
			const records = [{ recid: 1 }]
			const ctx = { action: { name: 'crm.crmProcess' }, params: { tableName: 't', sendUrl: 'u', records } }
			service.openSession = jest.fn().mockResolvedValue({ cookies: ['sid=1'], crmCsrfHeaderArray: ['BPMCSRF','t'] })
			service.upload = jest.fn().mockRejectedValue({ code: 504 })
			service.closeSession = jest.fn().mockResolvedValue()

			await expect(ServiceSchema.actions.crmProcess.handler.call(service, ctx)).resolves.toBeUndefined()
			expect(service.logger.error).toHaveBeenCalled()
			expect(service.closeSession).toHaveBeenCalled()
			// Success update still happens
			expect(service.updateRecords).toHaveBeenCalledWith(
				't',
				{ recid: { $in: [1] } },
				{ $set: expect.objectContaining({ crm_status: 'success' }) }
			)
		})

		it('closes session and throws on generic error', async () => {
			const records = [{ recid: 1 }]
			const ctx = { action: { name: 'crm.crmProcess' }, params: { tableName: 't', sendUrl: 'u', records } }
			service.openSession = jest.fn().mockResolvedValue({ cookies: ['sid=1'], crmCsrfHeaderArray: ['BPMCSRF','t'] })
			service.upload = jest.fn().mockRejectedValue(new Error('boom'))
			service.closeSession = jest.fn().mockResolvedValue()

			await expect(ServiceSchema.actions.crmProcess.handler.call(service, ctx)).rejects.toHaveProperty('name', 'MoleculerServerError')
			expect(service.closeSession).toHaveBeenCalled()
			// No success update after error
			const calls = service.updateRecords.mock.calls
			expect(calls.some((c) => c[0] === 't' && c[2]?.$set?.crm_status === 'success')).toBe(false)
		})
	})

	describe('methods: session/upload', () => {
		it('openSession parses cookies and CSRF header', async () => {
			axios.post.mockResolvedValueOnce({
				status: 200,
				data: { Code: 0 },
				headers: { 'set-cookie': ['BPMCSRF=xyz; Path=/', 'sid=abc; Path=/'] }
			})

			const res = await service.openSession()
			expect(res.cookies).toEqual(['BPMCSRF=xyz', 'sid=abc'])
			expect(res.crmCsrfHeaderArray).toEqual(['BPMCSRF', 'xyz'])
		})

		it('upload posts with headers and returns updated cookies', async () => {
			axios.post.mockResolvedValueOnce({
				data: { success: true, created: 1, updated: 0 },
				headers: { 'set-cookie': ['sid=new1; Path=/', 'other=val; Path=/'] }
			})
			const cookies = ['sid=old']
			const csrf = ['BPMCSRF', 'xyz']
			const returned = await service.upload('crm-jobs', cookies, csrf, [{ recid: 1 }], 'https://crm.local/post')

			expect(axios.post).toHaveBeenCalledWith(
				'https://crm.local/post',
				[{ recid: 1 }],
				{ withCredentials: true, headers: expect.objectContaining({ Cookie: 'sid=old', BPMCSRF: 'xyz' }) }
			)
			expect(returned[0]).toBe('sid=new1other=val')
			expect(service.logger.info).toHaveBeenCalled()
		})

		it('closeSession posts logout with headers', async () => {
			axios.post.mockResolvedValueOnce({ status: 200, statusText: 'OK' })
			await service.closeSession(['sid=abc'], ['BPMCSRF','xyz'])
			expect(axios.post).toHaveBeenCalledWith(
				process.env.CRM_HOST + process.env.CRM_LOGOUT_ENDPOINT,
				{},
				{ headers: { BPMCSRF: 'xyz', Cookie: 'sid=abc' } }
			)
		})
	})
})


