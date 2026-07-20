const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_ONE_C_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT,
	ONE_C_INCOMING_ORDERS_TABLE_NAME,
	CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME
} = process.env

module.exports = {
	name: 'one-c-incoming.orders.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		nativeTableName: ONE_C_INCOMING_ORDERS_TABLE_NAME,
		crmTableName: CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME,
		recordsCount: REDIS_ONE_C_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT
	},

	methods: {
		recidMapper(order) {
			const { _id, created_at, ...rest } = order
			return rest
		},
		async crmMapper(nativeRecord) {
			const consignee_code = nativeRecord.consigneeDirpartytable ? nativeRecord.consigneeDirpartytable.custaccount : nativeRecord.accountDirpartytable.custaccount
			const consolidated_number = `${nativeRecord.год}-${nativeRecord.номер}`

			const crmRecord = {
				recid: nativeRecord.recid,
				account_code: nativeRecord.accountDirpartytable.custaccount,
				consignee_code,
				consolidated_number,
				start_amount: Math.round((nativeRecord.суммадокумента ? nativeRecord.суммадокумента : 0) * 100) / 100,
				amount: Math.round((nativeRecord.суммадокумента ? nativeRecord.суммадокумента : 0) * 100) / 100,
				amount_without_vat: Math.round(nativeRecord.товары.reduce((acc, product) => {
					acc += product.СуммаБезНДС? product.СуммаБезНДС : 0
					return acc
				}, 0) * 100) / 100,
				is_tax_price: nativeRecord.суммавключаетндс,
				contract_number: nativeRecord.договорконтрагента.IDAX ? nativeRecord.договорконтрагента.IDAX.toString() : '',
				channel_code: nativeRecord.договорконтрагентаканалкод ? nativeRecord.договорконтрагентаканалкод : '',
				number: `${consolidated_number}-${consignee_code}`,
				axapta_status_code: nativeRecord.статус.toString(),
				axapta_createdby: nativeRecord.ответственный._name ? nativeRecord.ответственный._name : '',
				axapta_created_date: nativeRecord.датасозданиядокумента ? nativeRecord.датасозданиядокумента : '',
				axapta_modified_date: nativeRecord.crocaxaptamodifieddate || '',
				gak: nativeRecord.контрагент.IDAX,
				company: 'PSV',
				is_1c_order: true,
				agreementiid_kz: nativeRecord.extcode_kz?.exagreementnum.toString() || '',
				agreementid_pik: nativeRecord.extcode_pik?.exagreementnum.toString() || '',
				product_details: nativeRecord.товары.map(product => ({
					rec_id: product.НомерСтроки ? product.НомерСтроки.toString() : '',
					string_pos: product.НомерСтроки ? product.НомерСтроки : 0,
					item_code: product.КодSKU.toString(),
					quantity: Math.round((product.Количество ? product.Количество : 0) * 100) / 100,
					unit: product.ЕдиницаИзмерения ? product.ЕдиницаИзмерения : '',
					price: Math.round((product.ЦенаБезНДС ? product.ЦенаБезНДС : 0) * 100) / 100,
					vat_price: Math.round((product.ЦенаСНДС ? product.ЦенаСНДС : 0) * 100) / 100,
					total_amount: Math.round((product.СуммаСНДС ? product.СуммаСНДС : 0) * 100) / 100,
					total_amount_without_vat: Math.round((product.СуммаБезНДС ? product.СуммаБезНДС : 0) * 100) / 100,
					tax_rate: Math.round((product.СтавкаНДС ? product.СтавкаНДС : 0) * 100) / 100
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
				const cursor = this.settings.db.collection('one-c-customers-order').aggregate([
					{
						$match: {
							recid: {
								$in: keys
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
		'channel.one-c-incoming.orders.recid.transformed': {
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
		[`${ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${ONE_C_INCOMING_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		},
		[`${CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
