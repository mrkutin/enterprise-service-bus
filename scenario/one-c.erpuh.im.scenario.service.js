module.exports = {
	name: 'one-c.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await new Promise(resolve => setTimeout(resolve, 3000))

			// for (let i = 1; i <= 1; i++) {
			// 	await this.broker.sendToChannel('magento-refund-one-c-topic', {
			// 		'number': 'e7c7e99e-eb46-11ee-994b-d00d1c057ba0',
			// 		'timestamp': '26.03.2024T11:00:26',
			// 		'event': 'update',
			// 		'data': {
			// 			'OrderId': '24-0311293',
			// 			'CreatedDateTime': '2024-02-12 13:45:13',
			// 			'ReturnId': '24-0311293-в1',
			// 			'OrderStatusID': 11,
			// 			'ItemsReturnToWMS': true,
			// 			'ProductAmountReturn': 589,
			// 			'Lines': [
			// 				{
			// 					'ItemId': 'NM0092548',
			// 					'UnitPriceInclTax': 589,
			// 					'Quantity': 1,
			// 					'Amount': 535.45,
			// 					'VAT': 53.55
			// 				}
			// 			]
			// 		}
			// 	}, {key: `Test${i}`})
			// }

			for (let i = 1; i <= 1; i++) {
				await this.broker.sendToChannel('magento-order-company-one-c-topic', {
					'number': 'e588ee36-9f8a-11f0-bb7b-0242be5a4866',
					'timestamp': '02.10.2025T15:25:35',
					'event': 'create',
					'data': {
						'OrderId': `Test${i}`,
						'OrderStatusID': 0,
						'CreatedDateTime': '2025-10-02 12:25:33',
						'AmountOrder': 82493.99,
						'PaymentMethod': 4,
						'ShippingMethod': 1,
						'FirstName': 'Иван',
						'PaternalName': 'Николаевич',
						'LastName': 'Баев',
						'PhoneNumber': '+7 (903) 977-57-95',
						'Email': 'centrobook@yandex.ru',
						'Address': '129515,Россия,Москва,Москва,ул 1-я Останкинская, д 53,з-39',
						'PickupPointId': null,
						'PickupPointName': '',
						'Comment': null,
						'DeliveryPrice': 2466.13,
						'DeliveryVatAmount': 411.02,
						'DiscountPriceOrder': 0,
						'Fias': '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
						'Region': '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
						'CorrectNum': null,
						'Lines': [
							{
								'ItemId': 'NM0163836',
								'ContentId': '15-1846-02',
								'NameItem': 'История. История России. IX — начало XVI в. 6 класс',
								'Quantity': 52,
								'UnitPriceInclTax': 189.75,
								'DiscountPrice': 0,
								'Amount': 9867,
								'VatAmount': 897
							},
							{
								'ItemId': 'NM0163837',
								'ContentId': '15-1847-02',
								'NameItem': 'История. История России. XVI—XVII вв. 7 класс',
								'Quantity': 90,
								'UnitPriceInclTax': 214.94,
								'DiscountPrice': 0,
								'Amount': 19344.6,
								'VatAmount': 1758.6
							},
							{
								'ItemId': 'NM0163835',
								'ContentId': '15-1845-02',
								'NameItem': 'История. Всеобщая история. История Нового времени. XIX — начало XX в. 9 класс',
								'Quantity': 50,
								'UnitPriceInclTax': 227.59,
								'DiscountPrice': 0,
								'Amount': 11379.5,
								'VatAmount': 1034.5
							},
							{
								'ItemId': 'NM0164550',
								'ContentId': '16-0941-01',
								'NameItem': 'Семьеведение. Моя семья. 8-9 классы. Учебное пособие',
								'Quantity': 10,
								'UnitPriceInclTax': 550,
								'DiscountPrice': 0,
								'Amount': 5500,
								'VatAmount': 500
							},
							{
								'ItemId': 'NM0163834',
								'ContentId': '15-1844-02',
								'NameItem': 'История. Всеобщая история. История Нового времени. XVIII — начало XIX в. 8 класс',
								'Quantity': 160,
								'UnitPriceInclTax': 189.75,
								'DiscountPrice': 0,
								'Amount': 30360,
								'VatAmount': 2760
							},
							{
								'ItemId': 'NM0183971',
								'ContentId': '13-1963-02',
								'NameItem': 'Математика. Геометрия. 7 класс. Углублённый уровень. Учебное пособие. В 2 частях. Часть 2',
								'Quantity': 2,
								'UnitPriceInclTax': 629.2,
								'DiscountPrice': 0,
								'Amount': 1258.4,
								'VatAmount': 114.4
							},
							{
								'ItemId': 'NM0164386',
								'ContentId': '13-2143-01',
								'NameItem': 'Математика. Геометрия. 7 класс. Базовый уровень. Учебное пособие. В 2 частях. Часть 1',
								'Quantity': 3,
								'UnitPriceInclTax': 579.59,
								'DiscountPrice': 0,
								'Amount': 1738.77,
								'VatAmount': 158.07
							},
							{
								'ItemId': 'NM0164387',
								'ContentId': '13-2144-01',
								'NameItem': 'Математика. Геометрия. 7 класс. Базовый уровень. Учебное пособие. В 2 частях. Часть 2',
								'Quantity': 1,
								'UnitPriceInclTax': 579.59,
								'DiscountPrice': 0,
								'Amount': 579.59,
								'VatAmount': 52.69
							}
						],
						'CompanyIdAx': '341593',
						'CompanyName': 'ИП Баев Иван Николаевич',
						'CompanyINN': '772585209893',
						'CompanyKPP': null,
						'InvoiceLink': 'https://magento.prosv.ru/banktransfer_b2b/generate/excel/?order_id=25-464530&protected_code=161a377a90438f2bceb9c42072214ea8',
						'CompanyContractIdAX': 'PSVK655316'
					}
				}, {key: `Test${i}`})
			}

			// for (let i = 1; i <= 10; i++) {
			// 	await this.broker.sendToChannel('magento-order-one-c-topic', {
			// 		'number': '849ec1ec-aed5-11ee-beaf-2667bfac6298',
			// 		'timestamp': '09.01.2024T12:57:37',
			// 		'event': 'create',
			// 		'data': {
			// 			'OrderId': '24-0000287-23',
			// 			'OrderStatusID': 0,
			// 			'CreatedDateTime': '2024-01-09 09:57:36',
			// 			'AmountOrder': 1490.84,
			// 			'PaymentMethod': 1,
			// 			'ShippingMethod': 1,
			// 			'FirstName': 'Анна',
			// 			'PaternalName': 'Николаевна',
			// 			'LastName': 'Лукьянчук',
			// 			'PhoneNumber': '+7 (919) 874-44-98',
			// 			'Email': 'ashalagina@oggettoweb.com',
			// 			'Address': '125047,Россия,Москва,Москва,ул 1-я Тверская-Ямская, д 2А',
			// 			'PickupPointId': null,
			// 			'PickupPointName': '',
			// 			'Comment': null,
			// 			'DeliveryPrice': 270.84,
			// 			'DeliveryVatAmount': 45.14,
			// 			'DiscountPriceOrder': 0,
			// 			'Fias': '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
			// 			'Region': '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
			// 			'CorrectNum': null,
			// 			'Lines': [
			// 				{
			// 					'ItemId': 'NM0079573',
			// 					'ContentId': '301-1070-01',
			// 					'NameItem': 'Про Петю и папу. Рассказы',
			// 					'Quantity': 1,
			// 					'UnitPriceInclTax': 610,
			// 					'DiscountPrice': 0,
			// 					'Amount': 610,
			// 					'VatAmount': 55.45
			// 				},
			// 				{
			// 					'ItemId': 'NM0077980',
			// 					'ContentId': '301-1062-01',
			// 					'NameItem': 'Мой друг телефон: Рассказы',
			// 					'Quantity': 1,
			// 					'UnitPriceInclTax': 610,
			// 					'DiscountPrice': 0,
			// 					'Amount': 610,
			// 					'VatAmount': 55.46
			// 				}
			// 			]
			// 		}
			// 	}, {key: `Test${i}`})
			// }
		}
	},

	async started() {
		this.process()
	}
}
