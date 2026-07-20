const {scheduler} = require('node:timers/promises')
const WAITING_TIMEOUT = 6000

module.exports = {
	name: 'one-c-products-price.scenario.service',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'api', 'kafka'])

			const messagesToApply = [
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 715,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 10,
						"price_markup_b2b": 0,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 715,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 10,
						"wholesalePrice": 700,
						"price_markup_b2b": 0,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 10,
						"wholesalePrice": 50,
						"price_markup_b2b": 0,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 10,
						"price_markup_b2b": 0,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 11,
						"wholesalePrice": 700,
						"price_markup_b2b": 0,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 11,
						"wholesalePrice": 700,
						"price_markup_b2b": 1,
						"price_markup_b2c": 0
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 11,
						"wholesalePrice": 700,
						"price_markup_b2b": 1,
						"price_markup_b2c": 1
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 11,
						"wholesalePrice": 700,
						"price_markup_b2b": 2,
						"price_markup_b2c": 2
					}
				},
				{
					'table': 'one-c-products-price-table', 'push_to_kafka': 1, 'action': 'insert', 'record': {
						"recid": "NM0092828",
						"contentid": "51-0116-01",
						"event": "update1",
						"itemid": "NM0092828",
						"number": "cd68ec23-3c8e-4e4d-80d0-6add33bd7b3b",
						"price": 800,
						"productid": "Edition, Печатное издание",
						"timestamp": "27.02.2024 15:55:42",
						"vattype": 11,
						"wholesalePrice": 700,
						"price_markup_b2b": 2,
						"price_markup_b2c": 2
					}
				}
			]

			for (const messageToApply of messagesToApply) {
				await this.broker.call('api.apply', {
					body: {
						messages: Buffer.from(JSON.stringify([messageToApply])).toString('base64')
					}
				})
				await scheduler.wait(WAITING_TIMEOUT)
			}
		}
	},

	async started() {
		this.process()
	}
}
