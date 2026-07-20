process.env.REDIS_ONE_C_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT = '100'
process.env.ONE_C_INCOMING_ORDERS_TABLE_NAME = 'one-c-incoming-orders'
process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME = 'crm-one-c-incoming-orders'

const ServiceSchema = require('../../../services/one-c-incoming.orders.generator.service')

describe('one-c-incoming.orders.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'one-c-incoming.orders.generator',
			settings: {
				nativeTableName: process.env.ONE_C_INCOMING_ORDERS_TABLE_NAME,
				crmTableName: process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME,
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
				recid: 'R-1',
				год: '2025',
				номер: '1001',
				суммадокумента: 123.45,
				суммавключаетндс: true,
				договорконтрагента: { IDAX: 777 },
				договорконтрагентаканалкод: '000000006',
				статус: 1,
				товары: [
					{ НомерСтроки: 1, КодSKU: 'IT1', Количество: 2, ЕдиницаИзмерения: 'pcs', ЦенаБезНДС: 10, ЦенаСНДС: 12.2, СуммаСНДС: 24.4, СуммаБезНДС: 20, СтавкаНДС: 12.2 },
					{ НомерСтроки: 2, КодSKU: 'IT2', Количество: 1, ЕдиницаИзмерения: 'pcs', ЦенаБезНДС: 5, ЦенаСНДС: 6.1, СуммаСНДС: 6.1, СуммаБезНДС: 5, СтавкаНДС: 10 }
				],
				ответственный: { _name: 'Ivan' },
				датасозданиядокумента: new Date('2025-05-01T00:00:00.000Z'),
				crocaxaptamodifieddate: new Date('2025-05-02T00:00:00.000Z'),
				контрагент: { IDAX: 111 },
				accountDirpartytable: { custaccount: 'ACCT1' },
				consigneeDirpartytable: null,
				extcode_kz: { exagreementnum: 55 },
				extcode_pik: { exagreementnum: 66 }
			}

			let capturedPipeline
			service.settings.db = {
				collection: () => ({ aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return makeCursor([native]) }) })
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'one-c-incoming.orders.generator.generatorProcess'},
				params: {keys: ['R-1']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toMatchObject({ $match: { recid: { $in: ['R-1'] } } })

			// Native send uses recidMapper result
			const nativeSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`)
			expect(nativeSend).toBeTruthy()
			expect(nativeSend[1]).toMatchObject({ recid: 'R-1' })
			expect(nativeSend[2]).toEqual({ key: 'R-1' })

			// CRM send
			const crmSend = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`)
			expect(crmSend).toBeTruthy()
			const crmPayload = crmSend[1]
			expect(crmPayload).toMatchObject({
				recid: 'R-1',
				account_code: 'ACCT1',
				consignee_code: 'ACCT1',
				consolidated_number: '2025-1001',
				start_amount: 123.45,
				amount: 123.45,
				amount_without_vat: 25,
				is_tax_price: true,
				contract_number: '777',
				channel_code: '000000006',
				number: '2025-1001-ACCT1',
				axapta_status_code: native.статус ? native.статус.toString() : expect.any(String),
				axapta_createdby: 'Ivan',
				axapta_created_date: native.датасозданиядокумента,
				axapta_modified_date: native.crocaxaptamodifieddate,
				gak: 111,
				company: 'PSV',
				is_1c_order: true,
				agreementiid_kz: '55',
				agreementid_pik: '66'
			})
			expect(Array.isArray(crmPayload.product_details)).toBe(true)
			expect(crmPayload.product_details).toHaveLength(2)
			const pd0 = crmPayload.product_details[0]
			expect(pd0).toMatchObject({
				rec_id: '1',
				string_pos: 1,
				item_code: 'IT1',
				quantity: 2,
				unit: 'pcs',
				price: 10,
				vat_price: 12.2,
				total_amount: 24.4,
				total_amount_without_vat: 20,
				tax_rate: 12.2
			})
			expect(crmSend[2]).toEqual({ key: 'R-1' })
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
			const handler = ServiceSchema.channels['channel.one-c-incoming.orders.recid.transformed'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'channel.one-c-incoming.orders.recid.transformed', params: { recid: 'R-9' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: 'R-9' }
			)
		})

		it('native topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: 'N1', any: 1 }
			await handler.call(service, { channelName: topicName, params: record })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.ONE_C_INCOMING_ORDERS_TABLE_NAME}:insert`, key: 'N1', value: record }
			)
		})

		it('CRM topic calls putKeyValue with insert bucket', async () => {
			const topicName = `${process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: 'C1', any: 2 }
			await handler.call(service, { channelName: topicName, params: record })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME}:insert`, key: 'C1', value: record }
			)
		})
	})
})


