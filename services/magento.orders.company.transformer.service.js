const TransformerMixin = require('../mixins/transformer.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_ORDERS_TRANSFORMER_RECORDS_COUNT
} = process.env

const magentoOrderCompanyOneCAggregation = [
	{ $project: { 'magento-order-company-one-c.recid': '$recid', '_id': 0 } }
]

const dirpartytableAggregation = [
	{
		$lookup: {
			from: 'magento-order-company-one-c',
			localField: 'inn',
			foreignField: 'data.CompanyINN',
			as: 'magento-order-company-one-c'
		}
	},
	{
		$unwind: {
			path: '$magento-order-company-one-c',
			preserveNullAndEmptyArrays: false,
		},
	},
	{
		$addFields: {
			magentoOrderMappedKpp: {
				$cond: {
					if: { $eq:  ['$magento-order-company-one-c.data.CompanyKPP', null] },
					then: '',
					else: '$magento-order-company-one-c.data.CompanyKPP'
				}
			}
		}
	},
	{
		$match: {
			$expr: {
				$eq: [ "$kpp",  "$magentoOrderMappedKpp" ]
			}
		}
	},
	{ $project: { 'magento-order-company-one-c.recid': 1, '_id': 0 } }
]

const agreementAggregation = [
	{
		$lookup: {
			from: 'dirpartytable',
			localField: 'partynumber',
			foreignField: 'partynumber',
			as: 'dirpartytable'
		}
	},
	{
		$unwind: {
			path: '$dirpartytable',
			preserveNullAndEmptyArrays: false,
		},
	},
	{
		$lookup: {
			from: 'magento-order-company-one-c',
			localField: 'dirpartytable.inn',
			foreignField: 'data.CompanyINN',
			as: 'magento-order-company-one-c'
		}
	},
	{
		$unwind: {
			path: '$magento-order-company-one-c',
			preserveNullAndEmptyArrays: false,
		},
	},
	{
		$addFields: {
			magentoOrderMappedKpp: {
				$cond: {
					if: { $eq:  ['$magento-order-company-one-c.data.CompanyKPP', null] },
					then: '',
					else: '$magento-order-company-one-c.data.CompanyKPP'
				}
			}
		}
	},
	{
		$match: {
			$expr: {
				$eq: [ "$dirpartytable.kpp",  "$magentoOrderMappedKpp" ]
			}
		}
	},
	{ $project: { 'magento-order-company-one-c.recid': 1, '_id': 0 } }
]

module.exports = {
	name: 'magento.orders.company.transformer',

	mixins: [TransformerMixin, StateMixin],

	settings: {
		recidsToTransformReadCount: REDIS_ORDERS_TRANSFORMER_RECORDS_COUNT
	},

	methods: {
		async startStateLoop() {},
		async aggregate(table_name, recids) {
			let mongoAggregation
			switch (table_name) {
				case 'magento-order-company-one-c':
					mongoAggregation = magentoOrderCompanyOneCAggregation
					break
				case 'agreement':
					mongoAggregation = agreementAggregation
					break
				case 'dirpartytable':
					mongoAggregation = dirpartytableAggregation
					break
			}

			const ordersRecids = (await this.getRecords(
				table_name,
				[
					{
						$match:
							{
								recid: {
									$in: recids
								}
							}
					}, ...mongoAggregation
				]
			)).map(res => res['magento-order-company-one-c'].recid)

			return ordersRecids
		}
	},

	actions: {
		async process(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {table_name, recids} = ctx.params
			const ordersRecids = await this.aggregate(table_name, recids)
			if (ordersRecids.length) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)} found recids: ${JSON.stringify(ordersRecids)}`)
				for (const recid of ordersRecids) {
					await this.broker.sendToChannel('channel.magento.orders.company.recid.transformed', { recid  }, {key: recid.toString()})
				}
			} else {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)} recids not found!`)
			}
		}
	},

	channels: {
		'channel.message.kafka.applied': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const {table_name, record} = ctx.params
				if (table_name === 'magento-order-company-one-c') {
					this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
					this.broker.call(`${this.name}.putKey`, {
						bucket: `${this.name}:magento-order-company-one-c`,
						key: `${record.recid}`
					})
				}
			}
		},
		'dirpartytable-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}:dirpartytable`,
					key: record.recid
				})
			}
		},
		'agreement-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}:agreement`,
					key: record.recid
				})
			}
		}
	}
}
