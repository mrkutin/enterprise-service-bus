const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_AGREEMENTS_GENERATOR_RECORDS_COUNT,
	CRM_AGREEMENTS_TABLE_NAME,
	BUS_AGREEMENTS_TABLE_NAME
} = process.env

module.exports = {
	name: 'agreements.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		crmTableName: CRM_AGREEMENTS_TABLE_NAME,
		nativeTableName: BUS_AGREEMENTS_TABLE_NAME,
		recordsCount: REDIS_AGREEMENTS_GENERATOR_RECORDS_COUNT
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {keys} = ctx.params
				const cursor = this.settings.db.collection('agreement').aggregate([
					{
						$match: {
							recid: {
								$in: keys.map(key => parseInt(key))
							}
						}
					},
					{
						$project: {
							created_at: 0,
							updated_at: 0,
							_id: 0
						}
					}
				])

				while (await cursor.hasNext()) {
					const nativeRecord = await cursor.next()
					await this.broker.sendToChannel(`${this.settings.nativeTableName}-topic`, nativeRecord, {key: `${nativeRecord.recid}`})
					const crmRecord = await this.crmMapper(nativeRecord)
					if (crmRecord) {
						await this.broker.sendToChannel(`${this.settings.crmTableName}-topic`, crmRecord, {key: `${crmRecord.recid}`})
					}
				}

				await cursor.close()
			}
		}
	},

	methods: {
		async crmMapper(nativeRecord) {
			let is_correct_efu = false

			if (nativeRecord.channelid === '000000006') {
				const foundDirpartytable = await this.getRecords(
					'dirpartytable',
					[
						{
							$match: {
								custaccount: nativeRecord.custaccount,
								channelid: '000000001'
							},
						},
						{
							$limit: 1
						}
					]
				)

				if (foundDirpartytable.length) {
					is_correct_efu = true
				}
			}

			const crmRecord = {
				recid: nativeRecord.recid.toString(),
				gak: nativeRecord.partynumber.toString(),
				vat_amount: nativeRecord.totalamount || null,
				number_copies_pcs: nativeRecord.totalqty || null,
				header_rec_id: nativeRecord.agreementheader.toString(),
				code: nativeRecord.agreementid,
				status_code: nativeRecord.agreementstate,
				channel_code: nativeRecord.channelid,
				classification_name: nativeRecord.classificationname,
				created_date: nativeRecord.agreementdt?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.agreementdt
					:
					null,
				currency: nativeRecord.currency,
				cust_account_code: nativeRecord.custaccount,
				client_type_code: nativeRecord.relationtypewithindividual,
				default_effective_date: nativeRecord.defaultagreementlineeffectivedate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.defaultagreementlineeffectivedate
					:
					null,
				end_date: nativeRecord.defaultagreementlineexpirationdate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.defaultagreementlineexpirationdate
					:
					null,
				delivery_date: nativeRecord.salesdeliverydate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.salesdeliverydate
					:
					null,
				document_title: nativeRecord.documenttitle,
				payment_schedule: nativeRecord.paymentschedule,
				sales_district_code: nativeRecord.salesdistrictid.toString(),
				company_source: nativeRecord.psv_sourcecompanyidall,
				signing_status_code: nativeRecord.psv_signstatus,
				diadoc_signing_status_code: nativeRecord.psv_edodocstatus,
				edo_type_code: nativeRecord.edotype,
				document_date: nativeRecord.agreementdate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.agreementdate
					:
					null,
				signing_date: nativeRecord.psv_signdate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.psv_signdate
					:
					null,
				owner_executor: nativeRecord.psv_responsibleperson ? nativeRecord.psv_responsibleperson : '',
				management_accouting_article: nativeRecord.budgetarticleid,
				cfo: nativeRecord.cfrid,
				source_code: nativeRecord.psv_agreementsource,
				documentExternalReference: nativeRecord.documentexternalreference,
				is_correct_efu,
				agreementiid_kz: nativeRecord.codenamekz || '',
				agreementid_pik: nativeRecord.codenamepik || ''
			}

			return crmRecord
		}
	},

	channels: {
		'agreement-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}`,
					key: record.recid
				})
			}
		},
		[`${CRM_AGREEMENTS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_AGREEMENTS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		},

		[`${BUS_AGREEMENTS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${BUS_AGREEMENTS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
