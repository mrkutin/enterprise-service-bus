module.exports = {
	name: 'student.stats.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('m3activity-actor-statement-finished-topic', {
				'recid': '4e1d379b-a48b-4093-8363-d458200e4396:45-0346-01:multiplume:b420163-001',
				'data': {
					'request': {
						'msgType': 'eor:state',
						'correlationId': '86bbb303-9a1a-4b34-9d4d-839a9eecc332',
						'result': {
							'success': true
						},
						'payload': {
							'statement': {
								'object': {
									'id': 'multiplume:b420163-001',
									'objectType': 'Activity',
									'definition': {
										'type': 'http://adlnet.gov/expapi/activities/cmi.interaction',
										'name': {
											'ru-RU': 'without_clueПрактика'
										},
										'interactionType': 'other',
										'extensions': {
											'userId': '4e1d379b-a48b-4093-8363-d458200e4396',
											'nomenclature': '45-0346-01'
										}
									}
								},
								'id': '3e52a665-eb94-4b7b-982c-a9a20fe79d94',
								'timestamp': '2025-02-10T12:58:37.996Z',
								'actor': {
									'objectType': 'Agent',
									'mbox': '@mail.ru'
								},
								'verb': {
									'id': 'http://adlnet.gov/expapi/verbs/answered',
									'display': {
										'en-US': 'answered'
									}
								},
								'result': {
									'success': false,
									'duration': 'PT1M59.94S',
									'attempts': 0,
									'extensions': {
										'balls': 21,
										'points': 21,
										'money': 4,
										'state': 'SUCCESS',
										'money_attempts': 0
									},
									'score': {
										'scaled': 21,
										'raw': 0,
										'min': 0,
										'max': 0
									},
									'completion': true
								}
							}
						}
					},
					'userId': '4e1d379b-a48b-4093-8363-d458200e4396',
					'objectId': 'multiplume:b420163-001'
				},
				'time': 1756458866.9903598,
				'type': 'eor:state'
			}, {key: '4e1d379b-a48b-4093-8363-d458200e4396:45-0346-01:multiplume:b420163-001'})}
	},

	async started() {
		this.process()
	}
}
