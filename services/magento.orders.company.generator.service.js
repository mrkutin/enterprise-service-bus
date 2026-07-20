const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')

const {
	BUS_MAGENTO_ORDERS_COMPANY_GENERATOR_RECORDS_COUNT,
	BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME
} = process.env

module.exports = {
	name: 'magento.orders.company.generator',

	mixins: [GeneratorMixin, StateMixin, MssqlMixin],

	settings: {
		mappedRecordTableName: BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME,
		recordsCount: BUS_MAGENTO_ORDERS_COMPANY_GENERATOR_RECORDS_COUNT
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {keys} = ctx.params
				const cursor = this.settings.db.collection('magento-order-company-one-c').aggregate([
					{
						$match: {
							recid: {
								$in: keys
							},
							is_one_c_kafka_send: {
								$ne: true
							}
						}
					},
					{
						$addFields: {
							magentoOrderMappedKpp: {
								$cond: {
									if: { $eq:  ['$data.CompanyKPP', null] },
									then: '',
									else: '$data.CompanyKPP'
								}
							}
						}
					},
					{
						$lookup: {
							from: 'dirpartytable',
							localField: 'data.CompanyINN',
							foreignField: 'inn',
							as: 'dirpartytable',
							let: { pipelineMagentoOrderMappedKpp: '$magentoOrderMappedKpp' },
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$kpp', '$$pipelineMagentoOrderMappedKpp']
										},
										custaccount: {
											$ne: ''
										}
									}
								}
							]
						}
					},
					{
						$unwind: {
							path: '$dirpartytable',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$lookup: {
							from: 'agreement',
							localField: 'dirpartytable.partynumber',
							foreignField: 'partynumber',
							as: 'agreement',
							pipeline: [
								{
									$match: {
										documentexternalreference: 'Договор оферты ИМ',
										defaultagreementlineeffectivedate: {
											$gt: new Date('2025-04-01')
										},
										defaultagreementlineexpirationdate: {
											$gt: new Date('2100-01-01')
										}
									}
								},
								{
									$sort: {
										recid: -1
									}
								},
								{
									$limit: 1
								}
							]
						}
					},
					{
						$unwind: {
							path: '$agreement',
							preserveNullAndEmptyArrays: true
						}
					}
				])

				while (await cursor.hasNext()) {
					const {
						dirpartytable, agreement, _id,
						recid, created_at, updated_at,
						magentoOrderMappedKpp,
						is_one_c_kafka_send, ...nativeRecord
					} = await cursor.next()

					if (nativeRecord.data.CompanyContractIdAX) {
						this.logger.info(`Non-empty CompanyContractIdAX field, record: ${JSON.stringify(nativeRecord)}`)
						await this.broker.sendToChannel(`${this.settings.mappedRecordTableName}-topic`, nativeRecord, {key: recid.toString()})
						await this.updateRecords(
							'magento-order-company-one-c',
							{
								recid
							},
							{$set: {is_one_c_kafka_send: true, updated_at: new Date()}}
						)
					} else if (dirpartytable && agreement) {
						this.logger.info(`dirpartytable and agreement found, record: ${JSON.stringify(nativeRecord)}`)
						await this.broker.sendToChannel('dax-company-magento-topic', {
							number: nativeRecord.number,
							timestamp: new Date(),
							event: 'update',
							data: {
								CompanyIdAx: dirpartytable.partynumber.toString(),
								CompanyContractIdAX: agreement.agreementid,
								CompanyInn: nativeRecord.data.CompanyINN,
								CompanyKPP: magentoOrderMappedKpp,
								OrderId: nativeRecord.data.OrderId
							}
						}, {key: nativeRecord.number.toString()})
						const mappedRecord = this.recordMapper(nativeRecord, dirpartytable, agreement)
						await this.broker.sendToChannel(`${this.settings.mappedRecordTableName}-topic`, mappedRecord, {key: recid.toString()})
						await this.updateRecords(
							'magento-order-company-one-c',
							{
								recid
							},
							{$set: {is_one_c_kafka_send: true, updated_at: new Date()}}
						)
					} else if (!dirpartytable) {
						this.logger.info(`dirpartytable not found, record: ${JSON.stringify(nativeRecord)}`)
						await this.createCustomer(
							nativeRecord.data.CompanyINN,
							magentoOrderMappedKpp,
							'000000008',
							'Интермаг',
							magentoOrderMappedKpp.length ? 'Юр_лицо' : 'ИП'
						)
					} else if (!agreement) {
						this.logger.info(`agreement not found, record: ${JSON.stringify(nativeRecord)}`)
						const classificationid = 'ИМ_ЮрЛица'
						const recid = `${dirpartytable.partynumber}-${classificationid}`

						const foundAgreementRequest = (await this.getRecords(
							'ax-agreement-sent-requests',
							[
								{
									$match: {
										recid
									}
								}
							]
						))[0]

						if (!foundAgreementRequest) {
							const agreementRequest = {
								custvend: 1,
								partynumber: dirpartytable.partynumber.toString(),
								agreementid: '',
								documenttitle: 'Договор интернет-магазина',
								agreementdate: nativeRecord.data.CreatedDateTime.split(' ')[0],
								classificationid,
								custvendsource: 10
							}

							await this.createAgreement(...Object.values(agreementRequest))

							await this.applyMessages(
								'ax-agreement-sent-requests',
								[{...agreementRequest, recid}],
								'insert'
							)

							this.logger.info(`agreement request send to ax, record: ${JSON.stringify(nativeRecord)}`)
						}
					}
				}

				await cursor.close()
			}
		}
	},

	methods: {
		recordMapper(nativeRecord, dirpartytable, agreement) {
			nativeRecord.data.CompanyIdAx = dirpartytable.partynumber.toString()
			nativeRecord.data.CompanyContractIdAX = agreement.agreementid
			return nativeRecord
		}
	},

	channels: {
		'channel.magento.orders.company.recid.transformed': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				const { recid } = ctx.params
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}`,
					key: recid
				})
			}
		},
		[`${BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx, raw) {
				const record = ctx.params
				const key = raw.key.toString()
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${BUS_MAGENTO_ORDERS_COMPANY_TABLE_NAME}:insert`,
					key,
					value: record
				})
			}
		}
	}
}
