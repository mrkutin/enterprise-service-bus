module.exports = {
	name: 'inventedition.bom.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name, 'puller'])

			await this.broker.sendToChannel('inventedition-topic', {
				"eventrecid": Math.floor(Math.random() * 10000000000),
				"recid": 'testRecid1',
				"cfreditorial": 'testcfreditorial',
				"dataareaidowner": "psv",
				"description": "",
				"editiondescription": "",
				"editionprocessing": 5637144578,
				"editiontype": 5637145326,
				"federationlistrecid": 0,
				"firstpublicdate": "2024-12-01T00:00:00.000Z",
				"inventcontentcode": "004-0321-01",
				"inventcontentid": "04-0321-01",
				"inventeditioncode": "004-0321-01-2025-36",
				"inventeditionid": "ИЗД0163940",
				"inventeditiontype": "ЭФУ 5.0",
				"inventtitleyearid": 2025,
				"isbn": "",
				"isbnmultivolume": "",
				"itemidassign": "NM0079633",
				"linecode": "2025-36",
				"maintype": 7,
				"maintypestr": "ЭФУ",
				"mgmteditorialofficerecid": 5637144577
			}, {key: 'testRecid1'})

			await this.broker.sendToChannel('inventedition-topic', {
				"eventrecid": Math.floor(Math.random() * 10000000000),
				"recid": 'testRecid2',
				"cfreditorial": 'testcfreditorial',
				"dataareaidowner": "psv",
				"description": "",
				"editiondescription": "",
				"editionprocessing": 5637144578,
				"editiontype": 5637145326,
				"federationlistrecid": 0,
				"firstpublicdate": "2024-12-01T00:00:00.000Z",
				"inventcontentcode": "004-0321-01",
				"inventcontentid": "04-0321-01",
				"inventeditioncode": "004-0321-01-2025-36",
				"inventeditionid": "ИЗД0154653",
				"inventeditiontype": "ЭФУ 5.0",
				"inventtitleyearid": 2025,
				"isbn": "",
				"isbnmultivolume": "",
				"itemidassign": "NM0074306",
				"linecode": "2025-36",
				"maintype": 7,
				"maintypestr": "ЭФУ",
				"mgmteditorialofficerecid": 5637144577
			}, {key: 'testRecid2'})

			await this.broker.sendToChannel('inventedition-topic', {
				"eventrecid": Math.floor(Math.random() * 10000000000),
				"recid": 'testRecid3',
				"cfreditorial": 'testcfreditorial',
				"dataareaidowner": "psv",
				"description": "",
				"editiondescription": "",
				"editionprocessing": 5637144578,
				"editiontype": 5637145326,
				"federationlistrecid": 0,
				"firstpublicdate": "2024-12-01T00:00:00.000Z",
				"inventcontentcode": "004-0321-01",
				"inventcontentid": "04-0321-01",
				"inventeditioncode": "004-0321-01-2025-36",
				"inventeditionid": "123",
				"inventeditiontype": "ЭФУ 5.0",
				"inventtitleyearid": 2025,
				"isbn": "",
				"isbnmultivolume": "",
				"itemidassign": "123",
				"linecode": "2025-36",
				"maintype": 7,
				"maintypestr": "ЭФУ",
				"mgmteditorialofficerecid": 5637144577
			}, {key: 'testRecid3'})
		}
	},

	async started() {
		this.process()
	},
}
