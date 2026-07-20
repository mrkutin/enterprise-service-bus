module.exports = {
	name: 'magento.orders.company.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await new Promise(resolve => setTimeout(resolve, 3000))

			// // no dirpartytable and agreement
			// await this.broker.sendToChannel('magento-order-company-one-c-topic', {
			// 	"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
			// 	"timestamp": "06.08.2024T09:53:16",
			// 	"event": "create",
			// 	"data": {
			// 		"OrderId": "Test1",
			// 		"OrderStatusID": 0,
			// 		"CreatedDateTime": "2024-08-06 06:53:16",
			// 		"AmountOrder": 16420,
			// 		"PaymentMethod": 1,
			// 		"ShippingMethod": 0,
			// 		"FirstName": "Константин",
			// 		"PaternalName": " ",
			// 		"LastName": "Черкасов",
			// 		"PhoneNumber": "+7 000 123 12 12",
			// 		"Email": "kcherkasov@oggettoweb.com",
			// 		"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
			// 		"PickupPointId": null,
			// 		"PickupPointName": "",
			// 		"Comment": null,
			// 		"CompanyIdAx": null,
			// 		"CompanyName": "ООО-О Рога и Копыта",
			// 		"CompanyINN": "7725396754",
			// 		"CompanyKPP": "772501001",
			// 		"CompanyContractIdAX": null,
			// 		"DeliveryPrice": 0,
			// 		"DeliveryVatAmount": 0,
			// 		"DiscountPriceOrder": 0,
			// 		"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
			// 		"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
			// 		"CorrectNum": null,
			// 		"Lines": [
			// 			{
			// 				"ItemId": "NM0092549",
			// 				"ContentId": "13-1957-02",
			// 				"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 563,
			// 				"DiscountPrice": 0,
			// 				"Amount": 11260,
			// 				"VatAmount": 1023.64
			// 			},
			// 			{
			// 				"ItemId": "NM0077280",
			// 				"ContentId": "06-0541-01",
			// 				"NameItem": "Смысловое чтение. 3 класс",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 258,
			// 				"DiscountPrice": 0,
			// 				"Amount": 5160,
			// 				"VatAmount": 469.09
			// 			}
			// 		]
			// 	}
			// }, {key: 'Test1'})

			// dirpartytable and agreement
			await this.broker.sendToChannel('magento-order-company-one-c-topic', {
				"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
				"timestamp": "06.08.2024T09:53:16",
				"event": "create",
				"data": {
					"OrderId": "Test2",
					"OrderStatusID": 0,
					"CreatedDateTime": "2024-08-06 06:53:16",
					"AmountOrder": 16420,
					"PaymentMethod": 1,
					"ShippingMethod": 0,
					"FirstName": "Константин",
					"PaternalName": " ",
					"LastName": "Черкасов",
					"PhoneNumber": "+7 000 123 12 12",
					"Email": "kcherkasov@oggettoweb.com",
					"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
					"PickupPointId": null,
					"PickupPointName": "",
					"Comment": null,
					"CompanyIdAx": null,
					"CompanyName": "ООО-О Рога и Копыта",
					"CompanyINN": "5262067202",
					"CompanyKPP": "526201001",
					"CompanyContractIdAX": null,
					"DeliveryPrice": 0,
					"DeliveryVatAmount": 0,
					"DiscountPriceOrder": 0,
					"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
					"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
					"CorrectNum": null,
					"Lines": [
						{
							"ItemId": "NM0092549",
							"ContentId": "13-1957-02",
							"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
							"Quantity": 20,
							"UnitPriceInclTax": 563,
							"DiscountPrice": 0,
							"Amount": 11260,
							"VatAmount": 1023.64
						},
						{
							"ItemId": "NM0077280",
							"ContentId": "06-0541-01",
							"NameItem": "Смысловое чтение. 3 класс",
							"Quantity": 20,
							"UnitPriceInclTax": 258,
							"DiscountPrice": 0,
							"Amount": 5160,
							"VatAmount": 469.09
						}
					]
				}
			}, {key: 'Test2'})
			//
			// await this.broker.sendToChannel('agreement-topic', {
			// 	"eventrecid": Math.floor(Math.random() * 10000000000),
			// 	"recid": 'Test1',
			// 	"agreementamount": 0,
			// 	"agreementclassification": 5637144592,
			// 	"agreementclassificationdescription_psn": "Лицензии на ЭФУ",
			// 	"agreementclassificationname": "Лицензии на ЭФУ",
			// 	"agreementdate": "2023-08-25T00:00:00.000Z",
			// 	"agreementdt": "2023-08-25T16:20:17.000Z",
			// 	"agreementheader": 5641190095,
			// 	"agreementid": "PSVK496620",
			// 	"agreementpool": "",
			// 	"agreementpricetypeid": "00083",
			// 	"agreementstate": 1,
			// 	"agreementstatestr": "Действует",
			// 	"agreementsubject": "",
			// 	"budgetarticleid": 1101000000008,
			// 	"budgetprojectid": 1,
			// 	"cfrid": "040001",
			// 	"channelid": "000000008",
			// 	"classificationname": "Лицензии на ЭФУ",
			// 	"currency": "RUB",
			// 	"currencycodeiso": "RUB",
			// 	"custaccount": "К0002662",
			// 	"defaultagreementlineeffectivedate": "2023-08-25T00:00:00.000Z",
			// 	"defaultagreementlineexpirationdate": "2023-12-31T00:00:00.000Z",
			// 	"deliverydate": "1900-01-01T00:00:00.000Z",
			// 	"documentexternalreference": "Лицензионный 1/3730",
			// 	"documenttitle": "Лицензионный 1/3730",
			// 	"edotype": 0,
			// 	"edotypestr": "",
			// 	"isadditionalagreement": 0,
			// 	"isadditionalagreementstr": "Нет",
			// 	"mainagreementid": "PSVK496620",
			// 	"okzcode": "",
			// 	"party": 5637155661,
			// 	"partynumber": "14032",
			// 	"paymentschedule": "100хПр",
			// 	"paymentterms": "100хПр",
			// 	"psv_agreementsource": 5,
			// 	"psv_edodocstatus": 0,
			// 	"psv_responsibleperson": "",
			// 	"psv_signdate": "1900-01-01T00:00:00.000Z",
			// 	"psv_signstatus": 1,
			// 	"psv_sourcecompanyidall": "psv",
			// 	"relationtypewithindividual": 0,
			// 	"relationtypewithindividualstr": "",
			// 	"salesdistrictid": 52,
			// 	"vattaxagent": 0,
			// 	"vattaxagentstr": "Нет",
			// 	"vendaccount": ""
			// }, {key: "Test1"})

			// 	// dirpartytable and no agreement
			// 	await this.broker.sendToChannel('magento-order-company-one-c-topic', {
			// 		"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
			// 		"timestamp": "06.08.2024T09:53:16",
			// 		"event": "create",
			// 		"data": {
			// 			"OrderId": "Test3",
			// 			"OrderStatusID": 0,
			// 			"CreatedDateTime": "2024-08-06 06:53:16",
			// 			"AmountOrder": 16420,
			// 			"PaymentMethod": 1,
			// 			"ShippingMethod": 0,
			// 			"FirstName": "Константин",
			// 			"PaternalName": " ",
			// 			"LastName": "Черкасов",
			// 			"PhoneNumber": "+7 000 123 12 12",
			// 			"Email": "kcherkasov@oggettoweb.com",
			// 			"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
			// 			"PickupPointId": null,
			// 			"PickupPointName": "",
			// 			"Comment": null,
			// 			"CompanyIdAx": null,
			// 			"CompanyName": "ООО-О Рога и Копыта",
			// 			"CompanyINN": "orderTest3Inn",
			// 			"CompanyKPP": "orderTest3Kpp",
			// 			"CompanyContractIdAX": null,
			// 			"DeliveryPrice": 0,
			// 			"DeliveryVatAmount": 0,
			// 			"DiscountPriceOrder": 0,
			// 			"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
			// 			"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
			// 			"CorrectNum": null,
			// 			"Lines": [
			// 				{
			// 					"ItemId": "NM0092549",
			// 					"ContentId": "13-1957-02",
			// 					"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
			// 					"Quantity": 20,
			// 					"UnitPriceInclTax": 563,
			// 					"DiscountPrice": 0,
			// 					"Amount": 11260,
			// 					"VatAmount": 1023.64
			// 				},
			// 				{
			// 					"ItemId": "NM0077280",
			// 					"ContentId": "06-0541-01",
			// 					"NameItem": "Смысловое чтение. 3 класс",
			// 					"Quantity": 20,
			// 					"UnitPriceInclTax": 258,
			// 					"DiscountPrice": 0,
			// 					"Amount": 5160,
			// 					"VatAmount": 469.09
			// 				}
			// 			]
			// 		}
			// 	}, {key: 'Test3'})
			//
			// await this.broker.sendToChannel('dirpartytable-topic', {
			// 	"eventrecid": Math.floor(Math.random() * 10000000000),
			// 	"recid": "Test3",
			// 	"address": "Россия,678300, Респ Саха /Якутия/, Кобяйский улус, пгт Сангар, ул Ленина, зд 51",
			// 	"channelid": "000000001",
			// 	"custaccount": "К0136100",
			// 	"exenttype": -1,
			// 	"firstname": "",
			// 	"gender": 0,
			// 	"genderstr": "",
			// 	"guid1chierarchyid": "99E1238D-0DD9-11E0-913C-0019B9F502D2",
			// 	"guid1cparenthierarchy": "48535513-C673-11EA-8116-0050569C74C7",
			// 	"idaxhierarchy": 5637147584,
			// 	"idaxparenthierarchy": 5637144576,
			// 	"individualundertaker": 0,
			// 	"individualundertakerstr": "",
			// 	"inn": "orderTest3Inn",
			// 	"instancerelationtype": 2978,
			// 	"instancerelationtypestr": "Организация",
			// 	"kpp": "orderTest3Kpp",
			// 	"lastname": "",
			// 	"middlename": "",
			// 	"name": "МУНИЦИПАЛЬНОЕ БЮДЖЕТНОЕ ОБЩЕОБРАЗОВАТЕЛЬНОЕ УЧРЕЖДЕНИЕ \"САНГАРСКАЯ СРЕДНЯЯ ОБЩЕОБРАЗОВАТЕЛЬНАЯ ШКОЛА №1\"",
			// 	"namealias": "МБОУ \"САНГАРСКАЯ СОШ №1\"",
			// 	"ogrn": 1021400673480,
			// 	"partynumber": 123123,
			// 	"partynumbermain": "",
			// 	"partytype": 0,
			// 	"partytypestr": "",
			// 	"phone": "",
			// 	"region": 14,
			// 	"snils": "",
			// 	"state": 0,
			// 	"statestr": "Основной",
			// 	"vendaccount": "",
			// 	"idaxhierarchy_original": "5637147584",
			// 	"idaxparenthierarchy_original": "5637144576",
			// 	"inn_original": "1413021290",
			// 	"instancerelationtype_original": "2978",
			// 	"kpp_original": "141301001",
			// 	"ogrn_original": "1021400673480",
			// 	"partynumber_original": "223575",
			// 	"recid_original": "5639181903",
			// 	"region_original": "14"
			// }, {key: 'Test3'})

			// // order with non-empty CompanyContractIdAX
			// await this.broker.sendToChannel('magento-order-company-one-c-topic', {
			// 	"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
			// 	"timestamp": "06.08.2024T09:53:16",
			// 	"event": "create",
			// 	"data": {
			// 		"OrderId": "Test4",
			// 		"OrderStatusID": 0,
			// 		"CreatedDateTime": "2024-08-06 06:53:16",
			// 		"AmountOrder": 16420,
			// 		"PaymentMethod": 1,
			// 		"ShippingMethod": 0,
			// 		"FirstName": "Константин",
			// 		"PaternalName": " ",
			// 		"LastName": "Черкасов",
			// 		"PhoneNumber": "+7 000 123 12 12",
			// 		"Email": "kcherkasov@oggettoweb.com",
			// 		"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
			// 		"PickupPointId": null,
			// 		"PickupPointName": "",
			// 		"Comment": null,
			// 		"CompanyIdAx": null,
			// 		"CompanyName": "ООО-О Рога и Копыта",
			// 		"CompanyINN": "orderTest3Inn",
			// 		"CompanyKPP": "orderTest3Kpp",
			// 		"CompanyContractIdAX": 'PSVK571001',
			// 		"DeliveryPrice": 0,
			// 		"DeliveryVatAmount": 0,
			// 		"DiscountPriceOrder": 0,
			// 		"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
			// 		"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
			// 		"CorrectNum": null,
			// 		"Lines": [
			// 			{
			// 				"ItemId": "NM0092549",
			// 				"ContentId": "13-1957-02",
			// 				"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 563,
			// 				"DiscountPrice": 0,
			// 				"Amount": 11260,
			// 				"VatAmount": 1023.64
			// 			},
			// 			{
			// 				"ItemId": "NM0077280",
			// 				"ContentId": "06-0541-01",
			// 				"NameItem": "Смысловое чтение. 3 класс",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 258,
			// 				"DiscountPrice": 0,
			// 				"Amount": 5160,
			// 				"VatAmount": 469.09
			// 			}
			// 		]
			// 	}
			// }, {key: 'Test4'})

			// // two orders for 1 dirpartytable and agreement
			// await this.broker.sendToChannel('magento-order-company-one-c-topic', {
			// 	"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
			// 	"timestamp": "06.08.2024T09:53:16",
			// 	"event": "create",
			// 	"data": {
			// 		"OrderId": "Test5",
			// 		"OrderStatusID": 0,
			// 		"CreatedDateTime": "2024-08-06 06:53:16",
			// 		"AmountOrder": 16420,
			// 		"PaymentMethod": 1,
			// 		"ShippingMethod": 0,
			// 		"FirstName": "Константин",
			// 		"PaternalName": " ",
			// 		"LastName": "Черкасов",
			// 		"PhoneNumber": "+7 000 123 12 12",
			// 		"Email": "kcherkasov@oggettoweb.com",
			// 		"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
			// 		"PickupPointId": null,
			// 		"PickupPointName": "",
			// 		"Comment": null,
			// 		"CompanyIdAx": null,
			// 		"CompanyName": "ООО-О Рога и Копыта",
			// 		"CompanyINN": "1413021290",
			// 		"CompanyKPP": "141301001",
			// 		"CompanyContractIdAX": null,
			// 		"DeliveryPrice": 0,
			// 		"DeliveryVatAmount": 0,
			// 		"DiscountPriceOrder": 0,
			// 		"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
			// 		"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
			// 		"CorrectNum": null,
			// 		"Lines": [
			// 			{
			// 				"ItemId": "NM0092549",
			// 				"ContentId": "13-1957-02",
			// 				"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 563,
			// 				"DiscountPrice": 0,
			// 				"Amount": 11260,
			// 				"VatAmount": 1023.64
			// 			},
			// 			{
			// 				"ItemId": "NM0077280",
			// 				"ContentId": "06-0541-01",
			// 				"NameItem": "Смысловое чтение. 3 класс",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 258,
			// 				"DiscountPrice": 0,
			// 				"Amount": 5160,
			// 				"VatAmount": 469.09
			// 			}
			// 		]
			// 	}
			// }, {key: 'Test5'})
			//
			// await this.broker.sendToChannel('magento-order-company-one-c-topic', {
			// 	"number": "8ef7cf86-53c0-11ef-af38-da884244b1f5",
			// 	"timestamp": "06.08.2024T09:53:16",
			// 	"event": "create",
			// 	"data": {
			// 		"OrderId": "Test6",
			// 		"OrderStatusID": 0,
			// 		"CreatedDateTime": "2024-08-06 06:53:16",
			// 		"AmountOrder": 16420,
			// 		"PaymentMethod": 1,
			// 		"ShippingMethod": 0,
			// 		"FirstName": "Константин",
			// 		"PaternalName": " ",
			// 		"LastName": "Черкасов",
			// 		"PhoneNumber": "+7 000 123 12 12",
			// 		"Email": "kcherkasov@oggettoweb.com",
			// 		"Address": "344022,Россия,Ростовская область,Ростов-на-Дону,ул. Красноармейская 232",
			// 		"PickupPointId": null,
			// 		"PickupPointName": "",
			// 		"Comment": null,
			// 		"CompanyIdAx": null,
			// 		"CompanyName": "ООО-О Рога и Копыта",
			// 		"CompanyINN": "1413021290",
			// 		"CompanyKPP": "141301001",
			// 		"CompanyContractIdAX": null,
			// 		"DeliveryPrice": 0,
			// 		"DeliveryVatAmount": 0,
			// 		"DiscountPriceOrder": 0,
			// 		"Fias": "c1cfe4b9-f7c2-423c-abfa-6ed1c05a15c5",
			// 		"Region": "f10763dc-63e3-48db-83e1-9c566fe3092b",
			// 		"CorrectNum": null,
			// 		"Lines": [
			// 			{
			// 				"ItemId": "NM0092549",
			// 				"ContentId": "13-1957-02",
			// 				"NameItem": "Вероятность и статистика. 7-9 классы. В 2-х частях. Ч.2",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 563,
			// 				"DiscountPrice": 0,
			// 				"Amount": 11260,
			// 				"VatAmount": 1023.64
			// 			},
			// 			{
			// 				"ItemId": "NM0077280",
			// 				"ContentId": "06-0541-01",
			// 				"NameItem": "Смысловое чтение. 3 класс",
			// 				"Quantity": 20,
			// 				"UnitPriceInclTax": 258,
			// 				"DiscountPrice": 0,
			// 				"Amount": 5160,
			// 				"VatAmount": 469.09
			// 			}
			// 		]
			// 	}
			// }, {key: 'Test6'})


			// await this.broker.sendToChannel('agreement-topic', {
			// 	"eventrecid": Math.floor(Math.random() * 10000000000),
			// 	"recid": 5639029134,
			// 	"agreementamount": 0,
			// 	"agreementclassification": 5637160359,
			// 	"agreementclassificationdescription_psn": "Интернет-магазин Юридические лица",
			// 	"agreementclassificationname": ",",
			// 	"agreementdate": "2024-08-06T00:00:00.000Z",
			// 	"agreementdt": "2024-11-15T10:32:20.000Z",
			// 	"agreementheader": 5642124576,
			// 	"agreementid": "PSVK571264",
			// 	"agreementpool": "",
			// 	"agreementpricetypeid": "",
			// 	"agreementstate": 1,
			// 	"agreementstatestr": "Действует",
			// 	"agreementsubject": "",
			// 	"budgetarticleid": 1101010100005,
			// 	"budgetprojectid": 1,
			// 	"cfrid": "020602",
			// 	"channelid": "000000008",
			// 	"classificationname": ",",
			// 	"currency": "RUB",
			// 	"currencycodeiso": "RUB",
			// 	"custaccount": "К0136100",
			// 	"custvendsource": 10,
			// 	"defaultagreementlineeffectivedate": "2024-08-06T00:00:00.000Z",
			// 	"defaultagreementlineexpirationdate": "2154-12-31T00:00:00.000Z",
			// 	"deliverydate": "1900-01-01T00:00:00.000Z",
			// 	"documentexternalreference": "Договор интернет-магазина",
			// 	"documenttitle": "Договор интернет-магазина",
			// 	"edotype": 0,
			// 	"edotypestr": "",
			// 	"isadditionalagreement": 0,
			// 	"isadditionalagreementstr": "Нет",
			// 	"mainagreementid": "",
			// 	"okzcode": "",
			// 	"party": 5639181903,
			// 	"partynumber": "223575",
			// 	"paymentschedule": "100хПр",
			// 	"paymentterms": "100хПр",
			// 	"psv_1cerp_agrkind": 10,
			// 	"psv_1cerp_agrtype": 10,
			// 	"psv_agreementsource": 5,
			// 	"psv_edodocstatus": 0,
			// 	"psv_responsibleperson": "Гилязов Марсель Альфретович",
			// 	"psv_signdate": "1900-01-01T00:00:00.000Z",
			// 	"psv_signstatus": 1,
			// 	"psv_sourcecompanyidall": "psv",
			// 	"relationtypewithindividual": 0,
			// 	"relationtypewithindividualstr": "",
			// 	"salesdeliverydate": "1900-01-01T00:00:00.000Z",
			// 	"salesdistrictid": 14,
			// 	"vattaxagent": 0,
			// 	"vattaxagentstr": "Нет",
			// 	"vendaccount": ""
			// }, {key: "4123412"})
		}
	},

	async started() {
		this.process()
	}
}
