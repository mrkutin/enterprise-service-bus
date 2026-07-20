const axios = require('axios')
const {MoleculerServerError} = require('moleculer').Errors

module.exports = {
	name: 'one-c.mixin',

	methods: {
		async consumerProcess(topic, message) {
			const key = message.key.toString()
			const parsedMessage = JSON.parse(message.value.toString())
			this.logger.info(`Method consumerProcess: ${JSON.stringify({parsedMessage, topic, key})}`)
			this.broker.call(`${this.name}.putKeyValue`, {
				bucket: `${this.name}:${topic.split('-topic')[0]}:upsert`,
				key,
				value: {...parsedMessage, recid: key}
			})

			await this.oneCUpload(this.settings.topicsConfig[topic].headersTopicName, {...parsedMessage, recid: key})
		},

		async oneCUpload(topic, record) {
			try {
				this.logger.info(`Method oneCUpload input: ${JSON.stringify({topic, record})}`)
				await axios.post(this.settings.sendHost + this.settings.sendEndpoint,
					record,
					{
						timeout: 20 * 1000,
						withCredentials: true,
						headers: {
							topic,
							keyMessage: record.recid,
							Authorization: `Basic ${this.settings.sendToken}`
						}
					})
				this.logger.info(`ONE-C upload ${topic} with record: ${JSON.stringify(record)} successfully posted to 1C from ${this.name} service at ${new Date()}`)
			} catch (e) {
				this.logger.error(`One-c upload error in topic ${topic} with payload: ${JSON.stringify({
					topic,
					record
				}, null, 2)}, error: ${JSON.stringify({'stack': e.stack, 'data': e?.response?.data?.errorMessage}, null, 2)}`)
				throw new MoleculerServerError(e)
			}
		}
	}
}
