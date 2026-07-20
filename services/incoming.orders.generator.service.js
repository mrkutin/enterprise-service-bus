const CRM_TO_BE_DELETED_CODE = '99'

const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')

const {
	REDIS_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT,
	INCOMING_ORDERS_TABLE_NAME,
	CRM_INCOMING_ORDERS_TABLE_NAME
} = process.env

module.exports = {
	name: 'incoming.orders.generator',

	mixins: [GeneratorMixin, StateMixin, MssqlMixin],

	settings: {
		nativeTableName: INCOMING_ORDERS_TABLE_NAME,
		crmTableName: CRM_INCOMING_ORDERS_TABLE_NAME,
		recordsCount: REDIS_INCOMING_ORDERS_GENERATOR_RECORDS_COUNT
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {keys} = ctx.params

				const cursor = this.settings.db.collection('salesconsigneetable').aggregate([
					{
						$match: {
							recid: {
								$in: keys
							}
						}
					},
					{
						$addFields: {
							contract_number: {
								$cond: {
									if: { $eq:  ['$consigneeagreementid', ''] },
									then: '$dimagreementid',
									else: '$consigneeagreementid'
								}
							}
						}
					},
					{
						$lookup: {
							from: 'extcode',
							localField: 'contract_number',
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
							localField: 'contract_number',
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
					const aggregationResult = await cursor.next()
					const saleslines = await this.getSalesConsigneeLine(aggregationResult.salesconsigneecode)
					const lowerCaseSaleslines = saleslines.map(line =>
						Object.fromEntries(
							Object.entries(line).map(([key, value]) => [key.toLowerCase(), value])
						)
					)
					const nativeRecord = {...aggregationResult, saleslines: lowerCaseSaleslines}
					await this.broker.sendToChannel(`${this.settings.nativeTableName}-topic`, nativeRecord, {key: `${nativeRecord.recid}`})
					const crmRecord = await this.crmMapper(nativeRecord)
					if (crmRecord) {
						const mappedCrmRecord = {...crmRecord, recid: crmRecord.number}
						await this.broker.sendToChannel(`${this.settings.crmTableName}-topic`, mappedCrmRecord, {key: `${mappedCrmRecord.recid}`})
					}
				}
			}
		}
	},

	methods: {
		async crmMapper(nativeRecord) {
			const foundRealizationOrder = (await this.getRecords(
				'crm-ax-realization-orders',
				[
					{
						$match: {
							order_number: nativeRecord.salesconsigneecode,
							axapta_status_code: {
								$ne: '99'
							}
						}
					}
				]
			))[0]

			let crmRecord = {
				company: 'psv',
				account_code: nativeRecord.centralizedordertype === 10 ? nativeRecord.consignee : nativeRecord.custaccount,
				consignee_code: nativeRecord.consignee,
				consolidated_number: nativeRecord.salesid,
				start_amount: Math.round(nativeRecord.saleslines.reduce((acc, salesline) => {
					return acc + salesline.salespricevat * salesline.qty
				}, 0) * 100) / 100,
				is_tax_price: Boolean(nativeRecord.incltax),
				price_date: nativeRecord.priceagreementdate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.priceagreementdate
					:
					null,
				top_num_typ_code: nativeRecord.maintype,
				actual_date: nativeRecord.deliverydate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.deliverydate
					:
					null,
				due_date: nativeRecord.shippingdaterequested?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.shippingdaterequested
					:
					null,
				delivery_address: nativeRecord.deliveryaddressing,
				contract_name: '',
				contract_description: '',
				contract_delivery_date: nativeRecord.deliverydate?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.deliverydate
					:
					null,
				contract_number: nativeRecord.contract_number,
				stock: nativeRecord.inventlocationid,
				channel_code: nativeRecord.channelid,
				is_budget: nativeRecord.salesordertype === 2,
				is_realization_order_created: Boolean(foundRealizationOrder),
				axapta_created_date: nativeRecord.createddatetime?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.createddatetime
					:
					null,
				axapta_modified_date: nativeRecord.modifieddatetime?.toISOString() !== '1900-01-01T00:00:00.000Z' ?
					nativeRecord.modifieddatetime
					:
					null,
				axapta_createdby: nativeRecord.createdby,
				axapta_modifiedby: nativeRecord.modifiedby,
				axapta_order_type: nativeRecord.centralizedordertype.toString(),
				number: nativeRecord.salesconsigneecode,
				delivery_method: nativeRecord.deliverymode,
				order_source_code: nativeRecord.ordersource.toString(),
				agreementiid_kz: nativeRecord.extcode_kz?.exagreementnum.toString() || '',
				agreementid_pik: nativeRecord.extcode_pik?.exagreementnum.toString() || ''
			}

			if ([10, 50].includes(nativeRecord.deletestatus)) {
				crmRecord.axapta_status_code = CRM_TO_BE_DELETED_CODE
			} else {
				crmRecord.axapta_status_code = nativeRecord.deletestatus === 60 ? '32' : '0'
				const product_details = (
					nativeRecord.saleslines.filter(salesline => salesline.isdeleted).length === nativeRecord.saleslines.length
						?
						nativeRecord.saleslines
						:
						nativeRecord.saleslines.filter(salesline => !salesline.isdeleted)
				).map(salesline => ({
					item_code: salesline.itemid,
					unit: salesline.salesunit,
					quantity: Math.round((salesline.qty ? salesline.qty : 0) * 100) / 100,
					price: Math.round((salesline.salesprice ? salesline.salesprice : 0) * 100) / 100,
					vat_price: Math.round((salesline.salespricevat ? salesline.salespricevat : 0) * 100) / 100,
					one_discount: Math.round((salesline.linedisc ? salesline.linedisc : 0) * 100) / 100,
					discount_percent: Math.round((salesline.linepercent ? salesline.linepercent : 0) * 100) / 100,
					total_amount: Math.round((salesline.totalamount ? salesline.totalamount : 0) * 100) / 100,
					total_amount_without_vat: Math.round((salesline.totalamountexcltax ? salesline.totalamountexcltax : 0) * 100) / 100,
					tax_rate: Math.round((salesline.taxvalue ? salesline.taxvalue.toFixed(2) : 0) * 100)  / 100,
					rec_id: salesline.inventtablerecid.toString(),
					activity_id: salesline.activityid || '',
					is_reg_project: Boolean(salesline.regproject)
				}))
				crmRecord.product_details = product_details
				crmRecord.amount = Math.round(product_details.reduce((acc, product) => {
					return acc + product.total_amount
				}, 0) * 100) / 100
				crmRecord.amount_without_vat = Math.round(product_details.reduce((acc, product) => {
					return acc + product.total_amount_without_vat
				}, 0) * 100) / 100
			}

			return crmRecord
		}
	},

	channels: {
		'salesconsigneetable-topic': {
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
		[`${INCOMING_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${INCOMING_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		},
		[`${CRM_INCOMING_ORDERS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_INCOMING_ORDERS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
