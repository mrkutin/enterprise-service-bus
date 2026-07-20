const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_ONE_C_REALIZATION_ORDERS_GENERATOR_RECORDS_COUNT,
	ONE_C_REALIZATION_ORDERS_TABLE_NAME,
	CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME
} = process.env

module.exports = {
	name: 'one-c-realization.orders.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		nativeTableName: ONE_C_REALIZATION_ORDERS_TABLE_NAME,
		crmTableName: CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME,
		recordsCount: REDIS_ONE_C_REALIZATION_ORDERS_GENERATOR_RECORDS_COUNT
	},

	methods: {
		recidMapper(nativeRecord) {
			const { _id, created_at, ...rest } = nativeRecord
			return rest
		},
		async crmMapper(nativeRecord) {
			const consignee_code = nativeRecord.consigneeDirpartytable ? nativeRecord.consigneeDirpartytable.custaccount : nativeRecord.accountDirpartytable.custaccount
			const consolidated_number = `${nativeRecord.сделка.Год}-${nativeRecord.сделка.Номер}`

			const crmRecord = {
				recid: nativeRecord.recid,
				account_code: nativeRecord.accountDirpartytable.custaccount,
				consignee_code,
				consolidated_number,
				is_tax_price: nativeRecord.суммавключаетндс,
				amount_without_vat: Math.round(nativeRecord.услуги.reduce((acc, product) => {
					acc += product.СуммаБезНДС? product.СуммаБезНДС : 0
					return acc
				}, 0) * 100) / 100,
				amount: Math.round((nativeRecord.суммадокумента ? nativeRecord.суммадокумента : 0) * 100) / 100,
				//top_num_typ_code: nativeRecord.основнойтипноменклатуры ? nativeRecord.основнойтипноменклатуры : '',
				contract_number: nativeRecord.договорконтрагента.IDAX ? nativeRecord.договорконтрагента.IDAX.toString() : '',
				channel_code: nativeRecord.договорконтрагентаканалкод ? nativeRecord.договорконтрагентаканалкод : '',
				number: `${nativeRecord.год}-${nativeRecord.номер}`,
				invoice_date: nativeRecord.счетфактурадата ? nativeRecord.счетфактурадата : null,
				invoice_number: nativeRecord.счетфактураномер ? nativeRecord.счетфактураномер : '',
				act_number: nativeRecord.номер || '',
				order_number: `${consolidated_number}-${nativeRecord['one-c-incoming-orders'].accountDirpartytable.custaccount}`,
				axapta_status_code: nativeRecord.статус.toString(),
				axapta_createdby: nativeRecord.ответственный._name ? nativeRecord.ответственный._name : '',
				axapta_created_date: nativeRecord.датасоздания ? nativeRecord.датасоздания : '',
				axapta_modified_date: nativeRecord.crocaxaptamodifieddate || '',
				gak: nativeRecord.контрагент.IDAX,
				company: 'PSV',
				is_1c_order: true,
				agreementiid_kz: nativeRecord.extcode_kz?.exagreementnum.toString() || '',
				agreementid_pik: nativeRecord.extcode_pik?.exagreementnum.toString() || '',
				product_details: nativeRecord.услуги.map(service => ({
					rec_id: service.НомерСтроки ? service.НомерСтроки.toString() : '',
					string_pos: service.НомерСтроки ? service.НомерСтроки : 0,
					item_code: service.КодSKU.toString(),
					quantity: Math.round((service.Количество ? service.Количество : 0) * 100) / 100,
					unit: service.ЕдиницаИзмерения ? service.ЕдиницаИзмерения : '',
					price: Math.round((service.ЦенаБезНДС ? service.ЦенаБезНДС : 0) * 100) / 100,
					vat_price: Math.round((service.ЦенаСНДС ? service.ЦенаСНДС : 0) * 100) / 100,
					total_amount: Math.round((service.СуммаСНДС ? service.СуммаСНДС : 0) * 100) / 100,
					total_amount_without_vat: Math.round((service.СуммаБезНДС ? service.СуммаБезНДС : 0) * 100) / 100
				}))
			}

			return crmRecord
		}
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const { keys } = ctx.params
				const cursor = this.settings.db.collection('one-c-act-provision-production-services').aggregate([
					{
						$match: {
							recid: {
								$in: keys
							}
						}
					},
					{
						$lookup: {
							from: 'one-c-incoming-orders',
							localField: 'сделка._guid',
							foreignField: '_guid',
							as: 'one-c-incoming-orders',
							let: { pipelineContractorIDAX: '$контрагент.IDAX' },
							pipeline: [
								{$match: {
									$expr: {$ne: ['$to_be_deleted', true]},
									$expr: {
										$eq: ['$контрагент.IDAX', '$$pipelineContractorIDAX']
									}
								}},
								{$project: {'accountDirpartytable.custaccount': 1, '_id': 0}}
							]
						}
					},
					{
						$unwind: {
							path: '$one-c-incoming-orders',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$match: {
							'one-c-incoming-orders.accountDirpartytable.custaccount': {
								$ne: null
							}
						}
					},
					{
						$lookup: {
							from: 'dirpartytable',
							localField: 'контрагент.IDAX',
							foreignField: 'partynumber',
							as: 'accountDirpartytable',
							pipeline: [
								{$match: {$expr: {$ne: ["$to_be_deleted", true]}}}
							]
						}
					},
					{
						$unwind: {
							path: '$accountDirpartytable',
							preserveNullAndEmptyArrays: false
						}
					},

					{
						$lookup: {
							from: 'dirpartytable',
							localField: 'грузополучатель.IDAX',
							foreignField: 'partynumber',
							as: 'consigneeDirpartytable',
							pipeline: [
								{$match: {$expr: {$ne: ["$to_be_deleted", true]}}}
							]
						}
					},
					{
						$unwind: {
							path: '$consigneeDirpartytable',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$lookup: {
							from: 'extcode',
							localField: 'договорконтрагента.IDAX',
							foreignField: 'salesnumbersequence',
							as: 'extcode_kz',
							pipeline: [
								{
									$match: {
										'systemtype': 5,
										'reftype': 5
									}
								}
							]
						}
					},
					{
						$unwind: {
							path: '$extcode_kz',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$lookup: {
							from: 'extcode',
							localField: 'договорконтрагента.IDAX',
							foreignField: 'salesnumbersequence',
							as: 'extcode_pik',
							pipeline: [
								{
									$match: {
										'systemtype': 10,
										'reftype': 5
									}
								}
							]
						}
					},
					{
						$unwind: {
							path: '$extcode_pik',
							preserveNullAndEmptyArrays: true
						}
					}
				])

				while (await cursor.hasNext()) {
					const nativeRecord = await cursor.next()
					const mappedNativeRecord = this.recidMapper(nativeRecord)
					await this.broker.sendToChannel(`${this.settings.nativeTableName}-topic`, mappedNativeRecord, {key: `${mappedNativeRecord.recid}`})
					const crmRecord = await this.crmMapper(nativeRecord)
					if (crmRecord) {
						await this.broker.sendToChannel(`${this.settings.crmTableName}-topic`, crmRecord, {key: `${crmRecord.recid}`})
					}
				}

				await cursor.close()
			}
		}
	},

	channels: {
		'channel.one-c-realization.orders.recid.transformed': {
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
		[`${ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${ONE_C_REALIZATION_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		},
		[`${CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
