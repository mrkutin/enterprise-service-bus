process.env.REDIS_ONE_C_REALIZATION_ORDERS_GENERATOR_RECORDS_COUNT = '100'
process.env.ONE_C_REALIZATION_ORDERS_TABLE_NAME = 'one-c-realization-orders'
process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME = 'crm-one-c-realization-orders'

const ServiceSchema = require('../../../services/one-c-realization.orders.generator.service')

describe('one-c-realization.orders.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'one-c-realization.orders.generator',
			settings: {
				nativeTableName: process.env.ONE_C_REALIZATION_ORDERS_TABLE_NAME,
				crmTableName: process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			recidMapper: function(order) { return ServiceSchema.methods.recidMapper.call(this, order) },
			crmMapper: function(nativeRecord) { return ServiceSchema.methods.crmMapper.call(this, nativeRecord) }
		}
	})

	function makeCursor(items) {
		let idx = 0
		return {
			hasNext: async () => idx < items.length,
			next: async () => items[idx++],
			close: async () => {}
		}
	}

	describe('action: generatorProcess', () => {
		it('aggregates, maps native via recidMapper, and maps CRM record', async () => {
			const native = {
				recid: 'RL-1',
				'сделка': { 'Год': '2025', 'Номер': '2002' },
				суммавключаетндс: true,
				услуги: [
					{ НомерСтроки: 1, КодSKU: 'S1', Количество: 2, ЕдиницаИзмерения: 'pcs', ЦенаБезНДС: 10, ЦенаСНДС: 12, СуммаСНДС: 24, СуммаБезНДС: 20 },
					{ НомерСтроки: 2, КодSKU: 'S2', Количество: 1, ЕдиницаИзмерения: 'pcs', ЦенаБезНДС: 5, ЦенаСНДС: 6, СуммаСНДС: 6, СуммаБезНДС: 5 }
				],
				суммадокумента: 30,
				договорконтрагента: { IDAX: 999 },
				договорконтрагентаканалкод: '000000006',
				год: '2025',
				номер: 'A-1',
				счетфактурадата: new Date('2025-05-03T00:00:00.000Z'),
				счетфактураномер: 'INV-1',
				контрагент: { IDAX: 123 },
				'one-c-incoming-orders': { accountDirpartytable: { custaccount: 'ACC-IN' } },
				accountDirpartytable: { custaccount: 'ACC-AC' },
				consigneeDirpartytable: null,
				статус: 3,
				ответственный: { _name: 'Resp' },
				датасоздания: new Date('2025-04-30T00:00:00.000Z'),
				crocaxaptamodifieddate: new Date('2025-05-04T00:00:00.000Z'),
				extcode_kz: { exagreementnum: 77 },
				extcode_pik: { exagreementnum: 88 }
			}

			let capturedPipeline
			service.settings.db = {
				collection: () => ({ aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return makeCursor([native]) }) })
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'one-c-realization.orders.generator.generatorProcess'},
				params: {keys: ['RL-1']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: ['RL-1'] } } })

			// Native send uses recidMapper result
			const nativeSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`)
			expect(nativeSend).toBeTruthy()
			expect(nativeSend[1]).toMatchObject({ recid: 'RL-1' })
			expect(nativeSend[2]).toEqual({ key: 'RL-1' })

			// CRM send payload assertions
			const crmSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`)
			expect(crmSend).toBeTruthy()
			const crmPayload = crmSend[1]
			expect(crmPayload).toMatchObject({
				recid: 'RL-1',
				account_code: 'ACC-AC',
				consignee_code: 'ACC-AC',
				consolidated_number: '2025-2002',
				is_tax_price: true,
				amount_without_vat: 25,
				amount: 30,
				contract_number: '999',
				channel_code: '000000006',
				number: '2025-A-1',
				invoice_date: native.счетфактурадата,
				invoice_number: 'INV-1',
				act_number: 'A-1',
				order_number: '2025-2002-ACC-IN',
				axapta_status_code: '3',
				axapta_createdby: 'Resp',
				axapta_created_date: native.датасоздания,
				axapta_modified_date: native.crocaxaptamodifieddate,
				gak: 123,
				company: 'PSV',
				is_1c_order: true,
				agreementiid_kz: '77',
				agreementid_pik: '88'
			})
			expect(Array.isArray(crmPayload.product_details)).toBe(true)
			expect(crmPayload.product_details).toHaveLength(2)
			expect(crmSend[2]).toEqual({ key: 'RL-1' })
		})
	})

	describe('method: recidMapper', () => {
		it('removes _id and created_at fields', () => {
			const rec = { _id: 1, created_at: new Date(), recid: 'X', foo: 'bar' }
			const mapped = service.recidMapper(rec)
			expect(mapped).toEqual({ recid: 'X', foo: 'bar' })
		})
	})

	describe('channels handlers', () => {
		it('recid.transformed channel puts key into bucket', async () => {
			const handler = ServiceSchema.channels['channel.one-c-realization.orders.recid.transformed'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'channel.one-c-realization.orders.recid.transformed', params: { recid: 'R-9' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: 'R-9' }
			)
		})

		it('native topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: 'N1', any: 1 }
			await handler.call(service, { channelName: topicName, params: record })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.ONE_C_REALIZATION_ORDERS_TABLE_NAME}:insert`, key: 'N1', value: record }
			)
		})

		it('CRM topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: 'C1', any: 2 }
			await handler.call(service, { channelName: topicName, params: record })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME}:insert`, key: 'C1', value: record }
			)
		})
	})
})


