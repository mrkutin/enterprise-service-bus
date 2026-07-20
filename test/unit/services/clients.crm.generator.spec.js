process.env.CRM_CLIENTS_TABLE_NAME = 'cust-table-response-crm'
process.env.REDIS_STATE_RECORDS_COUNT = '100'

const ServiceSchema = require('../../../services/clients.crm.generator.service')

describe('clients.crm.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'clients.crm.generator',
			settings: {
				crmTableName: process.env.CRM_CLIENTS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			crmMapper: function(nativeRecord) {
				return ServiceSchema.methods.crmMapper.call(this, nativeRecord)
			}
		}
	})

	describe('action: generatorProcess', () => {
		it('aggregates by recid and sends CRM records to channel', async () => {
			const nativeRecord = {
				recid: 101,
				partynumber: 555,
				custaccount: 98765,
				name: 'Acme LLC',
				custsource: 2,
				extpartytype: 'ORG',
				status: 'ACTIVE',
				inn: 1234567890,
				kpp: 123456789,
				dirpartytablemoddt: new Date('2024-01-05T00:00:00.000Z'),
				channelid: '000000005'
			}

			let capturedPipeline
			const cursor = (() => {
				let idx = 0
				const items = [nativeRecord]
				return {
					hasNext: async () => idx < items.length,
					next: async () => items[idx++],
					close: async () => {}
				}
			})()

			service.settings.db = {
				collection: (name) => ({
					aggregate: jest.fn((pipeline) => {
						capturedPipeline = pipeline
						return cursor
					})
				})
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'clients.crm.generator.generatorProcess'},
				params: {keys: ['101']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toHaveProperty('$match')
			expect(capturedPipeline[0].$match.recid.$in).toEqual([101])
			expect(capturedPipeline[1]).toMatchObject({
				$project: {
					created_at: 0,
					updated_at: 0,
					_id: 0
				}
			})

			const sentCrm = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_CLIENTS_TABLE_NAME}-topic`)
			expect(sentCrm).toBeTruthy()
			const crmPayload = sentCrm[1]
			expect(crmPayload).toMatchObject({
				recid: `${nativeRecord.partynumber}`,
				gak: `${nativeRecord.partynumber}`,
				account_code: `${nativeRecord.custaccount}`,
				name: nativeRecord.name,
				source: nativeRecord.custsource,
				type: nativeRecord.extpartytype,
				status: nativeRecord.status,
				inn: `${nativeRecord.inn}`,
				kpp: `${nativeRecord.kpp}`,
				update_date: nativeRecord.dirpartytablemoddt,
				ax_identificators: [
					{
						company_code: 'psv',
						account_number: `${nativeRecord.custaccount}`,
						channel_code: `${nativeRecord.channelid}`
					}
				]
			})
			expect(sentCrm[2]).toEqual({key: `${nativeRecord.partynumber}`})
		})
	})

	describe('method: crmMapper', () => {
		it('maps fields and nested ax_identificators correctly', async () => {
			const rec = {
				partynumber: 7,
				custaccount: 'C-1',
				name: 'Foo',
				custsource: 0,
				extpartytype: 'TYPE',
				status: null,
				inn: '1234567890',
				kpp: '987654321',
				dirpartytablemoddt: null,
				channelid: '000000006'
			}

			const mapped = await ServiceSchema.methods.crmMapper.call(service, rec)
			expect(mapped).toMatchObject({
				recid: '7',
				gak: '7',
				account_code: 'C-1',
				name: 'Foo',
				source: 0,
				type: 'TYPE',
				status: null,
				inn: '1234567890',
				kpp: '987654321',
				update_date: null,
				ax_identificators: [
					{
						company_code: 'psv',
						account_number: 'C-1',
						channel_code: '000000006'
					}
				]
			})
		})
	})

	describe('channels handlers', () => {
		it('dirpartytable-topic calls putKey with recid when custaccount present', async () => {
			const handler = ServiceSchema.channels['dirpartytable-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			await handler.call(service, {
				channelName: 'dirpartytable-topic',
				params: {recid: '42', custaccount: 'ACC123'}
			})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{bucket: `${service.name}`, key: '42'}
			)
		})

		it('CRM topic calls putKeyValue with proper bucket', async () => {
			const topicName = `${process.env.CRM_CLIENTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '7', foo: 'bar'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.CRM_CLIENTS_TABLE_NAME}:upsert`,
					key: '7',
					value: record
				}
			)
		})
	})
})


