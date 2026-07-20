const Redis = require('ioredis')

const {
	REDIS_HOST,
	REDIS_PORT,
	REDIS_PASSWORD,
	REDIS_CA_CERT
} = process.env

module.exports = {
	name: 'accumulator.mixin',

	actions: {
		search: {
			params: {
				pattern: {type: 'string'}
			},
			handler(ctx) {
				const {pattern} = ctx.params
				return this.settings.redis.keys(pattern)
			}
		},

		putKey: {
			params: {
				bucket: {type: 'string'},
				key: [{type: 'string'}, {type: 'number'}]
			},
			async handler(ctx) {
				const {bucket, key} = ctx.params
				await this.settings.redis.sadd(bucket, key.toString())
			}
		},

		putKeyValue: {
			params: {
				bucket: {type: 'string'},
				key: [{type: 'string'}, {type: 'number'}],
				value: {type: 'object'}
			},
			async handler(ctx) {
				const {bucket, key, value} = ctx.params
				await this.settings.redis
					.multi()
					.sadd(bucket, `key:${bucket}:${key}`)
					.set(`key:${bucket}:${key}`, JSON.stringify(value))
					.exec()
			}
		},

		putFifoKeyValue: {
			params: {
				bucket: {type: 'string'},
				key: [{type: 'string'}, {type: 'number'}],
				value: {type: 'object'}
			},
			async handler(ctx) {
				const {bucket, key, value} = ctx.params
				await this.settings.redis
					.multi()
					.rpush(bucket, `key:${bucket}:${key}`)
					.set(`key:${bucket}:${key}`, JSON.stringify(value))
					.exec()
			}
		},

		takeValues: {
			params: {
				bucket: {type: 'string'},
				limit: {type: 'number', positive: true, integer: true}
			},
			async handler(ctx) {
				const {bucket, limit} = ctx.params
				const keys = await this.settings.redis.spop(bucket, limit) || []
				const values = await Promise.all(keys.map(async key => {
					const value = await this.settings.redis.getdel(key)
					return JSON.parse(value)
				}))
				return values.filter(value => value != null)
			}
		},

		takeFifoValues: {
			params: {
				bucket: {type: 'string'},
				limit: {type: 'number', positive: true, integer: true}
			},
			async handler(ctx) {
				const {bucket, limit} = ctx.params
				const keys = await this.settings.redis.lpop(bucket, limit) || []
				const values = await Promise.all(keys.map(async key => {
					const value = await this.settings.redis.getdel(key)
					return JSON.parse(value)
				}))
				return values.filter(value => value != null)
			}
		},

		takeValuesUpToSize: {
			params: {
				bucket: {type: 'string'},
				size: {type: 'number', positive: true, integer: true}
			},
			async handler(ctx) {
				const {bucket, size} = ctx.params
				const values = []
				let valuesSize = 0
				while (valuesSize < size){
					const key = await this.settings.redis.spop(bucket)
					if(!key){
						break
					}
					const value = await this.settings.redis.getdel(key)
					values.push(JSON.parse(value))
					valuesSize += value.length
				}
				return values
			}
		},

		takeKeys: {
			params: {
				bucket: {type: 'string'},
				limit: {type: 'number', positive: true, integer: true}
			},
			handler(ctx) {
				const {bucket, limit} = ctx.params
				return this.settings.redis.spop(bucket, limit)
			}
		}
	},

	created() {
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
	}
}
