module.exports = {
	'mindbox-client-email-unsubscribed-topic': {
		mindboxOperation: 'ExportSegmentUnsubscribe',
		retriesCount: 0,
		sendsayAction: 'stoplist.add',
		sendsayCreateList(emails) {
			return {
				list: emails
			}
		},
		sendsayAdditionalBodyParams: {}
	},
	'mindbox-client-email-contacted-24h-topic': {
		mindboxOperation: 'ExportSegmentsSendsay',
		retriesCount: 0,
		sendsayAction: 'member.import',
		sendsayCreateList(emails) {
			return {
				'users.list': {
					caption: [
						{
							anketa: 'member',
							quest: 'email'
						}
					],
					rows: emails.map(email => [email])
				}
			}
		},
		sendsayAdditionalBodyParams: {
			addr_type: 'email',
			'newbie.confirm': '0',
			auto_group: {
				id: 'pl16202'
			},
			clean_group: '1'
		}
	}
}
