const StateMixin = require('../mixins/state.mixin')
const KafkaMixin = require('../mixins/kafka.mixin')
const topicsConfig = require('../configs/mindbox.topics.config')
const axios = require('axios')
const crypto = require('crypto')
const {MoleculerServerError} = require('moleculer').Errors
const CronMixin = require('moleculer-cron')
const MINDBOX_HOST = process.env.MINDBOX_HOST
const MINDBOX_SEND_ENDPOINT = process.env.MINDBOX_SEND_ENDPOINT
const MINDBOX_ENDPOINT_ID = process.env.MINDBOX_ENDPOINT_ID
const MINDBOX_SECRET_KEY = process.env.MINDBOX_SECRET_KEY

const {
	MINDBOX_REFERRAL_ATTEMPTS_COUNT,
	YANDEX_METRICS_HOST,
	YANDEX_METRICS_COUNTER_ID,
	YANDEX_METRICS_TOKEN
} = process.env

module.exports = {
	name: 'mindbox',

	mixins: [StateMixin, KafkaMixin, CronMixin],

	settings: {
		kafkaGroupId: 'bus-mindbox-groupid',
		topicsConfig,
		referralAttemptsCount: MINDBOX_REFERRAL_ATTEMPTS_COUNT,
		cronJobs: [
			{
				name: 'processYandexMetrics',
				cronTime: '0 22 * * *', // Run every day at 1 am
				onTick: async function() {
					this.logger.info('processYandexMetrics ticked')
					await this.broker.call(`${this.name}.processYandexMetrics`)
				}
			}
		]
	},

	methods: {
		async startStateLoop() {},
		async consumerProcess(topic, message) {
			const key = message.key.toString()
			const {deviceUUID, ...parsedMessage} = JSON.parse(message.value.toString())
			const { mapping, tableName } = topicsConfig[topic]

			await this.applyMessages(topic.split('-topic')[0], [{...parsedMessage, deviceUUID, recid: key}], 'insert')
			if (mapping) {
				const mappedMessage = mapping(parsedMessage)

				await this.applyMessages(tableName, [{...mappedMessage, recid: key}], 'insert')
				await this.mindboxProccess(topic, key, mappedMessage, deviceUUID)
			} else {
				switch (topic) {
					case 'magento-create-authorized-order-topic':
						await this.mindboxMagentoOrderProccess(topic, key, parsedMessage, deviceUUID)
						break
					case 'magento-create-unauthorized-order-topic':
						await this.mindboxMagentoOrderProccess(topic, key, parsedMessage, deviceUUID)
						break
					case 'id-register-customer-topic':
						await this.mindboxIdRegisterProccess(topic, key, parsedMessage, deviceUUID, false)
						break
					case 'id-authorize-customer-topic':
						await this.mindboxIdAuthorizeProccess(topic, key, parsedMessage, deviceUUID, false)
						break
					case 'pas-set-wish-list-topic':
						await this.mindboxSetWishListProccess(topic, key, parsedMessage, deviceUUID)
						break
					case 'multibook-teacher-student-product-link-topic':
						await this.mindboxReferralProccess(topic, key, parsedMessage, deviceUUID)
						break
					case 'hw-mindbox-task-student-completed-topic':
						await this.mindboxReferralProccess(topic, key, parsedMessage, deviceUUID)
						break
					default:
						await this.mindboxProccess(topic, key, parsedMessage, deviceUUID)
				}
			}
		},

		async mindboxProccess(topic, key, message, deviceUUID) {
			this.logger.info(`Method mindboxProccess: ${JSON.stringify({message, topic, key})}`)
			const { sendingOperation, isDeviceUUIDRequired, sendMode } = topicsConfig[topic]
			await this.mindboxUpload(topic, message, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
		},

		async mindboxMagentoOrderProccess(topic, key, message, deviceUUID) {
			this.logger.info(`Method mindboxMagentoOrderProccess: ${JSON.stringify({message, topic, key})}`)
			const { sendingOperation, isDeviceUUIDRequired, sendMode } = topicsConfig[topic]
			await this.mindboxUpload(topic, message, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)

			if (message.orderLinesStatus) {
				const mappedStatus = {
					orderLinesStatus: message.orderLinesStatus,
					order: {
						email: message.customer.email,
						mobilePhone: message.customer.mobilePhone,
						ids: {
							websiteID: message.order.ids.websiteId
						}
					}
				}

				const updateOrderStatusTopicName =  'magento-update-order-status-topic'
				const { sendMode, sendingOperation, isDeviceUUIDRequired  } = topicsConfig[updateOrderStatusTopicName]
				await this.mindboxUpload(updateOrderStatusTopicName, mappedStatus, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
			}
		},
		async mindboxIdRegisterProccess(topic, key, message, deviceUUID, isReferralSend) {
			this.logger.info(`Method mindboxIdRegisterProccess: ${JSON.stringify({message, topic, key})}`)
			if (message.consumer !== '43a46eac-bb8a-4ce4-a660-fc5905caa48b' || isReferralSend) {
				const { sendingOperation, isDeviceUUIDRequired, sendMode, registrationMapping } = topicsConfig[topic]
				const mappedMessage = registrationMapping(message)
				await this.mindboxUpload(topic, mappedMessage, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
			}
		},
		async mindboxIdAuthorizeProccess(topic, key, message, deviceUUID, isReferralSend) {
			this.logger.info(`Method mindboxIdAuthorizeProccess: ${JSON.stringify({message, topic, key})}`)
			if (message.actor) {
				if (message.consumer !== '43a46eac-bb8a-4ce4-a660-fc5905caa48b' || isReferralSend) {
					const {
						authorizationMapping, getCustomerMapping,
						sendingOperation, isDeviceUUIDRequired,
						sendMode
					} = topicsConfig[topic]
					const idAuthorizationMessage = authorizationMapping(message)
					const idCustomerMessage = getCustomerMapping(message)
					const idEmail = message.attributes.email?.length ? message.attributes.email[0].value : null
					const idPhone = message.attributes.phone?.length ? message.attributes.phone[0].value : null
					const {customer: mindboxCustomerMessage} = await this.mindboxUpload('get customer operation', idCustomerMessage, key, 'GetCustomer', false, deviceUUID, 'sync')
					if (mindboxCustomerMessage.processingStatus === 'NotFound') {
						// register customer
						const registerCustomerTopic = 'id-register-customer-topic'
						const { sendingOperation, isDeviceUUIDRequired, registrationMapping, sendMode } = topicsConfig[registerCustomerTopic]
						const mappedMessage = registrationMapping(message)
						await this.mindboxUpload(registerCustomerTopic, mappedMessage, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
					} else {
						if (
							(!mindboxCustomerMessage.email && idEmail)
							||
							(!mindboxCustomerMessage.mobilePhone && idPhone)
						) {
							// edit customer
							const editCustomerTopic = 'id-edit-customer-topic'
							const { sendingOperation, isDeviceUUIDRequired, mapping, sendMode } = topicsConfig[editCustomerTopic]
							const mappedMessage = mapping(message)
							await this.mindboxUpload(editCustomerTopic, mappedMessage, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
						}
					}
					// send authorization
					await this.mindboxUpload(topic, idAuthorizationMessage, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
				}
			}
		},
		async mindboxSetWishListProccess(topic, key, message, deviceUUID) {
			this.logger.info(`Method mindboxSetWishListProccess: ${JSON.stringify({message, topic, key})}`)
			const {productList} = message
			if (productList.length) {
				const {
					pricesTableName, setWishListMapping,
					sendingOperation, isDeviceUUIDRequired,
					sendMode
				} = topicsConfig[topic]
				const prices = await this.getRecords(
					pricesTableName,
					[
						{
							$match: {
								recid: {
									$in: productList
								}
							}
						}
					]
				)
				const groupedPricesById = productList.reduce((acc, value) => {
					const contentid = value.split('_')[0]
					if (!acc[contentid]) {
						acc[contentid] = {}
					}
					acc[contentid] = prices.find(price => price.recid === value)?.price || 0
					return acc
				}, {})
				const mappedWishList = setWishListMapping(groupedPricesById)
				await this.mindboxUpload(topic, mappedWishList, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
			}
		},

		async mindboxReferralProccess(topic, key, message, deviceUUID) {
			this.logger.info(`Method mindboxReferralProccess: ${JSON.stringify({message, topic, key})}`)
			const tableName = topic.split('-topic')[0]
			const { sendingOperation, isDeviceUUIDRequired, referralMapping, sendMode } = topicsConfig[topic]
			const referralAttempts = (await this.getRecords(
				tableName,
				[
					{
						$match: {
							recid: key
						}
					},
					{
						$project: {
							_id: 0,
							attempts: 1
						}
					}
				]
			))[0]?.attempts

			if (!referralAttempts || referralAttempts < parseInt(this.settings.referralAttemptsCount)) {
				const authorizationTopic = 'id-authorize-customer-topic'
				const registrationTopic = 'id-register-customer-topic'

				const authorizationRecord = (await this.getRecords(
					authorizationTopic.split('-topic')[0],
					[
						{
							$match: {
								actor: message.websiteID
							}
						},
						{
							$sort: {
								updated_at: -1
							}
						},
						{
							$limit: 1
						}
					]
				))[0]

				const registrationRecord = (await this.getRecords(
					registrationTopic.split('-topic')[0],
					[
						{
							$match: {
								actor: message.websiteID
							}
						},
						{
							$sort: {
								updated_at: -1
							}
						},
						{
							$limit: 1
						}
					]
				))[0]

				if (authorizationRecord?.mindbox_status === 'success' || registrationRecord?.mindbox_status === 'success') {
					// send referral
					const mappedReferral = referralMapping(message)
					await this.mindboxUpload(topic, mappedReferral, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
				} else if (authorizationRecord) {
					// send auth
					await this.mindboxIdAuthorizeProccess(
						authorizationTopic, authorizationRecord.actor,
						authorizationRecord, authorizationRecord.deviceUUID,
						true
					)
					// send referral
					const mappedReferral = referralMapping(message)
					await this.mindboxUpload(topic, mappedReferral, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
				} else if (registrationRecord) {
					// send registration
					await this.mindboxIdRegisterProccess(
						registrationTopic, registrationRecord.actor,
						registrationRecord, registrationRecord.deviceUUID,
						true
					)
					// send referral
					const mappedReferral = referralMapping(message)
					await this.mindboxUpload(topic, mappedReferral, key, sendingOperation, isDeviceUUIDRequired, deviceUUID, sendMode)
				} else {
					await this.updateRecords(
						tableName,
						{recid: key },
						{$inc: {attempts: 1}}
					)
					await this.broker.emit('referral.resend', {topic, key, message})
				}
			}
		},

		async mindboxUpload(topic, message, key, operation, isDeviceUUIDRequired, deviceUUID, sendMode) {
			this.logger.info(`Method mindboxUpload input: ${JSON.stringify({message, key, operation})}`)

			const sendingUrl = `${MINDBOX_HOST}${MINDBOX_SEND_ENDPOINT}/${sendMode || 'sync'}?endpointId=${MINDBOX_ENDPOINT_ID}&operation=${operation}`
			const deviceUUIDSendingUrl = deviceUUID?.length && isDeviceUUIDRequired ? `${sendingUrl}&deviceUUID=${deviceUUID}`: sendingUrl

			try {
				const response = await axios.post(deviceUUIDSendingUrl,
					message,
					{
						timeout: 20 * 1000,
						withCredentials: true,
						headers: {
							'Content-Type': 'application/json; charset=utf-8',
							Accept: 'application/json',
							Authorization: `Mindbox secretKey="${MINDBOX_SECRET_KEY}"`
						}
					})
				this.logger.info(`Successfully posted to Mindbox with payload: ${JSON.stringify({topic, key, message})}`)
				await this.updateRecords(
					topic.split('-topic')[0],
					{recid: key },
					{ $set: {mindbox_status: 'success', attempts: 1, updated_at: new Date()} }
				)
				return response.data
			} catch (e) {
				this.logger.error(`Mindbox upload error in topic ${topic} with payload: ${JSON.stringify({
					topic,
					key,
					message
				}, null, 2)}, error: ${JSON.stringify({'stack': e.stack, 'data': e?.response?.data?.errorMessage}, null, 2)}`)
				throw new MoleculerServerError(e.message, e?.response?.status || 500, undefined, e?.response?.data?.errorMessage)
			}
		},
		parseAndExtractTSV(tsv) {
			const lines = tsv.split('\n')
			if (lines.length < 2) return []

			const headers = lines[0].split('\t')
			const keyIndex = headers.indexOf('ym:pv:parsedParamsKey2')
			const valueIndex = headers.indexOf('ym:pv:parsedParamsKey3')

			return lines.slice(1).reduce((acc, line) => {
				if (!line.trim()) return acc

				const values = line.split('\t')
				if (values.length < headers.length) return acc

				try {
					const keys = JSON.parse(`[${values[keyIndex]?.replace(/'/g, '"') || '[]'}]`)[0]
					const valuesParsed = JSON.parse(`[${values[valueIndex]?.replace(/'/g, '"') || '[]'}]`)[0]

					const parsedRecord = {}
					keys.forEach((key, i) => {
						parsedRecord[key] = valuesParsed[i] || null
					})

					if (
						parsedRecord.referralCustomerCode &&
						parsedRecord.websiteID &&
						parsedRecord.productinregister &&
						parsedRecord.pointOfContact
					) {
						acc.push({
							referralCustomerCode: parsedRecord.referralCustomerCode,
							websiteID: parsedRecord.websiteID,
							productinregister: parsedRecord.productinregister,
							pointOfContact: parsedRecord.pointOfContact
						})
					}
				} catch (error) {
					console.warn(`Parsing error: ${error.message} in line: ${line}`)
				}

				return acc
			}, [])
		},
		getUniqueRecords(records) {
			const seen = new Set()
			return records.filter(record => {
				const recordString = JSON.stringify(record)
				if (seen.has(recordString)) {
					return false
				}
				seen.add(recordString)
				return true
			})
		}
	},

	actions: {
		processYandexMetrics: {
			timeout: 30 * 60 * 1000,
			retryPolicy: {
				enabled: true,
				retries: 6,
				delay: 5 * 60 * 1000,
				maxDelay: 5 * 60 * 1000,
				factor: 1
			},
			async handler(ctx) {
				const yesterdayDate = new Date(Date.now() - 86400000).toISOString().substring(0,10)
				const requestId = (await axios.post(
					`${YANDEX_METRICS_HOST}/management/v1/counter/${YANDEX_METRICS_COUNTER_ID}/logrequests`,
					{},
					{
						params: {
							'source': 'hits',
							'date1': yesterdayDate,
							'date2': yesterdayDate,
							'fields': 'ym:pv:counterUserIDHash,ym:pv:counterID,ym:pv:watchID,ym:pv:dateTime,ym:pv:parsedParamsKey1,ym:pv:parsedParamsKey2,ym:pv:parsedParamsKey3'
						},
						headers: {
							Authorization: `OAuth ${YANDEX_METRICS_TOKEN}`
						}
					})).data.log_request.request_id

				await new Promise(resolve => setTimeout(resolve, 60 * 1000))
				const tsvRecordsString = await this.broker.call(`${this.name}.downloadYandexMetrics`, {requestId})
				const parsedAndFiltredTSV = this.parseAndExtractTSV(tsvRecordsString)
				const uniqueRecords = this.getUniqueRecords(parsedAndFiltredTSV)
				if (uniqueRecords.length) {
					const mappedUniqueRecords = uniqueRecords.map(record => ({
						recid: crypto.createHash('md5').update(
							`${record.referralCustomerCode}${record.websiteID}${record.productinregister}${record.pointOfContact}`
						).digest('hex').toUpperCase(),
						...record
					}))
					const existingRecids = (await this.getRecords(
						'multibook-teacher-student-product-link',
						[
							{
								$match: {
									recid: {
										$in: mappedUniqueRecords.map(record => record.recid)
									}
								}
							},
							{
								$project: {
									_id: 0,
									recid: 1
								}
							}
						])
					).map(res => res.recid)
					const notExistingRecords = mappedUniqueRecords.filter(record => !existingRecids.includes(record.recid))
					if (notExistingRecords.length) {
						for (const record of notExistingRecords) {
							const {recid, ...rest} = record
							await this.broker.sendToChannel('multibook-teacher-student-product-link-topic', rest, {key: recid.toString()})
						}
						this.logger.info(`New records added from Yandex metrics: ${notExistingRecords.length}`)
					}
				}
			}
		},
		downloadYandexMetrics: {
			timeout: 10 * 60 * 1000,
			retryPolicy: {
				enabled: true,
				retries: 10,
				delay: 60 * 1000,
				maxDelay: 60 * 1000,
				factor: 1
			},
			async handler(ctx) {
				const {requestId} = ctx.params
				try {
					return (await axios.get(
						`${YANDEX_METRICS_HOST}/management/v1/counter/${YANDEX_METRICS_COUNTER_ID}/logrequest/${requestId}/part/0/download`,
						{
							headers: {
								Authorization: `OAuth ${YANDEX_METRICS_TOKEN}`
							}
						})).data
				} catch (e) {
					throw new MoleculerServerError(`Yandex download metrics error with payload: ${JSON.stringify({requestId}, null, 2)}, error: ${e}`)
				}
			}
		}
	}
}
