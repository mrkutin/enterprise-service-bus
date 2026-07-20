'use strict'

const axios = require('axios')

const ApiGateway = require('moleculer-web')
const E = require('moleculer-web').Errors
const { MoleculerServerError, MoleculerClientError } = require('moleculer').Errors
const {ObjectId} = require('mongodb')
const { v4: uuidv4 } = require('uuid')

const {
	VAULT_HOST, VAULT_TOKEN,
	VAULT_API_CONSUMERS_FOLDER, VAULT_API_PRODUCERS_FOLDER,
	VAULT_ROOT_FOLDER
} = process.env

const StateMixin = require('../mixins/state.mixin')
const apiAllowedTables = require('../configs/api.allowed.tables.config')

const axStringFields = ['inn', 'kpp']

/**
 * @typedef {import('moleculer').ServiceSchema} ServiceSchema Moleculer's Service Schema
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 * @typedef {import('moleculer-web').ApiSettingsSchema} ApiSettingsSchema API Setting Schema
 */

module.exports = {
	name: 'api',
	mixins: [ApiGateway, StateMixin],

	/** @type {ApiSettingsSchema} More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html*/
	settings: {
		API_TOKENS: {},

		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: '0.0.0.0',

		// Global Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		use: [],

		//api version
		rest: '/',

		routes: [
			{
				path: '/',

				whitelist: [
					'api.ping',
					'openapi.generateDocs',
					'openapi.ui',
					'openapi.assets'
				],

				// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
				use: [],

				// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
				mergeParams: true,

				// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
				authentication: false,

				// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
				authorization: false,

				// The auto-alias feature allows you to declare your route alias directly in your services.
				// The gateway will dynamically build the full routes from service schema.
				aliases: {
					'GET /ping': 'api.ping',
					'GET /openapi.json': 'openapi.generateDocs',
					'GET /swagger': 'openapi.ui',
					'GET /assets/:file': 'openapi.assets',
				},

				/**
				 * Before call hook. You can check the request.
				 * @param {Context} ctx
				 * @param {Object} route
				 * @param {IncomingRequest} req
				 * @param {ServerResponse} res
				 * @param {Object} data
				 *
				onBeforeCall(ctx, route, req, res) {
					// Set request headers to context meta
					ctx.meta.userAgent = req.headers["user-agent"];
				}, */

				/**
				 * After call hook. You can modify the data.
				 * @param {Context} ctx
				 * @param {Object} route
				 * @param {IncomingRequest} req
				 * @param {ServerResponse} res
				 * @param {Object} data
				onAfterCall(ctx, route, req, res, data) {
					// Async function which return with Promise
					return doSomething(ctx, res, data);
				}, */

				// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
				callingOptions: {},

				bodyParsers: {
					json: {
						strict: false,
						limit: '1MB'
					},
					urlencoded: {
						extended: true,
						limit: '1MB'
					}
				},

				// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
				mappingPolicy: 'all', // Available values: "all", "restrict"

				// Enable/disable logging
				logging: true
			},
			{
				path: '/v5',

				whitelist: [
					'api.apply',
					'api.applyJSONtoKafka',
					'api.applyBASE64',
					'api.get',
					'contacts.crm.*',
					'jobs.crm.*',
					'student.stats.*',
				],

				// Route-level Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
				use: [],

				// Enable/disable parameter merging method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
				mergeParams: false,

				// Enable authentication. Implement the logic into `authenticate` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
				authentication: false,

				// Enable authorization. Implement the logic into `authorize` method. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
				authorization: true,

				// The auto-alias feature allows you to declare your route alias directly in your services.
				// The gateway will dynamically build the full routes from service schema.
				aliases: {
					'GET /m3activity-student-task-stats': 'student.stats.taskStats',
					'GET /m3activity-student-completed-task-day-stats': 'student.stats.completedTaskDayStats',
					'GET /m3activity-student-average-exercise-score-stats': 'student.stats.averageExerciseScoreStats',
					'GET /m3activity-student-rating-stats': 'student.stats.ratingStats',
					'GET /:table_name': 'api.get',
					'POST /apply': 'api.apply',
					'POST /applyBASE64': 'api.apply',
					'POST /:table_name': 'api.applyJSONtoKafka',
					'POST /queues/contacts' : 'contacts.crm.contacts',
					'POST /queues/jobs' : 'jobs.crm.jobs',
				},

				/**
				 * Before call hook. You can check the request.
				 * @param {Context} ctx
				 * @param {Object} route
				 * @param {IncomingRequest} req
				 * @param {ServerResponse} res
				 * @param {Object} data
				 *
				onBeforeCall(ctx, route, req, res) {
					// Set request headers to context meta
					ctx.meta.userAgent = req.headers["user-agent"];
				}, */

				/**
				 * After call hook. You can modify the data.
				 * @param {Context} ctx
				 * @param {Object} route
				 * @param {IncomingRequest} req
				 * @param {ServerResponse} res
				 * @param {Object} data
				onAfterCall(ctx, route, req, res, data) {
					// Async function which return with Promise
					return doSomething(ctx, res, data);
				}, */

				// Calling options. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Calling-options
				callingOptions: {},

				bodyParsers: {
					json: {
						strict: false,
						limit: '100MB'
					},
					urlencoded: {
						extended: true,
						limit: '1MB'
					}
				},

				// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
				mappingPolicy: 'all', // Available values: "all", "restrict"

				// Enable/disable logging
				logging: true
			},
			{
				path: '/v5/crm-leads',
				mergeParams: false,
				cors: {
					origin: ['https://psvtestcrm.tilda.ws', 'https://academy.prosv.ru'],
					methods: ['GET', 'POST', 'PUT', 'DELETE'],
					headers: ['Content-Type', 'Authorization'],
					credentials: true
				},
				aliases: {
					'POST /': 'leads.crm.leads'
				}
			}
		],

		// Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
		log4XXResponses: false,
		// Logging the request parameters. Set to any log level to enable it. E.g. "info"
		logRequestParams: null,
		// Logging the response data. Set to any log level to enable it. E.g. "info"
		logResponseData: null,


		// Serve assets from "public" folder. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Serve-static-files
		assets: {
			folder: 'public',

			// Options to `server-static` module
			options: {}
		}
	},

	actions: {
		ping: {
			rest: 'GET /ping',
			async handler() {
				return 'OK'
			}
		},
		stateProcess: {
			params: {
				table_name: 'string',
				records: {type: 'array', items: 'object'},
				action: 'string'
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {table_name, records, action} = ctx.params
				const dbMessages = records.map(record => {
					const { kafkakey, recid,  ...rest } = record
					return { recid: kafkakey || recid, ...rest }
				})
				if (apiAllowedTables.includes(table_name)) {
					if (table_name === 'one-c-products-price-table') {
						await this.applyProductsPriceMessages(table_name, dbMessages, action)
					} else {
						await this.applyMessages(table_name, dbMessages, action)
					}
				}
				for (const record of records) {
					const { kafkakey,  ...rest } = record
					await this.broker.sendToChannel(`${table_name}-topic`, rest, {key: `${kafkakey || record.recid}`})
				}
			}
		},
		applyJSONtoKafka: {
			rest: 'POST /:table_name',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				body: [
					{ type: 'array', items: 'object' },
					{ type: 'object' }
				],
				params: {
					$$type: 'object',
					table_name: 'string'
				}
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {params, body} = ctx.params
				const {table_name} = params

				let bodyData
				try {
					bodyData = JSON.parse(Buffer.from(body.messages, 'base64').toString())
				} catch (e) {
					this.logger.info(`Unable to parse ${JSON.stringify(ctx.params)} to BASE64, using JSON`)
					bodyData = body
				}

				const records = [bodyData].flat()

				for (const record of records) {
					if ((record.recid && record.recid !== '') || record.kafkakey) {
						this.logger.info(`Action ${ctx.action.name} push record to kafka and mongodb: ${JSON.stringify(record)}`)
						await this.broker.sendToChannel('channel.message.api.received', {table_name, record, action: 'insert'}, {key: `${record.recid}`})
					} else {
						this.logger.info(`Action ${ctx.action.name} push record only to kafka: ${JSON.stringify(record)}`)
						await this.broker.sendToChannel(`${table_name}-topic`, record, {key: uuidv4()})
					}
				}

				return { "status": "OK"}
			}
		},
		apply: {
			rest: 'POST /apply',
			params: {
				body: {
					$$type: 'object',
					messages: 'string'
				}
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const broker = this.broker
				const parsed_messages =  JSON.parse(Buffer.from(ctx.params.body.messages, 'base64').toString())
				this.logger.info(`Action ${ctx.action.name} parsed messages: ${JSON.stringify(parsed_messages)}`)

				const flatMessages = parsed_messages.reduce((acc, message) => {
					return acc.concat(message)
				}, [])

				if (!flatMessages.every(message => message.record.recid)) {
					throw new MoleculerClientError('recid required')
				}

				const dedupByActionRecords = flatMessages.reduce((acc, message) => {
					const table_name = message.table.toLowerCase()

					const lower_case_record = {}
					for (const key in message.record) {
						const lower_case_key = key.toLowerCase()
						if (!['eventcreateddatetime', 'eventtypestr'].includes(lower_case_key)) {
							if (axStringFields.includes(lower_case_key)) {
								lower_case_record[lower_case_key] = message.record[key]
							} else if (message.record[key] === parseInt(message.record[key]).toString()) {
								lower_case_record[lower_case_key] = parseInt(message.record[key])
								lower_case_record[`${lower_case_key}_original`] = message.record[key]
							} else if (message.record[key] === parseFloat(message.record[key]).toString()) {
								lower_case_record[lower_case_key] = parseFloat(message.record[key])
							} else {
								lower_case_record[lower_case_key] = message.record[key]
							}
						}
					}

					if (message.action === 'delete') {
						if (!acc['delete'][table_name]) {
							acc['delete'][table_name] = {}
						}
						if (!acc['delete'][table_name]) {
							acc['delete'][table_name] = {}
						}
						acc['delete'][table_name][lower_case_record.recid] = lower_case_record
					} else {
						if (!acc['upsert'][table_name]) {
							acc['upsert'][table_name] = {}
						}
						if (!acc['upsert'][table_name]) {
							acc['upsert'][table_name] = {}
						}
						acc['upsert'][table_name][lower_case_record.recid] = lower_case_record
					}
					return acc
				}, {'delete': {}, 'upsert': {}})

				for (const action in dedupByActionRecords) {
					for (const table_name in dedupByActionRecords[action]) {
						const records = Object.values(dedupByActionRecords[action][table_name])
						for (const record of records) {
							await broker.sendToChannel('channel.message.api.received', {table_name, record, action}, {key: `${record.recid}`})
							this.logger.info(`Message ${JSON.stringify(record)} for table ${table_name} sent to channel 'channel.message.api.received' with action ${action}`)
						}
					}
				}
			}
		},
		get: {
			rest: 'GET /:table_name',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				params: {
					$$type: 'object',
					table_name: {type: 'string'},
				},
				query: {
					$$type: 'object',
					page: {type: 'string', optional: true},
					perPage: {type: 'string', optional: true},
					fields: {type: 'string', optional: true},
					recid: {type: 'string', optional: true}
				}
			},
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {query, params} = ctx.params
				const {table_name} = params
				const {page, perPage, fields, ...rest} = query

				const filter = rest ?
					Object.keys(rest).reduce((acc, key) => {
						if (!acc[key]) {
							acc[key] = {}
						}
						acc[key] = {
							'$in': key === '_id' ?
								rest[key].split(',').map(value => new ObjectId(value))
								:
								rest[key].split(',').reduce((acc, value) => {
									`${parseInt(value)}` === value ? acc.push(parseInt(value), value) : acc.push(value)
									return acc
								}, [])
						}
						return acc
					}, {})
					:
					{}

				this.logger.info('Aggregation filter: ', JSON.stringify(filter))

				const limit = parseInt(perPage) || 10

				const projectPipeline = fields ?
					[
						{
							$project: fields ?
								fields.split(',').reduce((acc, field) => {
									if (!acc[field]) {
										acc[field] = {}
									}
									acc[field] = 1
									return acc
								}, {})
								:
								{}
						},
						{
							$skip: (page || 0) * limit
						},
						{
							$limit: limit
						}
					]
					:
					[
						{
							$skip: (page || 0) * limit
						},
						{
							$limit: limit
						}
					]

				const itemsCountPromise = await this.getRecords(
					table_name.toLowerCase(),
					[
						{
							$match: {
								to_be_deleted: {
									$ne: true
								},
								...filter
							}
						},
						{
							$count:
								'count'
						}
					]
				)

				const itemsDataPromise = await this.getRecords(
					table_name.toLowerCase(),
					[
						{
							$match: {
								to_be_deleted: {
									$ne: true
								},
								...filter
							}
						},
						...projectPipeline
					]
				)


				const [itemsCount, itemsData] = await Promise.all([itemsCountPromise, itemsDataPromise])

				const result = {
					'total': itemsCount.length ? itemsCount[0].count : 0,
					'pages': itemsCount.length ? Math.ceil(itemsCount[0].count / limit) : 0,
					'data': itemsData
				}

				this.logger.info(`Action ${ctx.action.name} output: ${JSON.stringify(result)}`)
				return result
			}
		},
		upload: {
			openapi: {
				security: [{bearerAuth: []}],
				responses: {
					200: {
						'description': '',
						'content': {
							'application/json': {
								'schema': {
									'type': 'array',
									'items': {
										'type': 'object',
										'example': { id: 1, filename: 'foo.txt', mimetype: 'text/plain', sizeInBytes: 100 },
									},
								},
							},
						},
					},
					400: {
						$ref: '#/components/responses/FileNotExist',
					},
					401: {
						$ref: '#/components/responses/UnauthorizedError',
					},
					413: {
						$ref: '#/components/responses/FileTooBig',
					},
					422: {
						$ref: '#/components/responses/ValidationError',
					},
					default: {
						$ref: '#/components/responses/ServerError',
					},
				},
			},
			handler() {},
		},
		update: {
			openapi: {
				summary: 'Foo bar baz',
			},
			handler() {},
		}
	},

	methods: {
		async applyProductsPriceMessages(table_name, records, action) {
			for (const record of records) {
				const similarRecord = (await this.getRecords(
					table_name,
					[
						{
							$match: {
								recid: record.recid
							}
						},
						{
							$project: {
								price: 1,
								itemid: 1,
								vattype: 1,
								wholesaleprice: 1,
								price_markup_b2b: 1,
								price_markup_b2c: 1,
								_id: 0
							}
						}
					]
				))[0]

				this.logger.info('similarRecord: ', JSON.stringify(similarRecord))

				if (
					!similarRecord
					|| record.price !== similarRecord.price
					|| record.itemid !== similarRecord.itemid
					|| record.vattype !== similarRecord.vattype
					|| record.wholesaleprice !== similarRecord.wholesaleprice
					|| record.price_markup_b2b !== similarRecord.price_markup_b2b
					|| record.price_markup_b2c !== similarRecord.price_markup_b2c
				) {
					const {recid, number, timestamp, event, ...data} = record
					const camelCaseData = {
						ItemId: data.itemid,
						ContentId: data.contentid,
						ProductId: data.productid,
						VatType: data.vattype,
						Price: data.price,
						WholesalePrice: data.wholesaleprice || similarRecord?.wholesaleprice || null,
						PriceMarkupB2b: data.price_markup_b2b,
						PriceMarkupB2c: data.price_markup_b2c
					}

					await this.broker.sendToChannel('one-c-products-price-topic', {
						recid,
						number,
						timestamp,
						event,
						data: camelCaseData
					}, {key: `${recid}`})
				}

				await this.settings.db.collection(table_name).updateOne(
					{recid: record.recid},
					{
						$set: action === 'delete' ?
							{to_be_deleted: true}
							:
							{...record, updated_at: new Date()},
						$setOnInsert: {created_at: new Date()}
					},
					{
						upsert: true
					}
				)
			}
			await this.settings.db.collection(table_name).createIndex({ 'recid': 1 }, { unique: true })
		},
		async createIndexes(){
			await this.settings.db.collection('one-c-customers-order').createIndex({ 'контрагент.idax': 1 }, { unique: false })
			await this.settings.db.collection('one-c-customers-order').createIndex({ 'грузополучатель.idax': 1 }, { unique: false })
			await this.settings.db.collection('one-c-act-provision-production-services').createIndex({ 'контрагент.idax': 1 }, { unique: false })
			await this.settings.db.collection('one-c-act-provision-production-services').createIndex({ 'грузополучатель.idax': 1 }, { unique: false })
		},
		/**
		 * Authorize the request. Check that the authenticated user has right to access the resource.
		 *
		 * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingRequest} req
		 * @returns {Promise}
		 */
		async authorize(ctx, route, req, res) {
			const auth = req.headers['authorization']
			if (auth && auth.startsWith('Bearer')) {
				const token = auth.slice(7)
				const { method} = req
				const remoteAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
				this.logger.info(`Request from ${remoteAddress}. Token: ${token}`)

				//check token
				if (
					(method === 'GET' && Object.values(this.settings.API_TOKENS[VAULT_API_CONSUMERS_FOLDER]).includes(token))
					||
					(method === 'POST' && Object.values(this.settings.API_TOKENS[VAULT_API_PRODUCERS_FOLDER]).includes(token))
				) {
					return Promise.resolve(ctx)
				} else {
					return Promise.reject(new E.UnAuthorizedError(E.ERR_INVALID_TOKEN))
				}
			} else {
				// No token
				return Promise.reject(new E.UnAuthorizedError(E.ERR_NO_TOKEN))
			}
		},

		async vaultGetApiTokens() {
			try {
				const tokenFolders = [VAULT_API_CONSUMERS_FOLDER, VAULT_API_PRODUCERS_FOLDER]
				for (const tokenFolder of tokenFolders) {
					const tokens = (await axios.get(`${VAULT_HOST}/v1/${VAULT_ROOT_FOLDER}/data/${tokenFolder}`, {
						headers: {
							'X-Vault-Token': VAULT_TOKEN
						}
					})).data.data.data
					this.settings.API_TOKENS[tokenFolder] = tokens
				}
				this.logger.info('Vault get tokens successful')
			} catch (e) {
				throw new MoleculerServerError(`Vault get tokens failed with status ${e.response.status}, error message: ${e.response.data.errors[0]}`)
			}
		}
	},

	channels: {
		'channel.message.api.received': {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${ctx.params.table_name}:${ctx.params.action}`,
					key: ctx.params.record.recid || ctx.params.record.kafkakey,
					value: ctx.params.record
				})
			}
		}
	},

	started() {
		this.vaultGetApiTokens()
	}
}
