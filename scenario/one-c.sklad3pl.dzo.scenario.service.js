module.exports = {
	name: 'one-c.skald3pl.dzo.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('dzo-rgn-act-in-sklad3pl-topic', {
				'number': '00-00000003',
				'lines': [
					{
						'sku': 'АртикулСклада  Воронка Бюхнера',
						'name': ' Воронка Бюхнера',
						'measure': 'шт',
						'project': 'IN',
						'qtyinbox': 8,
						'provider': 'АВАНТАЖ ООО'
					},
					{
						'sku': 'АртикулСклада  Гельдокументирующая',
						'name': ' Гельдокументирующая система ',
						'measure': 'шт',
						'project': 'IN',
						'qtyinbox': 20,
						'provider': 'АВАНТАЖ ООО'
					}
				]
			}, {key: '00-00000003'})

			await this.broker.sendToChannel('dzo-rgn-act-out-sklad3pl-topic', {
				'number': 'OUT_AB014_AST033 Абхазия',
				'plannedShippingDate': '23.10.2025',
				'comment': '',
				'dopInfo': '',
				'lines': [
					{
						'sku': 'ASG00033.1~|263|~TD',
						'name': 'Словари раздаточные для 5-11 классов: Зайкова Елена Сергеевна, Попова Татьяна Витальевна Морфемно-словообразовательный словарь русского языка 5-11 классы 2025',
						'qty': 15
					},
					{
						'sku': 'ASG00033.10~|263|~TD',
						'name': 'Словари раздаточные для 5-11 классов: Березович Елена Львовна, Галинова Наталья Владимир Этимологический словарь русского языка 7-11 классы 2025',
						'qty': 15
					}
				]
			}, {key: 'OUT_AB014_AST033 Абхазия'})
		}
	},

	async started() {
		this.process()
	}
}
