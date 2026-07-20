

module.exports = {
	name: 'realization.orders.scenario',

	methods: {
		async process(){
			await this.broker.waitForServices([this.name, 'puller'])

			await this.broker.sendToChannel('salesinvconsigneetable-topic', {
				"recid": "PSV-727919",
				"address": "Россия,357072, Ставропольский край, Андроповский р-н, с. Подгорное, ул. Цветочная, 26",
				"carrierdeliverydatefact": "1900-01-01T00:00:00.000+00:00",
				"carrierdeliverydateplan": "1900-01-01T00:00:00.000+00:00",
				"centralizedordertype": 0,
				"channelid": "000000001",
				"consigneeaccount": "К0018689",
				"createdby": "ANekraso",
				"createddatetime": "2025-02-21T06:58:07.000Z",
				"custaccount": "К0018689",
				"deletestatus": 0,
				"deliverydate": "2025-01-22T00:00:00.000Z",
				"deliverymode": "Авто",
				"dimagreementid": "PSVK582526",
				"dimregionid": 26,
				"facturedate": "2025-01-22T00:00:00.000Z",
				"factureid": "000000011",
				"incltax": 0,
				"inventlocationid": "Томил_ГП",
				"invoiceaccount": "К0018689",
				"invoiceactid": "000000006",
				"maintype": 1,
				"modifiedby": "ANekraso",
				"modifieddatetime": "2025-02-21T06:58:07.000Z",
				"ordersource": 1,
				"priceagreementdate": "1900-01-01T00:00:00.000+00:00",
				"salesconsigneecode": "PSV-727819-К0018689",
				"salesid": "PSV-727919",
				"salesidconsolidated": "PSV-727819",
				"salesordertype": 2,
				"salesordertypedesc": "Бюджетный",
				"salesstatus": 32,
				"shippingdaterequested": "2025-01-22T00:00:00.000Z",
				"wmsrequeststatusid": ""
			}, {key: "PSV-727919"})
		}
	},

	async started() {
		this.process()
	},
}
