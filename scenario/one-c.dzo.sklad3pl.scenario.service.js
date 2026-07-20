module.exports = {
	name: 'one-c.dzo.skald3pl.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('sklad3pl-act-in-dzo-rgn-topic', {
				'number': 'IN 00-00000003',
				'factDate': '07.10.2025',
				'lines': [
					{
						'sku': 'ASG00030.1~|263|~TD',
						'qty': 15,
						'serialNumbers': [],
						'DM': []
					},
					{
						'sku': 'ASG00030.10~|263|~TD',
						'qty': 15,
						'serialNumbers': [],
						'DM': []
					}
				]
			}, {key: 'IN 00-00000003'})

			await this.broker.sendToChannel('sklad3pl-act-out-dzo-rgn-topic', {
				'number': 'OUT00-00000002_А0245173 Ульяновск Кирзять',
				'completedDate': '02.11.2025',
				'packages': [
					{
						'packageNumber': 'b1205',
						'lines': [
							{ 'sku': 'АртикулСклада  Воронка Бюхнера~|469683|~TD', 'qty': 8, 'serialNumbers': [], 'DM': [] },
							{ 'sku': 'АртикулСклада  Гельдокументирующая~|469683|~TD', 'qty': 10, 'serialNumbers': [], 'DM': [] }
						]
					},
					{
						'packageNumber': 'b12105',
						'lines': [
							{ 'sku': 'АртикулСклада  Номенклатура МедИзделие~|469683|~TD', 'qty': 2, 'serialNumbers': [], 'DM': [ '0104620344059340215bpDqbEyhOqr/', '0104620344059470215UFOm3V<RYOoD' ] }
						]
					}
				]
			}, {key: 'OUT00-00000002_А0245173 Ульяновск Кирзять'})

			await this.broker.sendToChannel('sklad3pl-stocks-dzo-rgn-topic', {
				'sku': 'гофрокороба 520/500/430',
				'qty': 1
			}, {key: 'гофрокороба 520/500/430'})
		}
	},

	async started() {
		this.process()
	}
}
