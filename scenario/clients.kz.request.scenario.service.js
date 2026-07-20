const {scheduler} = require('node:timers/promises')


module.exports = {
	name: 'clients-kz-request.scenario',

	methods: {
		async process() {
			// while (ctx.broker.channelAdapter.consumers.size)
			await scheduler.wait(10000)
			await this.broker.waitForServices([this.name, 'kafka', 'clients.kz.request'])

			await this.broker.sendToChannel('cust-table-request-kz-topic', {
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
