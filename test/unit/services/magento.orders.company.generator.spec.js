process.env.BUS_MAGENTO_ORDERS_COMPANY_GENERATOR_RECORDS_COUNT = '100'
process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME = 'magento-orders-company'

const ServiceSchema = require('../../../services/magento.orders.company.generator.service')

describe('magento.orders.company.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'magento.orders.company.generator',
			settings: {
				mappedRecordTableName: process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			updateRecords: jest.fn(),
			getRecords: jest.fn(),
			createCustomer: jest.fn(),
			createAgreement: jest.fn(),
			applyMessages: jest.fn(),
			recordMapper: function(nativeRecord, dirpartytable, agreement) {
				return ServiceSchema.methods.recordMapper.call(this, nativeRecord, dirpartytable, agreement)
			}
		}
		jest.clearAllMocks()
	})

	function makeCursor(items) {
		let idx = 0
		return {
			hasNext: async () => idx < items.length,
			next: async () => items[idx++],
			close: async () => {}
		}
	}

	it('builds aggregate pipeline and handles CompanyContractIdAX branch', async () => {
		let capturedPipeline
		const rec = {
			recid: 5,
			data: { CompanyContractIdAX: 'AG-1', CompanyINN: '7701', CompanyKPP: '123', OrderId: 'O1', CreatedDateTime: '2025-05-10 10:00:00' },
			number: 999,
			magentoOrderMappedKpp: '123'
		}
		service.settings.db = {
			collection: () => ({
				aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return makeCursor([rec]) })
			})
		}

		await ServiceSchema.actions.generatorProcess.handler.call(service, {
			action: {name: 'magento.orders.company.generator.generatorProcess'},
			params: {keys: ['5']}
		})

		expect(Array.isArray(capturedPipeline)).toBe(true)
		expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: ['5'] }, is_one_c_kafka_send: { $ne: true } } })
		expect(capturedPipeline[1]).toHaveProperty('$addFields')
		expect(service.broker.sendToChannel).toHaveBeenCalledWith(
			`${process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}-topic`,
			expect.objectContaining({ data: rec.data }),
			{ key: '5' }
		)
		expect(service.updateRecords).toHaveBeenCalledWith(
			'magento-order-company-one-c',
			{ recid: 5 },
			expect.objectContaining({ $set: expect.objectContaining({ is_one_c_kafka_send: true, updated_at: expect.any(Date) }) })
		)
	})

	it('when dirpartytable and agreement found, sends dax and mapped records, then updates', async () => {
		const dirparty = { partynumber: 321 }
		const agreement = { agreementid: 'AGR-9' }
		const native = {
			recid: 7,
			number: 123,
			data: { CompanyINN: 'INN', CompanyKPP: 'KPP', OrderId: 'ORD' },
			magentoOrderMappedKpp: 'KPP'
		}
		service.recordMapper = jest.fn((n, d, a) => ({ ...n, mapped: true }))
		service.settings.db = { collection: () => ({ aggregate: jest.fn(() => makeCursor([{ ...native, dirpartytable: dirparty, agreement }])) }) }

		await ServiceSchema.actions.generatorProcess.handler.call(service, {
			action: {name: 'magento.orders.company.generator.generatorProcess'},
			params: {keys: ['7']}
		})

		// dax-company-magento-topic
		const daxCall = service.broker.sendToChannel.mock.calls.find(c => c[0] === 'dax-company-magento-topic')
		expect(daxCall).toBeTruthy()
		expect(daxCall[1]).toMatchObject({
			number: 123,
			event: 'update',
			data: {
				CompanyIdAx: dirparty.partynumber.toString(),
				CompanyContractIdAX: agreement.agreementid,
				CompanyInn: native.data.CompanyINN,
				CompanyKPP: native.magentoOrderMappedKpp,
				OrderId: native.data.OrderId
			}
		})
		expect(daxCall[2]).toEqual({ key: '123' })

		// mapped record topic
		const mappedCall = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}-topic`)
		expect(mappedCall[1]).toMatchObject({ mapped: true })
		expect(mappedCall[2]).toEqual({ key: '7' })
		expect(service.recordMapper).toHaveBeenCalled()
		expect(service.updateRecords).toHaveBeenCalledWith(
			'magento-order-company-one-c',
			{ recid: 7 },
			expect.objectContaining({ $set: expect.objectContaining({ is_one_c_kafka_send: true, updated_at: expect.any(Date) }) })
		)
	})

	it('when dirpartytable missing, calls createCustomer with proper args', async () => {
		const rec = {
			recid: 9,
			data: { CompanyINN: 'INN9', CompanyKPP: null, OrderId: 'ORD9' },
			magentoOrderMappedKpp: ''
		}
		service.settings.db = { collection: () => ({ aggregate: jest.fn(() => makeCursor([rec])) }) }

		await ServiceSchema.actions.generatorProcess.handler.call(service, {
			action: {name: 'magento.orders.company.generator.generatorProcess'},
			params: {keys: ['9']}
		})

		expect(service.createCustomer).toHaveBeenCalledWith('INN9', '', '000000008', 'Интермаг', 'ИП')
	})

	it('when agreement missing, creates agreement request and applies messages', async () => {
		const dirparty = { partynumber: 456 }
		const rec = {
			recid: 11,
			data: { CompanyINN: 'INN11', CompanyKPP: 'K11', CreatedDateTime: '2025-05-12 09:10:11' },
			magentoOrderMappedKpp: 'K11'
		}
		service.getRecords = jest.fn(async () => ([]))
		service.settings.db = { collection: () => ({ aggregate: jest.fn(() => makeCursor([{ ...rec, dirpartytable: dirparty, agreement: null }])) }) }

		await ServiceSchema.actions.generatorProcess.handler.call(service, {
			action: {name: 'magento.orders.company.generator.generatorProcess'},
			params: {keys: ['11']}
		})

		// createAgreement gets specific args (order sensitive by Object.values)
		expect(service.createAgreement).toHaveBeenCalledWith(
			1,
			dirparty.partynumber.toString(),
			'',
			'Договор интернет-магазина',
			'2025-05-12',
			'ИМ_ЮрЛица',
			10
		)
		expect(service.applyMessages).toHaveBeenCalledWith(
			'ax-agreement-sent-requests',
			[expect.objectContaining({
				recid: `${dirparty.partynumber}-ИМ_ЮрЛица`,
				classificationid: 'ИМ_ЮрЛица',
				agreementdate: '2025-05-12'
			})],
			'insert'
		)
	})

	describe('channels', () => {
		it('recid.transformed channel puts key into bucket', async () => {
			const handler = ServiceSchema.channels['channel.magento.orders.company.recid.transformed'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'channel.magento.orders.company.recid.transformed', params: { recid: 'R-1' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: 'R-1' }
			)
		})

		it('mapped topic handler stores with raw key', async () => {
			const topicName = `${process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const raw = { key: Buffer.from('K-5') }
			const record = { recid: 5, any: 'x' }
			await handler.call(service, { channelName: topicName, params: record }, raw)
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}:insert`, key: 'K-5', value: record }
			)
		})
	})
})


