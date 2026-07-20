process.env.KZ_CLIENTS_TABLE_NAME = 'cust-table-response-kz'
process.env.REDIS_STATE_RECORDS_COUNT = '100'

const ServiceSchema = require('../../../services/clients.kz.generator.service')

describe('clients.kz.generator service', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'clients.kz.generator',
			settings: {
				kzTableName: process.env.KZ_CLIENTS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			kzMapper: function(nativeRecord) {
				return ServiceSchema.methods.kzMapper.call(this, nativeRecord)
			}
		}
	})

	describe('action: generatorProcess', () => {
		it('aggregates by recid and sends KZ records to generated topic', async () => {
			const nativeRecord = {
				recid: 101,
				partynumber: 555,
				custaccount: 'C-555',
				inn: '7701234567',
				kpp: '770101001'
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
				collection: () => ({
					aggregate: jest.fn((pipeline) => {
						capturedPipeline = pipeline
						return cursor
					})
				})
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'clients.kz.generator.generatorProcess'},
				params: {keys: ['101']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toHaveProperty('$match')
			expect(capturedPipeline[0].$match.recid.$in).toEqual([101])
			expect(capturedPipeline[1]).toMatchObject({
				$project: {created_at: 0, updated_at: 0, _id: 0}
			})

			const sent = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.KZ_CLIENTS_TABLE_NAME}-generated-topic`)
			expect(sent).toBeTruthy()
			const payload = sent[1]
			expect(payload).toMatchObject({
				recid: `${nativeRecord.partynumber}`,
				custaccount: nativeRecord.custaccount,
				partynumber: `${nativeRecord.partynumber}`,
				inn: nativeRecord.inn,
				kpp: nativeRecord.kpp
			})
			expect(sent[2]).toEqual({key: `${nativeRecord.partynumber}`})
		})
	})

	describe('method: kzMapper', () => {
		it('maps fields correctly', () => {
			const rec = {
				partynumber: 7,
				custaccount: 'C-1',
				inn: '7701234567',
				kpp: '770101001'
			}
			const mapped = service.kzMapper(rec)
			expect(mapped).toEqual({
				recid: '7',
				custaccount: 'C-1',
				partynumber: '7',
				inn: '7701234567',
				kpp: '770101001'
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

		it('generated topic calls putKeyValue with proper bucket', async () => {
			const topicName = `${process.env.KZ_CLIENTS_TABLE_NAME}-generated-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '7', foo: 'bar'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.KZ_CLIENTS_TABLE_NAME}:insert`,
					key: '7',
					value: record
				}
			)
		})
	})
})


