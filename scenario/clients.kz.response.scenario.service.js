

module.exports = {
	name: 'clients-kz-response.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('dirpartytable-topic', {
				"eventrecid": Math.floor(Math.random() * 10000000000),
				"recid": 5637155661,
				"address": "Россия,603106, Нижегородская обл, г Нижний Новгород, Советский р-н, ул Надежды Сусловой, д 5 к 3",
				"channelid": "000000001",
				"custaccount": "К0002662",
				"exenttype": -1,
				"firstname": "",
				"gender": 0,
				"genderstr": "",
				"guid1chierarchyid": "D7C3D54F-C1A9-11E0-B233-001018890642",
				"guid1cparenthierarchy": "AE215C43-752C-11DF-B9E1-0019B9F502D2",
				"idaxhierarchy": 5637149304,
				"idaxparenthierarchy": 5637147809,
				"individualundertaker": 0,
				"individualundertakerstr": "",
				"inn": "5262067202",
				"instancerelationtype": 2978,
				"instancerelationtypestr": "Организация",
				"kpp": "526201001",
				"lastname": "",
				"middlename": "",
				"name": "МУНИЦИПАЛЬНОЕ АВТОНОМНОЕ ОБЩЕОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ \"ШКОЛА № 44 С УГЛУБЛЕННЫМ ИЗУЧЕНИЕМ ОТДЕЛЬНЫХ ПРЕДМЕТОВ\"",
				"namealias": "МАОУ \"ШКОЛА № 44 С УГЛУБЛЕННЫМ ИЗУЧЕНИЕМ ОТДЕЛЬНЫХ ПРЕДМЕТОВ\"",
				"ogrn": 1025203762210,
				"partynumber": "14032",
				"partynumbermain": "",
				"partytype": 0,
				"partytypestr": "",
				"phone": "7 (831) 2685283",
				"region": 52,
				"snils": "",
				"state": 0,
				"statestr": "Основной",
				"vendaccount": "П0123793",
				"custsource": 0
			}, {key: '5637155661'})

			await this.broker.sendToChannel('dirpartytable-topic', {
				"eventrecid": Math.floor(Math.random() * 10000000000),
				"recid": 123,
				"address": "Россия,603106, Нижегородская обл, г Нижний Новгород, Советский р-н, ул Надежды Сусловой, д 5 к 3",
				"channelid": "000000001",
				"custaccount": "К0002662",
				"exenttype": -1,
				"firstname": "",
				"gender": 0,
				"genderstr": "",
				"guid1chierarchyid": "D7C3D54F-C1A9-11E0-B233-001018890642",
				"guid1cparenthierarchy": "AE215C43-752C-11DF-B9E1-0019B9F502D2",
				"idaxhierarchy": 5637149304,
				"idaxparenthierarchy": 5637147809,
				"individualundertaker": 0,
				"individualundertakerstr": "",
				"inn": "123",
				"instancerelationtype": 2978,
				"instancerelationtypestr": "Организация",
				"kpp": "526201001",
				"lastname": "",
				"middlename": "",
				"name": "МУНИЦИПАЛЬНОЕ АВТОНОМНОЕ ОБЩЕОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ \"ШКОЛА № 44 С УГЛУБЛЕННЫМ ИЗУЧЕНИЕМ ОТДЕЛЬНЫХ ПРЕДМЕТОВ\"",
				"namealias": "МАОУ \"ШКОЛА № 44 С УГЛУБЛЕННЫМ ИЗУЧЕНИЕМ ОТДЕЛЬНЫХ ПРЕДМЕТОВ\"",
				"ogrn": 1025203762210,
				"partynumber": "123",
				"partynumbermain": "",
				"partytype": 0,
				"partytypestr": "",
				"phone": "7 (831) 2685283",
				"region": 52,
				"snils": "",
				"state": 0,
				"statestr": "Основной",
				"vendaccount": "П0123793",
				"custsource": 0
			}, {key: '123'})
		}
	},

	async started() {
		this.process()
	}
}
