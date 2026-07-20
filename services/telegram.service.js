const REDIS_SET_NAME = 'telegram-metrics-chats'

const {Telegraf} = require('telegraf')
const Redis = require('ioredis')
const {Client} = require('@opensearch-project/opensearch')
const CronMixin = require("moleculer-cron")
const axios = require('axios')

const {
	REDIS_HOST, REDIS_PORT, REDIS_PASSWORD,
	REDIS_CA_CERT, NAMESPACE, OPENSEARCH_NODE,
	OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD,
	OPENSEARCH_SIZE, OPENSEARCH_INDEX,
	TELEGRAM_BOT_TOKEN, PROMETHEUS_HOST
} = process.env

const auth = `${OPENSEARCH_USERNAME}:${OPENSEARCH_PASSWORD}`.replace(/\!/g, '%21')
	.replace(/\&/g, '%26')
	.replace(/\#/g, '%23')
const node = OPENSEARCH_NODE.replace('https://', `https://${auth}@`)

const client = new Client({
	node,
	ssl: {
		rejectUnauthorized: false
	}
})

module.exports = {
	name: 'telegram',

	mixins: [CronMixin],

	settings: {
		cronJobs: [
			{
				name: 'telegramSendErrors',
				cronTime: '0 7 * * *', // Run every day at 10 am
				onTick: async function() {
					this.logger.info('telegramSendErrors ticked');
					await this.broker.call(`${this.name}.getPrometheusMetrics`)
				}
			}
		]
	},

	actions: {
		async getPrometheusMetrics(ctx) {
			const startDate = new Date(new Date().getTime() - 24 *  60 * 60 * 1000).toISOString()
			const endDate = new Date().toISOString()

			const requestString = `${PROMETHEUS_HOST}/api/v1/query?query=increase%28label_replace%28%7B__name__%3D~%22.%2B%28errors%7Ccrash%29%22%2C%20job%3D~%22esb.%2B%22%7D%2C%22name_label%22%2C%22%241%22%2C%22__name__%22%2C%20%22%28.%2B%29%22%29%5B24h%3A%5D%29`

			const response = await axios.get(requestString, {
				headers: {
					'Accept': 'application/json'
				},
				body: {}
			})

			const dedupResponse = response.data.data.result.filter(res => !res.metric.name_label.includes('rate')).reduce((acc, {metric, value}) => {
				const eventsCount = value.length > 1 ?
					Math.floor(value[1])
					:
					0
				if (eventsCount) {
					const serviceName = metric.name_label.includes('_crash') ?
						metric.name_label
							.replace('_crash', '')
							.replaceAll('_', '-')
						:
						metric.service
							.replace('esb-', '')
							.replace('-metrics', '')

					if (!acc[serviceName]) {
						acc[serviceName] = {}
					}
					if (!acc[serviceName].errors) {
						acc[serviceName].errors = 0
					}
					if (!acc[serviceName].crashes) {
						acc[serviceName].crashes = 0
					}

					if (metric.name_label.includes('_crash')) {
						acc[serviceName].crashes += eventsCount
					} else {
						acc[serviceName].errors += eventsCount
					}
				}

				return acc
			}, {})

			const telegramMessage  = Object.keys(dedupResponse).length ?
				Object.keys(dedupResponse).reduce((acc, serviceName) => {
					return acc.concat(`Сервис: <b>${serviceName}</b>, ошибок: <b>${dedupResponse[serviceName].errors}</b>, падений: <b>${dedupResponse[serviceName].crashes}</b>\n`)
				}, `bus-${NAMESPACE} ${startDate} - ${endDate}\n`)
				:
				'No service errors and crashes last day'

			const chat_ids = await this.settings.redis.smembers(REDIS_SET_NAME)
			const single_person_chat_ids = chat_ids.filter(chat_id => Math.sign(parseInt(chat_id)) === 1)
			for (const chat_id of single_person_chat_ids) {
				await this.settings.bot.telegram.sendMessage(chat_id, telegramMessage, {parse_mode: 'HTML'})
			}

			console.log('OK!')
		}
	},

	events: {
		'$metrics.snapshot': {
			group: this.name,
			async handler(ctx) {
				const chat_ids = await this.settings.redis.smembers(REDIS_SET_NAME)
				const group_chat_ids = chat_ids.filter(chat_id => Math.sign(parseInt(chat_id)) !== 1)

				for (const chat_id of group_chat_ids) {
					const one_c_upload_errors_total = ctx.params.find(item => item?.name === 'one-c-upload-errors.total')
					if (one_c_upload_errors_total?.values[0]?.rate > 0) {
						const message = `Невозможно отправить данные по протоколу http в 1С в <b>${NAMESPACE}</b> окружении, всего неуспешных попыток: ${one_c_upload_errors_total?.values[0]?.value}`
						if (message !== this.settings.last_message) {
							await this.settings.bot.telegram.sendMessage(chat_id, message, {parse_mode: 'HTML'})
							this.settings.last_message = message
						}
					}
				}
			}
		}
	},

	async created() {
		await this.broker.waitForServices([this.name])

		const redisConnectionParams = {
			host: REDIS_HOST,
			port: parseInt(REDIS_PORT) || 6379,
			password: REDIS_PASSWORD
		}

		if (REDIS_CA_CERT?.length) {
			redisConnectionParams.tls = {
				ca: REDIS_CA_CERT
			}
		}

		this.settings.redis = new Redis(redisConnectionParams)

		this.settings.bot = new Telegraf(TELEGRAM_BOT_TOKEN)
		this.settings.bot.start(async ctx => {
			await ctx.reply('Што хатель, нащальника?')
		})
		this.settings.bot.help(async ctx => {
			await ctx.reply('/subscribe - подписаться на алерты')
			await ctx.reply('/unsubscribe - отписаться от алертов')
			await ctx.reply('/search - поиск всех логов за последний час')
			await ctx.reply('/search {"svc": "api"} - поиск всех логов за последний час в сервисе api')
			await ctx.reply('/search {"query": "24-0307546"} - поиск логов по строке')
			await ctx.reply('/search {"svc": "api", "query": "24-0307546"} - поиск логов по строке в определенном сервисе')
			await ctx.reply('/search {"time": {"gte": "2024-01-31T20:04:00+03:00", "lte": "2024-01-31T20:04:59+03:00"}, "query": "24-0307546"} - поиск логов по времени и строке')
			await ctx.reply('/help - этот список')
		})

		//subscribe
		this.settings.bot.command('subscribe', async ctx => {
			await this.settings.redis.sadd(REDIS_SET_NAME, ctx.update.message.chat.id)
			await ctx.reply(`Подписка успешно оформлена`)
		})
		this.settings.bot.on('new_chat_members', async ctx => {
			await this.settings.redis.sadd(REDIS_SET_NAME, ctx.update.message.chat.id)
		})

		//unsubscribe
		this.settings.bot.command('unsubscribe', async ctx => {
			await this.settings.redis.srem(REDIS_SET_NAME, ctx.update.message.chat.id)
			await ctx.reply(`Подписка успешно отменена`)
		})
		this.settings.bot.on('left_chat_member', async ctx => {
			await this.settings.redis.srem(REDIS_SET_NAME, ctx.update.message.chat.id)
		})

		//search
		this.settings.bot.command('search', async ctx => {
			let params = {}
			try {
				params = JSON.parse(ctx.payload)
			} catch (e) {
				params.query = ctx.payload
			}

			const filter = [
				{
					'match': {
						ns: NAMESPACE,
					}
				}
			]

			if (params.svc) {
				filter.push({match: {svc: params.svc}})
			}

			if (params.query) {
				filter.push({match_phrase: {msg: params.query}})
			}

			if (params.time?.gte && params.time?.lte) {
				filter.push({
					range: {
						time: {
							gte: new Date(params.time.gte).toISOString(),
							lte: new Date(params.time.lte).toISOString()
						}
					}
				})
			} else {
				filter.push({
					range: {
						time: {
							gte: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
							lte: new Date().toISOString()
						}
					}
				})
			}

			const body = {
				query: {
					bool: {
						must: filter
					}
				},
				sort: [
					{
						time: {
							order: 'asc',
							unmapped_type: 'boolean'
						}
					}
				],
				size: parseInt(OPENSEARCH_SIZE || 40)
			}

			const response = await client.search({index: OPENSEARCH_INDEX, body})

			if (!response?.body?.hits?.hits?.length) {
				return ctx.reply(`Искаль, искаль, нищего не нашёль`)
			}

			for (const hit of response.body.hits.hits) {
				const msg = params.query ? hit._source.msg.replace(new RegExp(params.query, 'ig'), `<b>${params.query}</b>`) : hit._source.msg
				await ctx.replyWithHTML(`<b>_id</b>: ${hit._id},\n<b>ns</b>: ${hit._source.ns},\n<b>svc</b>: ${hit._source.svc}\n<b>time</b>: ${new Date(hit._source.time).toLocaleString('ru-RU', {timeZone: 'Europe/Moscow'})}\n<b>msg</b>: ${msg}`)
			}
		})

		this.settings.bot.launch()
	},

	async stopped() {
		this.settings.bot.stop('SIGTERM')
		await this.settings.redis.disconnect()
		this.settings.redis = null
	}
}
