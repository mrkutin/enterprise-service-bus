module.exports = {
	name: 'bi-account-receivables.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'kafka'])

			await this.broker.sendToChannel('bi-accounts-receivable-topic', {
				'account_code': 'К0100919',
				'agreement_date': '2023-08-04T00:00:00.000000Z',
				'agreement_name': 'Контракт № A0075402',
				'agreement_number': 'PSVK490758',
				'agreement_product_type': 'Товары',
				'agreement_year': 2023,
				'debt_on_date': 64078.85,
				'edo_setup_type': 'Бумажная версия',
				'edo_setup_type_code': 1,
				'mutual_payment_in': 19544.25,
				'mutual_payment_out': 83623.1,
				'overdue_days': 0,
				'overdue_debt': 0,
				'unloading_1c_date': '2023-10-16T15:10:47.000000Z',
				'utd_sign_date': null
			}, {key: 'PSVK490758'})
		}
	},

	async started() {
		this.process()
	}
}
