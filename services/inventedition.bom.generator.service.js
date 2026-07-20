const StateMixin = require('../mixins/state.mixin')
const MssqlMixin = require('../mixins/mssql.mixin')

module.exports = {
	name: 'inventedition.bom.generator',

	mixins: [StateMixin, MssqlMixin],

	actions: {
		stateProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {records, action} = ctx.params
				const processedRecords = await Promise.all(records.map(async inventedition => {
					const { itemidassign: sku, inventeditionid, recid } = inventedition
					const bom = (await this.getInventEditionBOM(sku, inventeditionid)).map(({
						INVENTEDITIONIDBOM: inventeditionid,
						ItemId: sku,
						QTY: qty
					}) => ({ inventeditionid, sku, qty }))
					return { recid, inventeditionid, sku, bom }
				}))

				this.logger.info(`processedRecords: ${JSON.stringify(processedRecords)}`)

				await this.applyMessages('inventeditionbom-pim', processedRecords, action)
				for (const record of processedRecords) {
					await this.broker.sendToChannel('inventeditionbom-pim-topic', record, {key: `${record.recid}`})
				}
			}
		}
	},

	channels: {
		'inventedition-topic': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				if ([7, 8].includes(record.maintype)) {
					this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
					this.broker.call(`${this.name}.putKeyValue`, {
						bucket: `${this.name}:inventedition`,
						key: record.recid,
						value: record
					})
				}
			}
		}
	}
}
