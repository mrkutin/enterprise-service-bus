module.exports = {
	name: 'one-c.erpuh.kz.clients.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await this.broker.sendToChannel('kz-customer-request-one-c-topic', {
				'channelid': '000000001',
				'custvendsource': 'Книгозаказ',
				'custvendtype': 'ИП',
				'inn': '5262067202',
				'kpp': '526201001'
			}, {key: '5262067202:526201001'})
		}
	},

	async started() {
		this.process()
	}
}
