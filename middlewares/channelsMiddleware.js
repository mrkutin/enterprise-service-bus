const {Middleware: ChannelsMiddleware} = require('@moleculer/channels')

const {
	KAFKA_BROKER_STRING,
	KAFKA_ADMIN_USER,
	KAFKA_ADMIN_PASSWORD
} = process.env

const kafka = {
	clientId: 'kafka service client',
	brokers: [`${KAFKA_BROKER_STRING}:9091`],
	ssl: {
		rejectUnauthorized: false
	},
	sasl: {
		mechanism: 'scram-sha-512',
		username: KAFKA_ADMIN_USER,
		password: KAFKA_ADMIN_PASSWORD
	}
}

module.exports = ChannelsMiddleware({
	adapter: {
		type: 'Kafka',
		options: {
			kafka, prefix: ''
		}
	},
	context: true
})
