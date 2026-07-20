

module.exports = {
	name: 'clients-crm-request.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'api'])

			await this.broker.sendToChannel('channel.message.api.received', {
				table_name: 'cust-table-request-crm',
				record: {
					"recid": "5262067202:526201001",
					"account_type": "test_account_type",
					"channel": "000000001",
					"inn": "5262067202",
					"kpp": "526201001",
					"source": "test_source"
				},
				action: 'insert'
			}, {key: "5262067202:526201001"})
		}
	},

	async started() {
		this.process()
	}
}
