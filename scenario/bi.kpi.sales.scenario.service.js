module.exports = {
	name: 'bi-kpi-sales.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'kafka'])

			await this.broker.sendToChannel('bi-kpi-sales-topic', {
				'fias_region': '0b940b96-103f-4248-850c-26b6c7296728',
				'type_content': 'Товары',
				'date': '2023-06-03T00:00:00.000000Z',
				'amount': 5636,
				'amount_without_vat': 5123.64,
				'kafka_key': '0b940b96-103f-4248-850c-26b6c7296728_Товары_20230603'
			}, {key: '0b940b96-103f-4248-850c-26b6c7296728_Товары_20230603'})

			await this.broker.sendToChannel('bi-kpi-sales-topic', {
				'recid': '_Товары_20230814',
				'amount': 74252.25,
				'date': '2023-08-14T00:00:00.000000Z',
				'fias_region': '',
				'kafka_key': '_Товары_20230814',
				'type_content': 'Товары'
			}, {key: '_Товары_20230814'})
		}
	},

	async started() {
		this.process()
	}
}
