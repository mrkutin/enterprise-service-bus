module.exports = {
	name: 'one-c.erpuh.eris.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('eris-artist-agreements-app-one-c-topic', {
				'Recid': '5638108326',
				'Guid': 'b4bafc34-7db2-11ef-b80f-0050560b375e',
				'Link': 'https://s3.prosv.ru/eristest/docs/tmp_file/type/doc/id/62340.pdf?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=eristest%2F20251128%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251128T140103Z&X-Amz-SignedHeaders=host&X-Amz-Expires=604800&X-Amz-Signature=21f1dd70d0c34ed6968cf00f48055b780bc5bbca86a36f36453be29ca49454cf'
			}, {key: 'bbbd9e80-c82e-4713-ba4e-8ce58c3eff95'})

			await this.broker.sendToChannel('eris-publication-one-c-topic', {
				'Recid': 5638108326,
				'Sku': 'NM0161266',
				'Guid': 'daa48473-7a0e-11ef-b80f-0050560b375e',
				'Type': 'ЭФУ',
				'Date': '2025-12-04 13:19:29',
				'Public': 0
			}, {key: 'd3f60ff3-e3da-4052-8ee7-e6a8ad9f21b1'})

			await this.broker.sendToChannel('eris-response-pvm-one-c-topic', {
				'Recid': 5698105026,
				'Guid': '846d22ed-d0eb-11f0-b830-0050560b375e',
				'OrderDax': 'ЗК00148710',
				'ReadyToPrintDate': '2025-04-25 14:04:02',
				'FilePath': '306-0032-01_05_2025_titul_2025_PSZ_Kalendar_mladshego_shkoln',
				'SignalCopyDate': '2025-06-10'
			}, {key: '326b0ef8-f011-4b2b-beff-3f72619ebf5d'})

			await this.broker.sendToChannel('pim-cover-topic', {
				'content_code': '48-0153-01',
				'content_recid': '5638964086',
				'source': {
					'width': 472,
					'height': 591,
					'external_link': 'https://cdn.prosv.ru/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40.jpg',
					'internal_link': 'https://storage.yandexcloud.net/prod-file-public/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40.jpg'
				},
				'small': {
					'width': 250,
					'height': 313,
					'external_link': 'https://cdn.prosv.ru/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-small.webp',
					'internal_link': 'https://storage.yandexcloud.net/prod-file-public/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-small.webp'
				},
				'medium': {
					'width': 472,
					'height': 591,
					'external_link': 'https://cdn.prosv.ru/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-medium.webp',
					'internal_link': 'https://storage.yandexcloud.net/prod-file-public/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-medium.webp'
				},
				'large': {
					'width': 472,
					'height': 591,
					'external_link': 'https://cdn.prosv.ru/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-large.webp',
					'internal_link': 'https://storage.yandexcloud.net/prod-file-public/c817/4192/a731/a87edf02-c817-4192-a731-54037e316e40-large.webp'
				}
			}, {key: 'f1903b60-c34a-4ffc-8aab-0e3a14596c71'})

			await this.broker.sendToChannel('eris-edition-pim-topic', {
				'ErisEditionId': 98194,
				'InventEditionId': 'ИЗД0151767',
				'Sku': 'NM0090936',
				'DaxRecid': 5638108326,
				'Guid': 'ccbe8b29-cb6a-11f0-b830-0050560b375e',
				'EditionNum': '2',
				'EditionNumType': 'Бесплатно (апробация)',
				'OmApprovalDate': '2025-12-04 10:50:09'
			}, {key: 'e187e93c-9373-4f83-9867-740c64598afd'})
		}
	},

	async started() {
		this.process()
	}
}
