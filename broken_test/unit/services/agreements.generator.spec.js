const {ServiceBroker} = require('moleculer')
const TestService = require('../../../services/agreements.generator.service')
const Mixin = require('../../../mixins/generator.mixin')
const ChannelsMiddleware = require('@moleculer/channels').Middleware

const MongoClient = () => {
	const collection = {
		aggregate: jest.fn(() => ({
			toArray: () => new Promise((resolve) => resolve([
				{
					'recid': 'testRecid',
					'partynumber': 'testPartynumber',
					'agreementamount': 'testAmount',
					'agreementheader': 'testHeader',
					'agreementid': 'testId',
					'agreementstate': 'testState',
					'channelid': 'testChannelCode',
					'classificationname': 'testClassification',
					'agreementdt': 'testDate',
					'currency': 'testCurrency',
					'custaccount': 'testCustaccount',
					'relationtypewithindividual': 'testNumber',
					'defaultagreementlineeffectivedate': 'testDate',
					'defaultagreementlineexpirationdate': 'testDate',
					'salesdeliverydate': 'testDate',
					'documenttitle': 'testTitle',
					'paymentschedule': 'testSchedule',
					'salesdistrictid': 'testId',
					'psv_sourcecompanyidall': 'testCompany',
					'psv_signstatus': 'testStatus',
					'psv_edodocstatus': 'testStatus',
					'edotype': 'testType',
					'agreementdate': 'testDate',
					'psv_signdate': 'testDate',
					'psv_responsibleperson': 'testCompany"',
					'budgetarticleid': 'testId',
					'cfrid': 'testId',
					'psv_agreementsource': 'testSource',
					'documentexternalreference': 'testDesc'
				}
			]))
		}))
	}
	const db = {
		collection: () => {
			return collection
		}
	}
	return {
		connect: () => {
			return Promise.resolve
		},
		db: (DB_NAME) => {
			return db
		},
		close: () => {
			return Promise.resolve
		}
	}
}

describe('Test \'agreements.generator\' service', () => {
	Mixin.created = jest.fn()
	Mixin.started = jest.fn()
	Mixin.stopped = jest.fn()
	const broker = new ServiceBroker({
		logger: false,
		middlewares: [
			ChannelsMiddleware({
				adapter: {type: 'Fake'}
			})
		]
	})
	const service = broker.createService(TestService)

	service.settings.client = MongoClient()
	service.settings.db = service.settings.client.db()

	beforeAll(() => broker.start())
	afterAll(() => broker.stop())

	const originalBrokerCall = broker.call

	describe('\'agreements.generator\' methods', () => {
		it('generatorProcess method must call \'agreements.generator.aggregate\' action and use \'agreements.generator.saveCrmRecords\' method', async () => {
			broker.call = jest.fn(() => {
				return [
					{
						recid: 456
					}
				]
			})

			const generatorSaveCrmRecordsMock = jest.fn()
			const oldGeneratorSaveCrmRecords = service.generatorSaveCrmRecords
			service.generatorSaveCrmRecords = generatorSaveCrmRecordsMock

			await service.generatorProcess([123])

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'agreements.generator.aggregate',
				{
					recids: [123]
				}
			)

			expect(service.generatorSaveCrmRecords).toBeCalledTimes(1)
			expect(service.generatorSaveCrmRecords).toHaveBeenCalledWith(
				[
					{
						recid: 456
					}
				]
			)

			broker.call = originalBrokerCall
			service.generatorSaveCrmRecords = oldGeneratorSaveCrmRecords
		})
	})

	describe('\'agreements.generator\' channels', () => {
		it('\'state.applied\' channel must call \'accumulator.putKey\' action', async () => {
			broker.call = jest.fn()

			await service.emitLocalChannelHandler('state.applied', {
				params: {
					table_name: 'agreement',
					record: {value: 'test', recid: 'test'}
				}
			})

			expect(broker.call).toBeCalledTimes(1)
			expect(broker.call).toHaveBeenCalledWith(
				'accumulator.putKey',
				{
					bucket: 'agreements.generator',
					key: 'test'
				}
			)

			broker.call = originalBrokerCall
		})
	})

	describe('\'agreements.generator\' service actions', () => {
		it('\'aggregate\' action test', async () => {
			const res = await broker.call('agreements.generator.aggregate', {
				recids: ['testRecid']
			})

			expect(res).toStrictEqual([{
				cfo: 'testId',
				channel_code: 'testChannelCode',
				classification_name: 'testClassification',
				client_type_code: 'testNumber',
				code: 'testId',
				company_source: 'testCompany',
				created_date: 'testDate',
				currency: 'testCurrency',
				cust_account_code: 'testCustaccount',
				default_effective_date: 'testDate',
				delivery_date: 'testDate',
				diadoc_signing_status_code: 'testStatus',
				documentExternalReference: 'testDesc',
				document_date: 'testDate',
				document_title: 'testTitle',
				edo_type_code: 'testType',
				end_date: 'testDate',
				gak: 'testPartynumber',
				header_rec_id: 'testHeader',
				is_correct_efu: false,
				management_accouting_article: 'testId',
				owner_executor: 'testCompany"',
				payment_schedule: 'testSchedule',
				recid: 'testRecid',
				sales_district_code: 'testId',
				signing_date: 'testDate',
				signing_status_code: 'testStatus',
				source_code: 'testSource',
				status_code: 'testState',
				vat_amount: 'testAmount',
				is_correct_efu: false
			}])
		})
	})
})
