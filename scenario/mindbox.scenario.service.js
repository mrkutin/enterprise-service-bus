const { v4: uuidv4 } = require('uuid')

module.exports = {
	name: 'mindbox.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await new Promise(resolve => setTimeout(resolve, 3000))

			// // test authorization with non exists user
			// await this.broker.sendToChannel('id-authorize-customer-topic', {
			// 	"time": 1728642859,
			// 	"actor": uuidv4(),
			// 	"consumer": uuidv4(),
			// 	"deviceUUID": uuidv4(),
			// 	"attributes": {
			// 		"nameFirst": "Test non exists user",
			// 		"nameLast": "Test non exists user",
			// 		"namePatronymic": null,
			// 		"sex": null,
			// 		"birthday": null,
			// 		"role": [
			// 			{
			// 				"uuid": "655298c2-e56d-4a18-853e-3322a4e130cd",
			// 				"name": "Родитель"
			// 			}
			// 		],
			// 		"parentCommittee": null,
			// 		"children": [],
			// 		"region": [
			// 			{
			// 				"uuid": "0a97be15-7230-56fc-af98-be62af58c88b",
			// 				"kladr": "5200000000000",
			// 				"name": "Нижегородская область"
			// 			}
			// 		],
			// 		"email": [
			// 			{
			// 				"value": "undefined@gmail.com",
			// 				"confirmed": true
			// 			}
			// 		],
			// 		"phone": [],
			// 		"mailing": [
			// 			{
			// 				"uuid": "309d006e-a04b-47ed-8061-5f43a391f2b0",
			// 				"name": "Анонсы вебинаров и онлайн-мероприятий педагогам"
			// 			},
			// 			{
			// 				"uuid": "f1409d47-650c-4d55-aac5-fcc008b6055e",
			// 				"name": "Информация о новинках и акциях"
			// 			},
			// 			{
			// 				"uuid": "e1489848-ab58-434f-ab13-8eb871e71d33",
			// 				"name": "Новости образования"
			// 			},
			// 			{
			// 				"uuid": "9ea8c005-8308-49fb-aa9d-d25b85858ae5",
			// 				"name": "Методическая помощь педагогам"
			// 			},
			// 			{
			// 				"uuid": "eccbf03c-83be-4957-8b69-f2205e98afe3",
			// 				"name": "Дошкольное образование"
			// 			},
			// 			{
			// 				"uuid": "59fac280-937b-48fc-8681-5a75285d9923",
			// 				"name": "Начальное общее образование (1-4 классы)"
			// 			},
			// 			{
			// 				"uuid": "409a5f23-e269-463f-a95b-4383f3645d8d",
			// 				"name": "Основное общее образование (5-9 классы)"
			// 			},
			// 			{
			// 				"uuid": "b0e7206e-6f57-4e9e-aa52-ffee274625f6",
			// 				"name": "Общее среднее образование (9-11 классы)"
			// 			},
			// 			{
			// 				"uuid": "e5e1720d-e90b-4afb-b3e0-deb81ea8fa43",
			// 				"name": "Педагогика и психология, ОВЗ"
			// 			},
			// 			{
			// 				"uuid": "ba92a517-c265-4144-a418-a9d7a4542486",
			// 				"name": "Онлайн-проекты для детей и родителей"
			// 			},
			// 			{
			// 				"uuid": "04ee8506-ce00-4b95-8313-1e025d32aeb6",
			// 				"name": "Электронный учебник"
			// 			},
			// 			{
			// 				"uuid": "2d44665b-6f88-412e-ab01-208017c8ceaf",
			// 				"name": "Аудиоучебник"
			// 			},
			// 			{
			// 				"uuid": "4b57ef43-2116-45ee-9d2f-57eedb033b4e",
			// 				"name": "Домашние задания"
			// 			},
			// 			{
			// 				"uuid": "34d2d21a-eb05-47a4-91dd-5cb62d4f6061",
			// 				"name": "Я сдам ЕГЭ"
			// 			},
			// 			{
			// 				"uuid": "e7f2e782-0a27-48e4-9418-180a73234e38",
			// 				"name": "Учим стихи"
			// 			},
			// 			{
			// 				"uuid": "86044cc8-ca6f-4ce2-b572-e171fa11604d",
			// 				"name": "ПРОвоспитание"
			// 			},
			// 			{
			// 				"uuid": "bcc31c32-2d97-4d25-9898-d34a62564bed",
			// 				"name": "Лаборатория проектов"
			// 			},
			// 			{
			// 				"uuid": "644ed411-2f87-465a-91de-3e6d934b0acb",
			// 				"name": "Функциональная грамотность"
			// 			},
			// 			{
			// 				"uuid": "919afbbc-d66c-4121-963a-e5826c4cd158",
			// 				"name": "Начинайзер"
			// 			},
			// 			{
			// 				"uuid": "8f97d629-8cab-4b5f-92d3-42fdcc46b55a",
			// 				"name": "К школе готов"
			// 			}
			// 		]
			// 	},
			// 	"legalEntity": false
			// }, {key: 'Test1'})


			// // test authorization with exists user
			// await this.broker.sendToChannel('id-authorize-customer-topic', {
			// 	"time": 1728644757,
			// 	"actor": "60f6d573-2f56-4963-bdb1-1c290fbc8e10",
			// 	"deviceUUID": "3e1867da-f154-4b36-b3c4-ae21cc93a125",
			// 	"attributes": {
			// 		"nameFirst": "Павел",
			// 		"nameLast": "К.",
			// 		"namePatronymic": "Николаевич",
			// 		"sex": "male",
			// 		"birthday": "1984-04-17",
			// 		"role": [
			// 			{
			// 				"uuid": "655298c2-e56d-4a18-853e-3322a4e130cd",
			// 				"name": "Родитель"
			// 			}
			// 		],
			// 		"parentCommittee": false,
			// 		"children": [
			// 			{
			// 				"name": "Павел Корчагин",
			// 				"birthday": "2012-08-30"
			// 			},
			// 			{
			// 				"name": "Артем Корчагин",
			// 				"birthday": "2010-04-17"
			// 			}
			// 		],
			// 		"region": [
			// 			{
			// 				"uuid": "fca5436c-2d1c-5982-823c-117351c97a5f",
			// 				"kladr": "6600000000000",
			// 				"name": "Свердловская область"
			// 			}
			// 		],
			// 		"email": [
			// 			{
			// 				"value": "kpn9536091862@yandex.ru",
			// 				"confirmed": true
			// 			}
			// 		],
			// 		"phone": [
			// 			{
			// 				"value": "+79536091862",
			// 				"formatted": "8 (953) 609-18-62",
			// 				"type": 1,
			// 				"carrier": "Motiv",
			// 				"confirmed": false
			// 			}
			// 		],
			// 		"mailing": [
			// 			{
			// 				"uuid": "309d006e-a04b-47ed-8061-5f43a391f2b0",
			// 				"name": "Анонсы вебинаров и онлайн-мероприятий педагогам"
			// 			},
			// 			{
			// 				"uuid": "f1409d47-650c-4d55-aac5-fcc008b6055e",
			// 				"name": "Информация о новинках и акциях"
			// 			},
			// 			{
			// 				"uuid": "e1489848-ab58-434f-ab13-8eb871e71d33",
			// 				"name": "Новости образования"
			// 			},
			// 			{
			// 				"uuid": "9ea8c005-8308-49fb-aa9d-d25b85858ae5",
			// 				"name": "Методическая помощь педагогам"
			// 			},
			// 			{
			// 				"uuid": "eccbf03c-83be-4957-8b69-f2205e98afe3",
			// 				"name": "Дошкольное образование"
			// 			},
			// 			{
			// 				"uuid": "59fac280-937b-48fc-8681-5a75285d9923",
			// 				"name": "Начальное общее образование (1-4 классы)"
			// 			},
			// 			{
			// 				"uuid": "409a5f23-e269-463f-a95b-4383f3645d8d",
			// 				"name": "Основное общее образование (5-9 классы)"
			// 			},
			// 			{
			// 				"uuid": "b0e7206e-6f57-4e9e-aa52-ffee274625f6",
			// 				"name": "Общее среднее образование (9-11 классы)"
			// 			},
			// 			{
			// 				"uuid": "e5e1720d-e90b-4afb-b3e0-deb81ea8fa43",
			// 				"name": "Педагогика и психология, ОВЗ"
			// 			},
			// 			{
			// 				"uuid": "ba92a517-c265-4144-a418-a9d7a4542486",
			// 				"name": "Онлайн-проекты для детей и родителей"
			// 			},
			// 			{
			// 				"uuid": "04ee8506-ce00-4b95-8313-1e025d32aeb6",
			// 				"name": "Электронный учебник"
			// 			},
			// 			{
			// 				"uuid": "2d44665b-6f88-412e-ab01-208017c8ceaf",
			// 				"name": "Аудиоучебник"
			// 			},
			// 			{
			// 				"uuid": "4b57ef43-2116-45ee-9d2f-57eedb033b4e",
			// 				"name": "Домашние задания"
			// 			},
			// 			{
			// 				"uuid": "34d2d21a-eb05-47a4-91dd-5cb62d4f6061",
			// 				"name": "Я сдам ЕГЭ"
			// 			},
			// 			{
			// 				"uuid": "e7f2e782-0a27-48e4-9418-180a73234e38",
			// 				"name": "Учим стихи"
			// 			},
			// 			{
			// 				"uuid": "86044cc8-ca6f-4ce2-b572-e171fa11604d",
			// 				"name": "ПРОвоспитание"
			// 			},
			// 			{
			// 				"uuid": "bcc31c32-2d97-4d25-9898-d34a62564bed",
			// 				"name": "Лаборатория проектов"
			// 			},
			// 			{
			// 				"uuid": "644ed411-2f87-465a-91de-3e6d934b0acb",
			// 				"name": "Функциональная грамотность"
			// 			},
			// 			{
			// 				"uuid": "919afbbc-d66c-4121-963a-e5826c4cd158",
			// 				"name": "Начинайзер"
			// 			},
			// 			{
			// 				"uuid": "8f97d629-8cab-4b5f-92d3-42fdcc46b55a",
			// 				"name": "К школе готов"
			// 			}
			// 		]
			// 	},
			// 	"legalEntity": false
			// }, {key: 'Test1'})

			// // id-register-customer-topic
			// for (let i = 1; i <= 1; i++) {
			// 	await this.broker.sendToChannel('id-register-customer-topic', {
			// 		"time": 1718963861,
			// 		"actor": uuidv4(),
			// 		"consumer": uuidv4(),
			// 		"deviceUUID": uuidv4(),
			// 		"attributes": {
			// 			"nameFirst": "bus-test",
			// 			"nameLast": "bus-test",
			// 			"namePatronymic": "bus-test",
			// 			"sex": "female",
			// 			"birthday": "1976-10-17",
			// 			"role": [
			// 				{
			// 					"uuid": "53ed17da-4e1b-4f42-8a4e-dfc155aa1a74",
			// 					"name": "Воспитатель ДОУ"
			// 				}
			// 			],
			// 			"email": [
			// 				{
			// 					"value": "kandrashina_1976@mail.ru",
			// 					"confirmed": true
			// 				}
			// 			],
			// 			"phone": [
			// 				{
			// 					"value": "+79372146853",
			// 					"formatted": "8 (937) 214-68-53",
			// 					"type": 1,
			// 					"carrier": "MegaFon",
			// 					"confirmed": false
			// 				}
			// 			],
			// 			"mailing": [
			// 				{
			// 					"uuid": "309d006e-a04b-47ed-8061-5f43a391f2b0",
			// 					"name": "Анонсы вебинаров и онлайн-мероприятий педагогам"
			// 				},
			// 				{
			// 					"uuid": "f1409d47-650c-4d55-aac5-fcc008b6055e",
			// 					"name": "Информация о новинках и акциях"
			// 				},
			// 				{
			// 					"uuid": "e1489848-ab58-434f-ab13-8eb871e71d33",
			// 					"name": "Новости образования"
			// 				},
			// 				{
			// 					"uuid": "9ea8c005-8308-49fb-aa9d-d25b85858ae5",
			// 					"name": "Методическая помощь педагогам"
			// 				},
			// 				{
			// 					"uuid": "eccbf03c-83be-4957-8b69-f2205e98afe3",
			// 					"name": "Дошкольное образование"
			// 				},
			// 				{
			// 					"uuid": "59fac280-937b-48fc-8681-5a75285d9923",
			// 					"name": "Начальное общее образование (1-4 классы)"
			// 				},
			// 				{
			// 					"uuid": "409a5f23-e269-463f-a95b-4383f3645d8d",
			// 					"name": "Основное общее образование (5-9 классы)"
			// 				},
			// 				{
			// 					"uuid": "b0e7206e-6f57-4e9e-aa52-ffee274625f6",
			// 					"name": "Общее среднее образование (9-11 классы)"
			// 				},
			// 				{
			// 					"uuid": "e5e1720d-e90b-4afb-b3e0-deb81ea8fa43",
			// 					"name": "Педагогика и психология, ОВЗ"
			// 				},
			// 				{
			// 					"uuid": "ba92a517-c265-4144-a418-a9d7a4542486",
			// 					"name": "Онлайн-проекты для детей и родителей"
			// 				},
			// 				{
			// 					"uuid": "04ee8506-ce00-4b95-8313-1e025d32aeb6",
			// 					"name": "Электронный учебник"
			// 				},
			// 				{
			// 					"uuid": "2d44665b-6f88-412e-ab01-208017c8ceaf",
			// 					"name": "Аудиоучебник"
			// 				},
			// 				{
			// 					"uuid": "4b57ef43-2116-45ee-9d2f-57eedb033b4e",
			// 					"name": "Домашние задания"
			// 				},
			// 				{
			// 					"uuid": "34d2d21a-eb05-47a4-91dd-5cb62d4f6061",
			// 					"name": "Я сдам ЕГЭ"
			// 				},
			// 				{
			// 					"uuid": "e7f2e782-0a27-48e4-9418-180a73234e38",
			// 					"name": "Учим стихи"
			// 				},
			// 				{
			// 					"uuid": "86044cc8-ca6f-4ce2-b572-e171fa11604d",
			// 					"name": "ПРОвоспитание"
			// 				},
			// 				{
			// 					"uuid": "bcc31c32-2d97-4d25-9898-d34a62564bed",
			// 					"name": "Лаборатория проектов"
			// 				},
			// 				{
			// 					"uuid": "644ed411-2f87-465a-91de-3e6d934b0acb",
			// 					"name": "Функциональная грамотность"
			// 				},
			// 				{
			// 					"uuid": "919afbbc-d66c-4121-963a-e5826c4cd158",
			// 					"name": "Начинайзер"
			// 				},
			// 				{
			// 					"uuid": "8f97d629-8cab-4b5f-92d3-42fdcc46b55a",
			// 					"name": "К школе готов"
			// 				}
			// 			]
			// 		},
			// 		"legalEntity": false
			// 	}, {key: `Test${i}`})
			// }

			// // id-authorize-customer-topic
			// for (let i = 1; i <= 1; i++) {
			// 	await this.broker.sendToChannel('id-authorize-customer-topic', {
			// 		"time": 1719561480,
			// 		"actor": uuidv4(),
			// 		"consumer": uuidv4(),
			// 		"deviceUUID": uuidv4(),
			// 		"attributes": {
			// 			"nameFirst": "Елена",
			// 			"nameLast": "Максимюк",
			// 			"namePatronymic": "Николаевна",
			// 			"sex": "female",
			// 			"birthday": "1979-01-25",
			// 			"role": [
			// 				{
			// 					"uuid": "f3e33297-6921-402a-84f4-f81e7bbbcfdb",
			// 					"name": "Учитель-предметник"
			// 				}
			// 			],
			// 			"email": [
			// 				{
			// 					"value": "lekamax@bk.ru",
			// 					"confirmed": true
			// 				}
			// 			],
			// 			"phone": [],
			// 			"mailing": [
			// 				{
			// 					"uuid": "309d006e-a04b-47ed-8061-5f43a391f2b0",
			// 					"name": "Анонсы вебинаров и онлайн-мероприятий педагогам"
			// 				},
			// 				{
			// 					"uuid": "f1409d47-650c-4d55-aac5-fcc008b6055e",
			// 					"name": "Информация о новинках и акциях"
			// 				},
			// 				{
			// 					"uuid": "e1489848-ab58-434f-ab13-8eb871e71d33",
			// 					"name": "Новости образования"
			// 				},
			// 				{
			// 					"uuid": "9ea8c005-8308-49fb-aa9d-d25b85858ae5",
			// 					"name": "Методическая помощь педагогам"
			// 				},
			// 				{
			// 					"uuid": "04ee8506-ce00-4b95-8313-1e025d32aeb6",
			// 					"name": "Электронный учебник"
			// 				},
			// 				{
			// 					"uuid": "2d44665b-6f88-412e-ab01-208017c8ceaf",
			// 					"name": "Аудиоучебник"
			// 				},
			// 				{
			// 					"uuid": "4b57ef43-2116-45ee-9d2f-57eedb033b4e",
			// 					"name": "Домашние задания"
			// 				},
			// 				{
			// 					"uuid": "34d2d21a-eb05-47a4-91dd-5cb62d4f6061",
			// 					"name": "Я сдам ЕГЭ"
			// 				},
			// 				{
			// 					"uuid": "e7f2e782-0a27-48e4-9418-180a73234e38",
			// 					"name": "Учим стихи"
			// 				},
			// 				{
			// 					"uuid": "86044cc8-ca6f-4ce2-b572-e171fa11604d",
			// 					"name": "ПРОвоспитание"
			// 				},
			// 				{
			// 					"uuid": "bcc31c32-2d97-4d25-9898-d34a62564bed",
			// 					"name": "Лаборатория проектов"
			// 				},
			// 				{
			// 					"uuid": "644ed411-2f87-465a-91de-3e6d934b0acb",
			// 					"name": "Функциональная грамотность"
			// 				}
			// 			]
			// 		}
			// 	}, {key: `Test${i}`})
			// }
			//
			// // id-edit-customer-topic
			// for (let i = 1; i <= 10; i++) {
			// 	await this.broker.sendToChannel('id-edit-customer-topic', {
			// 		"time": 1719561532,
			// 		"actor": uuidv4(),
			// 		"deviceUUID": uuidv4(),
			// 		"attributes": {
			// 			"nameFirst": "bus-test",
			// 			"nameLast": "bus-test",
			// 			"namePatronymic": "bus-test",
			// 			"sex": null,
			// 			"birthday": null,
			// 			"role": [
			// 				{
			// 					"uuid": "f3e33297-6921-402a-84f4-f81e7bbbcfdb",
			// 					"name": "Учитель-предметник"
			// 				}
			// 			],
			// 			"email": [
			// 				{
			// 					"value": "muhina-ov@mail.ru",
			// 					"confirmed": true
			// 				}
			// 			],
			// 			"phone": [],
			// 			"mailing": [
			// 				{
			// 					"uuid": "309d006e-a04b-47ed-8061-5f43a391f2b0",
			// 					"name": "Анонсы вебинаров и онлайн-мероприятий педагогам"
			// 				},
			// 				{
			// 					"uuid": "f1409d47-650c-4d55-aac5-fcc008b6055e",
			// 					"name": "Информация о новинках и акциях"
			// 				},
			// 				{
			// 					"uuid": "e1489848-ab58-434f-ab13-8eb871e71d33",
			// 					"name": "Новости образования"
			// 				},
			// 				{
			// 					"uuid": "9ea8c005-8308-49fb-aa9d-d25b85858ae5",
			// 					"name": "Методическая помощь педагогам"
			// 				},
			// 				{
			// 					"uuid": "eccbf03c-83be-4957-8b69-f2205e98afe3",
			// 					"name": "Дошкольное образование"
			// 				},
			// 				{
			// 					"uuid": "59fac280-937b-48fc-8681-5a75285d9923",
			// 					"name": "Начальное общее образование (1-4 классы)"
			// 				},
			// 				{
			// 					"uuid": "409a5f23-e269-463f-a95b-4383f3645d8d",
			// 					"name": "Основное общее образование (5-9 классы)"
			// 				},
			// 				{
			// 					"uuid": "b0e7206e-6f57-4e9e-aa52-ffee274625f6",
			// 					"name": "Общее среднее образование (9-11 классы)"
			// 				},
			// 				{
			// 					"uuid": "e5e1720d-e90b-4afb-b3e0-deb81ea8fa43",
			// 					"name": "Педагогика и психология, ОВЗ"
			// 				},
			// 				{
			// 					"uuid": "ba92a517-c265-4144-a418-a9d7a4542486",
			// 					"name": "Онлайн-проекты для детей и родителей"
			// 				},
			// 				{
			// 					"uuid": "04ee8506-ce00-4b95-8313-1e025d32aeb6",
			// 					"name": "Электронный учебник"
			// 				},
			// 				{
			// 					"uuid": "2d44665b-6f88-412e-ab01-208017c8ceaf",
			// 					"name": "Аудиоучебник"
			// 				},
			// 				{
			// 					"uuid": "4b57ef43-2116-45ee-9d2f-57eedb033b4e",
			// 					"name": "Домашние задания"
			// 				},
			// 				{
			// 					"uuid": "34d2d21a-eb05-47a4-91dd-5cb62d4f6061",
			// 					"name": "Я сдам ЕГЭ"
			// 				},
			// 				{
			// 					"uuid": "e7f2e782-0a27-48e4-9418-180a73234e38",
			// 					"name": "Учим стихи"
			// 				},
			// 				{
			// 					"uuid": "86044cc8-ca6f-4ce2-b572-e171fa11604d",
			// 					"name": "ПРОвоспитание"
			// 				},
			// 				{
			// 					"uuid": "bcc31c32-2d97-4d25-9898-d34a62564bed",
			// 					"name": "Лаборатория проектов"
			// 				},
			// 				{
			// 					"uuid": "644ed411-2f87-465a-91de-3e6d934b0acb",
			// 					"name": "Функциональная грамотность"
			// 				},
			// 				{
			// 					"uuid": "919afbbc-d66c-4121-963a-e5826c4cd158",
			// 					"name": "Начинайзер"
			// 				},
			// 				{
			// 					"uuid": "8f97d629-8cab-4b5f-92d3-42fdcc46b55a",
			// 					"name": "К школе готов"
			// 				}
			// 			]
			// 		},
			// 		"legalEntity": false
			// 	}, {key: `Test${i}`})
			// }
			//
			// // // // magento-set-cart-topic
			// // // for (let i = 1; i <= 1; i++) {
			// // // 	await this.broker.sendToChannel('magento-set-cart-topic', {
			// // // 		"deviceUUID": uuidv4(),
			// // // 		"customer": {
			// // // 			"email": "test@aseasd.co"
			// // // 		},
			// // // 		"productList": [
			// // // 			{
			// // // 				"product": {
			// // // 					"ids": {
			// // // 						"website": "NM0076583"
			// // // 					}
			// // // 				},
			// // // 				"count": 5,
			// // // 				"pricePerItem": 197.4
			// // // 			},
			// // // 			{
			// // // 				"product": {
			// // // 					"ids": {
			// // // 						"website": "NM0085344"
			// // // 					}
			// // // 				},
			// // // 				"count": 5,
			// // // 				"pricePerItem": 132.6
			// // // 			}
			// // // 		]
			// // // 	}, {key: `Test${i}`})
			// // // }
			// //
			// // // // magento-notify-arrival-topic
			// // // // TODO add scenario record
			// // // // for (let i = 1; i <= 1; i++) {
			// // // // 	await this.broker.sendToChannel('magento-notify-arrival-topic', {}, {key: `Test${i}`})
			// // // // }
			// // //
			// // // magento-create-unauthorized-order-topic
			// // // for (let i = 1; i <= 1; i++) {
			// // // 	await this.broker.sendToChannel('magento-create-unauthorized-order-topic', {
			// // // 		"customer": {
			// // // 			"mobilePhone": "79251861205",
			// // // 			"lastName": "Столярчук",
			// // // 			"firstName": "Эдуард",
			// // // 			"middleName": "Михайлович",
			// // // 			"email": "estolyarchuk@prosv.ru",
			// // // 			"ids": {
			// // // 				"websiteID": uuidv4()
			// // // 			}
			// // // 		},
			// // // 		"order": {
			// // // 			"ids": {
			// // // 				"websiteID": "24-330552"
			// // // 			},
			// // // 			"totalPrice": "324,20",
			// // // 			"discounts": [
			// // // 				{
			// // // 					"type": "<promoCode>",
			// // // 					"promoCode": {
			// // // 						"ids": {
			// // // 							"code": "KNIGA20"
			// // // 						}
			// // // 					},
			// // // 					"amount": "80,80"
			// // // 				}
			// // // 			],
			// // // 			"lines": [
			// // // 				{
			// // // 					"customFields": {
			// // // 						"productType": "simple"
			// // // 					},
			// // // 					"basePricePerItem": "202",
			// // // 					"quantity": "1",
			// // // 					"discountedPricePerLine": "323,20",
			// // // 					"lineId": "1246867",
			// // // 					"lineNumber": "1",
			// // // 					"discounts": [
			// // // 						{
			// // // 							"type": "<promoCode>",
			// // // 							"promoCode": {
			// // // 								"ids": {
			// // // 									"code": "KNIGA20"
			// // // 								}
			// // // 							},
			// // // 							"amount": "80,80"
			// // // 						}
			// // // 					],
			// // // 					"product": {
			// // // 						"ids": {
			// // // 							"website": "NM0095971"
			// // // 						}
			// // // 					}
			// // // 				}
			// // // 			],
			// // // 			"email": "estolyarchuk@prosv.ru",
			// // // 			"mobilePhone": "79251861205"
			// // // 		}
			// // // 	}, {key: `Test${i}`})
			// // // }
			// // //
			// // // // magento-create-authorized-order-topic
			// // // // TODO add scenario record
			// // // // for (let i = 1; i <= 1; i++) {
			// // // // 	await this.broker.sendToChannel('magento-create-authorized-order-topic', {}, {key: `Test${i}`})
			// // // // }
			// // //
			// // // // magento-update-order-topic
			// // // for (let i = 1; i <= 1; i++) {
			// // // 	await this.broker.sendToChannel('magento-update-order-topic', {
			// // // 		"deviceUUID": uuidv4(),
			// // // 		"customer": {
			// // // 			"ids": {
			// // // 				"websiteID": uuidv4()
			// // // 			},
			// // // 			"mobilePhone": "+79094245508",
			// // // 			"lastName": "asd",
			// // // 			"firstName": "asd",
			// // // 			"middleName": "",
			// // // 			"email": "test@aseasd.co"
			// // // 		},
			// // // 		"ids": {
			// // // 			"websiteId": uuidv4()
			// // // 		},
			// // // 		"order": {
			// // // 			"ids": {
			// // // 				"websiteId": "24-299851-PRLKV"
			// // // 			},
			// // // 			"totalPrice": 2727,
			// // // 			"lines": [
			// // // 				{
			// // // 					"customFields": {
			// // // 						"productType": "printedBook"
			// // // 					},
			// // // 					"quantity": 4,
			// // // 					"discountedPricePerLine": 1316,
			// // // 					"product": {
			// // // 						"ids": {
			// // // 							"website": "25-0384-02"
			// // // 						}
			// // // 					},
			// // // 					"lineId": 891421,
			// // // 					"lineNumber": 1,
			// // // 					basePricePerItem: 123,
			// // // 					status: "156316509"
			// // // 				}
			// // // 			]
			// // // 		}
			// // // 	}, {key: `Test${i}`})
			// // // }
			// // // //
			// // // magento-update-order-status-topic
			// for (let i = 1; i <= 10; i++) {
			// 	await this.broker.sendToChannel('magento-update-order-status-topic', {
			// 		"orderLinesStatus": "Completed",
			// 		"order": {
			// 			"ids": {
			// 				"websiteID": "test-websiteID"
			// 			},
			// 			"email": "test-email",
			// 			"mobilePhone": "test-phone"
			// 		}
			// 	}, {key: `test-order-status-${i}`})
			// }
			// //
			// // // pas-view-product-topic
			// // for (let i = 1; i <= 1; i++) {
			// // 	await this.broker.sendToChannel('pas-view-product-topic', {
			// // 		"deviceUUID": uuidv4(),
			// // 		"viewProduct": {
			// // 			"product": {
			// // 				"ids": {
			// // 					"website": "101-0151-01_printedBook"
			// // 				}
			// // 			},
			// // 			"price": 12334
			// // 		}
			// // 	}, {key: `Test${i}`})
			// // }
			// //
			// // // pas-set-wish-list-topic
			// // for (let i = 1; i <= 1; i++) {
			// // 	await this.broker.sendToChannel('pas-set-wish-list-topic', {
			// // 		"deviceUUID": uuidv4(),
			// // 		"user": {
			// // 			"email": "admin@example.com"
			// // 		},
			// // 		"products": {}
			// // 	}, {key: `Test${i}`})
			// // }
			// //
			// // // pas-view-category-topic
			// // for (let i = 1; i <= 1; i++) {
			// // 	await this.broker.sendToChannel('pas-view-category-topic', {
			// // 		"deviceUUID": uuidv4(),
			// // 		"viewProductCategory": {
			// // 			"productCategory": {
			// // 				"ids": {
			// // 					"website": "uchebniki"
			// // 				}
			// // 			}
			// // 		}
			// // 	}, {key: `Test${i}`})
			// // }
			// //
			// // // pas-subscription-in-footer-topic
			// // for (let i = 1; i <= 1; i++) {
			// // 	await this.broker.sendToChannel('pas-subscription-in-footer-topic', {
			// // 		"deviceUUID": uuidv4(),
			// // 		"customer": {
			// // 			"email": "user@somehost.com",
			// // 			"subscriptions": [
			// // 				{
			// // 					"brand": "prosv",
			// // 					"pointOfContact": "EMAIL",
			// // 					"topic": 1924936679
			// // 				}
			// // 			]
			// // 		}
			// // 	}, {key: `Test${i}`})
			// // }

			// // multibook-teacher-student-product-link-topic
			// for (let i = 1; i <= 1; i++) {
			// 	await this.broker.sendToChannel('multibook-teacher-student-product-link-topic', {
			// 		'productinregister': 'Химия. 9 класс',
			// 		'referralCustomerCode': '04e89f19-16ba-4d87-8ff0-061263ef6b07',
			// 		// 'websiteID': 'bedc1f1c-4600-45e5-b291-485aa80fc679',
			// 		'websiteID': 'test',
			// 		'pointOfContact': '56bc1039-08d2-417d-ab93-bd59259c96ad'
			// 	}, {key: `Test${i}`})
			// }

			// // hw-mindbox-task-student-completed-topic
			// for (let i = 1; i <= 1; i++) {
			// 	await this.broker.sendToChannel('hw-mindbox-task-student-completed-topic', {
			// 		"websiteID": "test",
			// 		"pointOfContact": "43a46eac-bb8a-4ce4-a660-fc5905caa48b",
			// 		"email": "qwe@qwe.ru",
			// 		"changeAmount": 1
			// 	}, {key: `Test${i}`})
			// }

			// // incorrect id-authorize-customer-topic
			// await this.broker.sendToChannel('id-authorize-customer-topic', {
			// 	"deviceUUID": "c1e79902-b277-44fc-8c8e-7163e4f47811",
			// 	"customer": {
			// 		"email": "habad_buh@mail.ru",
			// 		"ids": {
			// 			"websiteID": "cba770be-f9ed-45c1-b541-bc453284ab75"
			// 		}
			// 	}
			// }, {key: "habad_buh@mail.ru"})

			// // m3-license-create-authorized-order-topic
			// await this.broker.sendToChannel('m3-license-create-authorized-order-topic', {
			// 	"customer": {
			// 		"email": "czkohuaw@img-free.com",
			// 		"mobilePhone": "",
			// 		"ids": {
			// 			"websiteID": "d98f86f3-7f88-41f0-a8ba-f1b3421072df"
			// 		}
			// 	},
			// 	"order": {
			// 		"customFileds": {
			// 			"orderTimeProsvDatabase": "2025-10-29T16:31:53",
			// 			"paymentLink": "https://x3-apps.prosv.ru/stage/multibook20/book/45-0391-01?pid=006a7bae-ef8c-4c0a-948f-7137beb7256b",
			// 			"paymentType": "monthly",
			// 			"rate": "premium"
			// 		},
			// 		"ids": {
			// 			"websiteID": "9f91c213-bbea-4926-aaae-fa653616ed65"
			// 		},
			// 		"totalPrice": 449,
			// 		"lines": [
			// 			{
			// 				"customFields": {
			// 					"productType": "digitalService"
			// 				},
			// 				"basePricePerItem": 449,
			// 				"quantity": 1,
			// 				"product": {
			// 					"ids": {
			// 						"website": "45-0415-01"
			// 					}
			// 				}
			// 			}
			// 		]
			// 	}
			// }, {key: '9f91c213-bbea-4926-aaae-fa653616ed65'})

			// // m3-license-update-order-status-topic
			// await this.broker.sendToChannel('m3-license-update-order-status-topic', {
			// 	"orderLinesStatus": "Completed",
			// 	"order": {
			// 		"ids": {
			// 			"websiteID": "9f91c213-bbea-4926-aaae-fa653616ed65"
			// 		}
			// 	}
			// }, {key: '9f91c213-bbea-4926-aaae-fa653616ed65'})

			// // multitrain-login-customer-topic
			// await this.broker.sendToChannel('multitrain-login-customer-topic', {
			// 	"customer": {
			// 		"email": "2nndw@comfythings.com",
			// 		"mobilePhone": null,
			// 		"ids": {
			// 			"websiteID": "5c77c24e-8c51-452c-baba-90fccecd91c8"
			// 		}
			// 	},
			// 	"customerAction": {
			// 		"customFields": {
			// 			"digitalServiceProduct": "45-0347-01"
			// 		}
			// 	}
			// }, {key: '5c77c24e-8c51-452c-baba-90fccecd91c8:45-0347-01'})

			// id-customer-delete-topic
			await this.broker.sendToChannel('id-customer-delete-topic', {
				'time': 1770886687,
				'actor': 'e5d9eec0-2523-4f7a-9199-88e8423670b0',
				'deviceUUID': 'f9ad2793-a14b-47c6-a2ba-94b6efcbdb33',
				'attributes': {
					'nameFirst': 'остапович',
					'nameLast': 'степан',
					'namePatronymic': null,
					'sex': 'male',
					'birthday': '2012-11-12',
					'role': [
						{
							'uuid': '38b1b3d0-7ac4-426b-908f-4b7d93774cb7',
							'name': 'Ученик'
						}
					],
					'parentCommittee': false,
					'children': [],
					'region': [
						{
							'uuid': 'e6ff1ca6-e295-5cb0-8b3f-db679a12c425',
							'kladr': '5400000000000',
							'name': 'Новосибирская область'
						}
					],
					'email': [
						{
							'value': 'bestdoc.nsk@gmail.com',
							'confirmed': false
						}
					],
					'phone': [
						{
							'value': '+79059519689',
							'formatted': '8 (905) 951-96-89',
							'type': 1,
							'carrier': 'Beeline',
							'confirmed': true
						}
					],
					'mailing': [
						{
							'uuid': 'f7c5e3fe-8de5-4a09-bdd0-9ffb86129d6e',
							'name': 'Новости и события образования'
						},
						{
							'uuid': 'c1fc2d20-70e4-4fae-a241-d67fdacd5a9b',
							'name': 'Мероприятия для детей и советы родителям'
						},
						{
							'uuid': 'f9c6e2fa-3bcd-41e6-82de-f2081f8134aa',
							'name': 'Вебинары и трансляции'
						},
						{
							'uuid': 'b1913bd9-c3e3-4903-bf7c-f6ba9351ff5f',
							'name': 'Новинки и хиты продукции'
						},
						{
							'uuid': 'e0e117b3-56e4-4c94-bd5f-1071738bd844',
							'name': 'Акции и скидки'
						},
						{
							'uuid': '81b37b7e-3f5d-4b84-808f-b6327cea4a8b',
							'name': 'Цифровые сервисы'
						},
						{
							'uuid': 'f5ef236d-8093-4fdb-a4ed-565c5b346481',
							'name': 'Педагогика и психология'
						},
						{
							'uuid': '0122b606-edaa-468e-9073-c028f1f942a6',
							'name': 'Коррекционная педагогика и инклюзивное образование'
						}
					]
				},
				'legalEntity': false
			}, {key: 'e5d9eec0-2523-4f7a-9199-88e8423670b0'})
		}
	},

	async started() {
		this.process()
	}
}
