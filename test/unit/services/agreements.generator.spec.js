process.env.CRM_AGREEMENTS_TABLE_NAME = 'crm_agreement'
process.env.BUS_AGREEMENTS_TABLE_NAME = 'bus_agreement'
process.env.REDIS_AGREEMENTS_GENERATOR_RECORDS_COUNT = '100'

const ServiceSchema = require('../../../services/agreements.generator.service')

describe('agreements.generator service', () => {
	// Create a lightweight service-like object without a real broker
	let service
	beforeEach(() => {
		service = {
			name: 'agreements.generator',
			settings: {
				crmTableName: process.env.CRM_AGREEMENTS_TABLE_NAME,
				nativeTableName: process.env.BUS_AGREEMENTS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			getRecords: jest.fn(),
			crmMapper: function(nativeRecord) {
				return ServiceSchema.methods.crmMapper.call(this, nativeRecord)
			}
		}
	})

	describe('action: generatorProcess', () => {
		it('aggregates by recid and sends native and CRM records to channels', async () => {
			const nativeRecord = {
				recid: 101,
				partynumber: 555,
				totalamount: 10,
				totalqty: 2,
				agreementheader: 999,
				agreementid: 'A-1',
				agreementstate: 'ACTIVE',
				channelid: '000000005',
				classificationname: 'Class',
				agreementdt: new Date('2024-01-05T00:00:00.000Z'),
				currency: 'KZT',
				custaccount: 'C-1',
				relationtypewithindividual: 'IND',
				defaultagreementlineeffectivedate: new Date('1900-01-01T00:00:00.000Z'),
				defaultagreementlineexpirationdate: new Date('2024-12-31T00:00:00.000Z'),
				salesdeliverydate: new Date('2024-02-10T00:00:00.000Z'),
				documenttitle: 'Doc',
				paymentschedule: 'Monthly',
				salesdistrictid: 77,
				psv_sourcecompanyidall: 'SRC',
				psv_signstatus: 'SIGNED',
				psv_edodocstatus: 'DELIVERED',
				edotype: 'EDI',
				agreementdate: new Date('1900-01-01T00:00:00.000Z'),
				psv_signdate: new Date('2024-02-01T00:00:00.000Z'),
				psv_responsibleperson: null,
				budgetarticleid: 'BA-1',
				cfrid: 'CFO-1',
				psv_agreementsource: 'ERP',
				documentexternalreference: 'EXT',
				codenamekz: 'KZ',
				codenamepik: 'PIK'
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



			// Invoke original schema action handler directly without broker.start()
			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'agreements.generator.generatorProcess'},
				params: {keys: ['101']}
			})

			// Verify aggregate pipeline
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

			// Verify sendToChannel calls
			expect(service.broker.sendToChannel).toHaveBeenCalledWith(
				`${process.env.BUS_AGREEMENTS_TABLE_NAME}-topic`,
				nativeRecord,
				{key: `${nativeRecord.recid}`}
			)

			const sentCrm = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_AGREEMENTS_TABLE_NAME}-topic`)
			expect(sentCrm).toBeTruthy()
			const crmPayload = sentCrm[1]
			expect(crmPayload).toMatchObject({
				recid: `${nativeRecord.recid}`,
				gak: `${nativeRecord.partynumber}`,
				sales_district_code: `${nativeRecord.salesdistrictid}`,
				default_effective_date: null,
				document_date: null
			})
			expect(sentCrm[2]).toEqual({key: `${nativeRecord.recid}`})
		})
	})

	describe('method: crmMapper', () => {
		it('maps fields and handles sentinel dates and types', async () => {
			const rec = {
				recid: 5,
				partynumber: 7,
				totalamount: 100,
				totalqty: 3,
				agreementheader: 9,
				agreementid: 'AG-9',
				agreementstate: 'STATE',
				channelid: '000000005',
				classificationname: 'CLS',
				agreementdt: new Date('1900-01-01T00:00:00.000Z'),
				currency: 'USD',
				custaccount: 'CUST',
				relationtypewithindividual: 'TYPE',
				defaultagreementlineeffectivedate: new Date('1900-01-01T00:00:00.000Z'),
				defaultagreementlineexpirationdate: new Date('2024-12-30T00:00:00.000Z'),
				salesdeliverydate: new Date('2024-02-02T00:00:00.000Z'),
				documenttitle: 'TTL',
				paymentschedule: 'SCH',
				salesdistrictid: 12,
				psv_sourcecompanyidall: 'SRC',
				psv_signstatus: 'SS',
				psv_edodocstatus: 'DS',
				edotype: 'E',
				agreementdate: new Date('1900-01-01T00:00:00.000Z'),
				psv_signdate: new Date('2024-02-03T00:00:00.000Z'),
				psv_responsibleperson: '',
				budgetarticleid: 'BA',
				cfrid: 'CFR',
				psv_agreementsource: 'SRC',
				documentexternalreference: 'EXT',
				codenamekz: 'KZ',
				codenamepik: 'PIK'
			}

			const mapped = await ServiceSchema.methods.crmMapper.call(service, rec)
			expect(mapped).toMatchObject({
				recid: '5',
				gak: '7',
				number_copies_pcs: 3,
				default_effective_date: null,
				document_date: null,
				end_date: rec.defaultagreementlineexpirationdate,
				delivery_date: rec.salesdeliverydate,
				sales_district_code: '12',
				owner_executor: '',
				is_correct_efu: false,
				agreementiid_kz: 'KZ',
				agreementid_pik: 'PIK'
			})
		})

		it('sets is_correct_efu=true when channelid is 000000006 and dirpartytable exists', async () => {
			service.getRecords = jest.fn(async () => ([{_id: 1}]))
			const rec = {
				recid: 1,
				partynumber: 2,
				agreementheader: 3,
				salesdistrictid: 4,
				custaccount: 'C-2',
				channelid: '000000006'
			}
			const mapped = await ServiceSchema.methods.crmMapper.call(service, rec)
			expect(mapped.is_correct_efu).toBe(true)
		})
	})

	describe('channels handlers', () => {
		it('agreement-topic calls putKey with recid', async () => {
			const handler = ServiceSchema.channels['agreement-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			await handler.call(service, {
				channelName: 'agreement-topic',
				params: {recid: '42'}
			})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{bucket: `${service.name}`, key: '42'}
			)
		})

		it('crm-agreement topic calls putKeyValue with proper bucket', async () => {
			const topicName = `${process.env.CRM_AGREEMENTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '7', foo: 'bar'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.CRM_AGREEMENTS_TABLE_NAME}:insert`,
					key: '7',
					value: record
				}
			)
		})

		it('bus-agreement topic calls putKeyValue with proper bucket', async () => {
			const topicName = `${process.env.BUS_AGREEMENTS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			const record = {recid: '9', baz: 'qux'}
			await handler.call(service, {channelName: topicName, params: record})

			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{
					bucket: `${service.name}:${process.env.BUS_AGREEMENTS_TABLE_NAME}:insert`,
					key: '9',
					value: record
				}
			)
		})
 	})
})


