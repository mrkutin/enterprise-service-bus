module.exports = {
	name: 'one-c.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])
			await new Promise(resolve => setTimeout(resolve, 3000))

			for (let i = 1; i <= 1; i++) {
				await this.broker.sendToChannel('tms-status-request-for-transport-erpuh-topic', {
					recid: '9de162ca-7b06-41b8-82e6-d4ffbdccbf75',
					guid: 'bc9cff89-79e6-11f0-b82e-0050560b376e',
					статус: 'В рейсе',
					фактическаядатадоставки: '2025-10-15T17:47:17'
				}, {key: `Test${i}`})
			}

			for (let i = 1; i <= 1; i++) {
				await this.broker.sendToChannel('tms-status-of-delivery-erpuh-topic', {
					recid: '56958a81-8f4a-11f0-b830-0050560b375e',
					номерзаявки: '0000001',
					статус: 'В работе',
					планируемаядатадоставки: '2025-10-15T17:47:17',
					фактическаядатадоставки: '2025-10-16T17:47:17',
					планначаларейса: '2025-10-14T17:47:17',
					планокончаниярейса: '2025-10-18T17:47:17',
					фактначаларейса: '2025-10-14T17:47:17',
					фактокончаниярейса: '2025-10-18T17:47:17',
					выполняет: '',
					транспортноесредство: {
						ГосНомер: 'Е555КК99',
						Марка: 'Газель',
						ВидТранспорта: 'Грузовой',
						Вместимость: '44',
						Грузоподъемность: '1500'
					},
					водитель: {
						'ФИО': 'Федоров Иван Кириллович'
					},
					статусрейса: 'В работе'
				}, {key: `Test${i}`})
			}
		}
	},

	async started() {
		this.process()
	}
}
