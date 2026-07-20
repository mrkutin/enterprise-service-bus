module.exports = {
	name: 'contacts.crm.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'api'])

			await this.broker.call('contacts.crm.contacts', {
				body: [
					{
						'recid': 'b0e2d89b-3c93-4fd7-a78e-2c3052f0fdb1',
						'account_code': 'К0107575',
						'book_order_id': '1-rs',
						'email': 'm@ifire.ry',
						'fullname': 'Романенкова Елена Анатольевн',
						'is_main': false,
						'phone': '+79138900987',
						'position_code': 4
					}
				]
			})
		}
	},

	async started() {
		this.process()
	}
}
