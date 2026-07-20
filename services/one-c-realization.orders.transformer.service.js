const TransformerMixin = require('../mixins/transformer.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_ONE_C_REALIZATION_ORDERS_RECIDS_TO_TRANSFORM_READ_COUNT
} = process.env

const dirpartytableAggregation = [
	{
		$lookup: {
			from: 'one-c-act-provision-production-services',
			localField: 'partynumber',
			foreignField: 'контрагент.IDAX',
			as: 'account-one-c-act-provision-production-services'
		}
	},
	{
		$lookup: {
			from: 'one-c-act-provision-production-services',
			localField: 'partynumber',
			foreignField: 'грузополучатель.IDAX',
			as: 'consignee-one-c-act-provision-production-services'
		}
	},
	{
		$project: {
			'account-one-c-act-provision-production-services.recid': 1,
			'consignee-one-c-act-provision-production-services.recid': 1,
			'_id': 0
		}
	}
]

const extcodeAggregation = [
	{
		$lookup: {
			from: 'one-c-act-provision-production-services',
			localField: 'salesnumbersequence',
			foreignField: 'договорконтрагента.IDAX',
			as: 'one-c-act-provision-production-services'
		}
	},
	{
		$project: {
			'one-c-act-provision-production-services': 1,
			'_id': 0
		}
	}
]

module.exports = {
	name: 'one-c-realization.orders.transformer',

	mixins: [TransformerMixin, StateMixin],

	settings: {
		recidsToTransformReadCount: REDIS_ONE_C_REALIZATION_ORDERS_RECIDS_TO_TRANSFORM_READ_COUNT
	},

	methods: {
		async startStateLoop() {},
		async aggregate(table_name, recids) {
			let mongoAggregation
			switch (table_name) {
				case 'one-c-act-provision-production-services':
					return recids
				case 'dirpartytable':
					mongoAggregation = dirpartytableAggregation
					break
				case 'extcode':
					mongoAggregation = extcodeAggregation
					break
			}

			const mongoResult = await this.getRecords(
				table_name,
				[{
					$match:
						{
							recid: {
								$in: recids
							}
						}
				}, ...mongoAggregation]
			)

			const transformedRecids = []
			mongoResult.forEach(onecRecidsObj => {
				for (const key of Object.keys(onecRecidsObj)) {
					if (onecRecidsObj[key].length) {
						for (const recidObj of onecRecidsObj[key]) {
							transformedRecids.push(recidObj.recid)
						}
					}
				}
			})

			return transformedRecids
		}
	},

	actions: {
		async process(ctx) {
			this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
			const {table_name, recids} = ctx.params
			const aggregateResult = await this.aggregate(table_name, recids)

			if (aggregateResult.length) {
				for (const recid of aggregateResult) {
					await this.broker.sendToChannel('channel.one-c-realization.orders.recid.transformed', { recid }, {key: `${recid}`})
				}
			} else {
				this.logger.info('dirpartytable recids not found!')
			}
		}
	},

	channels: {
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
		'one-c-act-provision-production-services-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}:one-c-act-provision-production-services`,
					key: record.recid
				})
			}
		},
		'extcode-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}:extcode`,
					key: record.recid
				})
			}
		}
	}
}
