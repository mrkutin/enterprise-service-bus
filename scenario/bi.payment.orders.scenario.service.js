module.exports = {
	name: 'bi-payment-orders.scenario',

	methods: {
		async process() {
			await new Promise(resolve => setTimeout(resolve, 5000))

			await this.broker.waitForServices([this.name, 'kafka'])

			await this.broker.sendToChannel('bi-payment-orders-topic', {
				'account_code': 'К0006639',
				'agreement_name': 'Контракт № A0039172',
				'agreement_number': 'PSVK185473',
				'amount': 200810.5,
				'date': '2023-06-21T00:00:00.000000Z',
				'deleted_flag': false,
				'number': '10035',
				'post_flag': true,
				'purpose': '(БК/02683105660/573/0702/8040171140/244) 23-ОБ-38Договор NА0039172от28.03.2023оплата за учебную литературу сч.N000018871от30.04.23,т/н000018871от30.04.2023в т.ч.НДС 18255,50руб.',
				'recId': 384184,
				'year': 2023,
			}, {key: '384184'})

			await this.broker.sendToChannel('bi-payment-orders-topic', {
				'account_code': 'К0006639',
				'agreement_name': 'Контракт № A0039172',
				'agreement_number': 'TEST123',
				'amount': 200810.5,
				'date': '2023-06-21T00:00:00.000000Z',
				'deleted_flag': false,
				'number': '10035',
				'post_flag': true,
				'purpose': '(БК/02683105660/573/0702/8040171140/244) 23-ОБ-38Договор NА0039172от28.03.2023оплата за учебную литературу сч.N000018871от30.04.23,т/н000018871от30.04.2023в т.ч.НДС 18255,50руб.',
				'recId': 123,
				'year': 2023,
			}, {key: '123'})
		}
	},

	async started() {
		this.process()
	}
}
