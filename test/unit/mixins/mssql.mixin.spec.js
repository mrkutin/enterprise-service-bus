'use strict'

jest.mock('mssql', () => {
	const connect = jest.fn()
	// simple tokens to assert against in .input() calls
	const NVarChar = 'NVarChar'
	const Int = 'Int'
	return { connect, NVarChar, Int }
})

describe('mssql.mixin (unit)', () => {
	const sql = require('mssql')
	const mixinPath = '../../../mixins/mssql.mixin'

	const makeService = () => ({
		settings: {},
		logger: { info: jest.fn(), error: jest.fn() }
	})

	const makePoolWithRequest = (recordset = undefined) => {
		const req = {
			input: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue(recordset !== undefined ? { recordset } : undefined)
		}
		return { pool: { request: jest.fn(() => req) }, req }
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('lifecycle: started', () => {
		it('connects using env config and assigns pool to settings', async () => {
			const prevEnv = {
				server: process.env.MSSQL_SERVER,
				port: process.env.MSSQL_PORT,
				user: process.env.MSSQL_USER,
				password: process.env.MSSQL_PASSWORD,
				database: process.env.MSSQL_DATABASE
			}
			process.env.MSSQL_SERVER = 'my-host'
			process.env.MSSQL_PORT = '1439'
			process.env.MSSQL_USER = 'sa'
			process.env.MSSQL_PASSWORD = 'secret'
			process.env.MSSQL_DATABASE = 'mydb'

			const pool = {}
			sql.connect.mockResolvedValue(pool)

			let Mixin
			jest.isolateModules(() => {
				Mixin = require(mixinPath)
			})

			const service = makeService()
			await Mixin.started.call(service)

			expect(sql.connect).toHaveBeenCalledWith({
				server: 'my-host',
				port: 1439,
				user: 'sa',
				password: 'secret',
				database: 'mydb',
				requestTimeout: 600000,
				pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
				options: { encrypt: false, trustServerCertificate: true }
			})
			expect(service.settings.pool).toBe(pool)

			// restore env
			process.env.MSSQL_SERVER = prevEnv.server
			process.env.MSSQL_PORT = prevEnv.port
			process.env.MSSQL_USER = prevEnv.user
			process.env.MSSQL_PASSWORD = prevEnv.password
			process.env.MSSQL_DATABASE = prevEnv.database
		})
	})

	describe('methods', () => {
		let Mixin
		beforeEach(() => {
			jest.isolateModules(() => {
				Mixin = require(mixinPath)
			})
		})

		it('createCustomer sends correct inputs and executes stored procedure', async () => {
			const { pool, req } = makePoolWithRequest()
			const service = makeService()
			service.settings.pool = pool

			await Mixin.methods.createCustomer.call(
				service,
				'inn123',
				'kpp456',
				'ch1',
				'sourceX',
				'typeY'
			)

			expect(pool.request).toHaveBeenCalled()
			expect(req.input).toHaveBeenNthCalledWith(1, 'DataArea', 'NVarChar', 'psv')
			expect(req.input).toHaveBeenNthCalledWith(2, 'Inn', 'NVarChar', 'inn123')
			expect(req.input).toHaveBeenNthCalledWith(3, 'Kpp', 'NVarChar', 'kpp456')
			expect(req.input).toHaveBeenNthCalledWith(4, 'ChannelId', 'NVarChar', 'ch1')
			expect(req.input).toHaveBeenNthCalledWith(5, 'CustVendSource', 'NVarChar', 'sourceX')
			expect(req.input).toHaveBeenNthCalledWith(6, 'CustVendType', 'NVarChar', 'typeY')
			expect(req.execute).toHaveBeenCalledWith('PSV_SP_SysExchCustTableInsert_DirectSQL')
			expect(service.logger.info).toHaveBeenCalled()
		})

		it('createAgreement sends correct inputs and executes stored procedure', async () => {
			const { pool, req } = makePoolWithRequest()
			const service = makeService()
			service.settings.pool = pool

			await Mixin.methods.createAgreement.call(
				service,
				1, // custvend (Int)
				'P-100',
				'AG-1',
				'Doc Title',
				'2024-01-01',
				'Class-10',
				2 // custvendsource (Int)
			)

			expect(pool.request).toHaveBeenCalled()
			expect(req.input).toHaveBeenNthCalledWith(1, 'DataArea', 'NVarChar', 'psv')
			expect(req.input).toHaveBeenNthCalledWith(2, 'CustVend', 'Int', 1)
			expect(req.input).toHaveBeenNthCalledWith(3, 'PartyNumber', 'NVarChar', 'P-100')
			expect(req.input).toHaveBeenNthCalledWith(4, 'AgreementId', 'NVarChar', 'AG-1')
			expect(req.input).toHaveBeenNthCalledWith(5, 'DocumentTitle', 'NVarChar', 'Doc Title')
			expect(req.input).toHaveBeenNthCalledWith(6, 'AgreementDate', 'NVarChar', '2024-01-01')
			expect(req.input).toHaveBeenNthCalledWith(7, 'ClassificationId', 'NVarChar', 'Class-10')
			expect(req.input).toHaveBeenNthCalledWith(8, 'CustVendSource', 'Int', 2)
			expect(req.execute).toHaveBeenCalledWith('PSV_SP_SysExchAgreementInsert_DirectSQL')
			expect(service.logger.info).toHaveBeenCalled()
		})

		it('getInventEditionBOM returns recordset and uses correct inputs', async () => {
			const expected = [{ x: 1 }]
			const { pool, req } = makePoolWithRequest(expected)
			const service = makeService()
			service.settings.pool = pool

			const res = await Mixin.methods.getInventEditionBOM.call(service, 'I-1', 'E-1')
			expect(res).toEqual(expected)
			expect(pool.request).toHaveBeenCalled()
			expect(req.input).toHaveBeenNthCalledWith(1, 'ItemId', 'NVarChar', 'I-1')
			expect(req.input).toHaveBeenNthCalledWith(2, 'InventEditionId', 'NVarChar', 'E-1')
			expect(req.execute).toHaveBeenCalledWith('PSV_SP_InventEditionBOM_DirectSQL')
		})

		it('getSalesConsigneeLine returns recordset and uses correct inputs', async () => {
			const expected = [{ y: 2 }]
			const { pool, req } = makePoolWithRequest(expected)
			const service = makeService()
			service.settings.pool = pool

			const res = await Mixin.methods.getSalesConsigneeLine.call(service, 'SC-10')
			expect(res).toEqual(expected)
			expect(pool.request).toHaveBeenCalled()
			expect(req.input).toHaveBeenCalledWith('SalesConsigneeCode', 'NVarChar', 'SC-10')
			expect(req.execute).toHaveBeenCalledWith('PSV_SP_SysExchSalesConsigneeLine_DirectSQL')
		})

		it('getSalesInvConsigneeLine returns recordset and uses correct inputs', async () => {
			const expected = [{ z: 3 }]
			const { pool, req } = makePoolWithRequest(expected)
			const service = makeService()
			service.settings.pool = pool

			const res = await Mixin.methods.getSalesInvConsigneeLine.call(service, 'S-123')
			expect(res).toEqual(expected)
			expect(pool.request).toHaveBeenCalled()
			expect(req.input).toHaveBeenCalledWith('SalesId', 'NVarChar', 'S-123')
			expect(req.execute).toHaveBeenCalledWith('PSV_SP_SysExchSalesInvConsigneeLine_DirectSQL')
		})
	})
})


