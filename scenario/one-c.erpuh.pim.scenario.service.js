module.exports = {
	name: 'one-c.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('pim-content-connections-one-c-topic', {
				SourceItem: '19-0366-16',
				SourceItemGuid: null,
				TargetItem: '19-0930-01',
				TargetItemGuid: null,
				TypeId: 3,
				Type: 'ЭФУ'
			}, {key: '41740036'})}
	},

	async started() {
		this.process()
	}
}
