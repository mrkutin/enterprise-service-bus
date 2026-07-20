module.exports = {
	name: 'one-c.erpuh.crm.clients.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await this.broker.sendToChannel('crm-counterparty-request-one-c-topic', {
				'recid': '5262067202:526201001',
				'account_type': 'test_account_type',
				'channel': '000000001',
				'inn': '5262067202',
				'kpp': '526201001',
				'source': 'test_source',
			}, {key: '5262067202:526201001'})
		}
	},

	async started() {
		this.process()
	}
}
