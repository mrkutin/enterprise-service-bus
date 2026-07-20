

module.exports = {
	name: 'incoming.orders.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('salesconsigneetable-topic', {
				"recid": "PSV-131634-К0019926",
				"centralizedordertype": 0,
				"channelid": "000000001",
				"consignee": "К0019926",
				"consigneeagreementid": "PSVK370229",
				"createdby": "Gilyazov",
				"createddatetime": "2021-03-19T09:15:57.000Z",
				"custaccount": "К0017469",
				"deletestatus": 0,
				"deliveryaddressing": "",
				"deliverydate": "2021-06-21T00:00:00.000Z",
				"deliverymode": "",
				"dimagreementid": "PSVK252872",
				"dimregionid": 36,
				"incltax": 0,
				"inventlocationid": "Вешки_ГП",
				"maintype": 1,
				"modifiedby": "Gilyazov",
				"modifieddatetime": "2025-01-20T17:00:52.000Z",
				"ordersource": 0,
				"priceagreementdate": "2021-05-12T00:00:00.000Z",
				"salesconsigneecode": "PSV-131634-К0019926",
				"salesid": "PSV-131634",
				"salesordertype": 2,
				"salesordertypedesc": "Бюджетный",
				"salesstatus": 32,
				"shippingdaterequested": "2021-06-21T00:00:00.000Z"
			}, {key: "PSV-131634-К0019926"})
		}
	},

	async started() {
		this.process()
	},
}
