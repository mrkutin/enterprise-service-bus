const subscriptionTopics = [
	'309d006e-a04b-47ed-8061-5f43a391f2b0',
	'f1409d47-650c-4d55-aac5-fcc008b6055e',
	'e1489848-ab58-434f-ab13-8eb871e71d33',
	'9ea8c005-8308-49fb-aa9d-d25b85858ae5',
	'a69db2a4-c788-4c2c-9995-2886b4d4ee19',
	'921c5781-66dd-4d2b-81dd-a5ffa47af905',
	'6e48e5e9-e296-4ab7-8b3d-5522a2ab4ca1',
	'eccbf03c-83be-4957-8b69-f2205e98afe3',
	'59fac280-937b-48fc-8681-5a75285d9923',
	'409a5f23-e269-463f-a95b-4383f3645d8d',
	'b0e7206e-6f57-4e9e-aa52-ffee274625f6',
	'e5e1720d-e90b-4afb-b3e0-deb81ea8fa43',
	'ba92a517-c265-4144-a418-a9d7a4542486',
	'04ee8506-ce00-4b95-8313-1e025d32aeb6',
	'2d44665b-6f88-412e-ab01-208017c8ceaf',
	'4b57ef43-2116-45ee-9d2f-57eedb033b4e',
	'34d2d21a-eb05-47a4-91dd-5cb62d4f6061',
	'e7f2e782-0a27-48e4-9418-180a73234e38',
	'86044cc8-ca6f-4ce2-b572-e171fa11604d',
	'bcc31c32-2d97-4d25-9898-d34a62564bed',
	'644ed411-2f87-465a-91de-3e6d934b0acb',
	'919afbbc-d66c-4121-963a-e5826c4cd158',
	'8f97d629-8cab-4b5f-92d3-42fdcc46b55a'
]

const serviceNameByUUID = {
	'56bc1039-08d2-417d-ab93-bd59259c96ad':	'Сервис «Мультибук»',
	'b66414c4-7ea3-4dd1-b9ae-17d0969e0cfc':	'Сервис «Мультибук»',
	'ce4749eb-7408-4f34-9f14-168ab4dcec4e':	'Вебсайт ГК «Просвещение», новый',
	'c1de0a25-59a6-4e88-a894-50fe53556c6a':	'Сервис «Мультишлейф»',
	'43a46eac-bb8a-4ce4-a660-fc5905caa48b':	'Сервис «Домашние задания»',
	'daeb7d45-5cf4-420b-97a3-4bf0fb03cba1':	'Игровой контур'
}

module.exports = {
	'id-register-customer-topic': {
		sendMode: 'sync',
		tableName: 'mindbox-id-register-customer',
		retriesCount: 0,
		sendingOperation: 'Website.RegisterCustomer',
		isDeviceUUIDRequired: true,
		registrationMapping(message) {
			try {
				const mappedMessage = {
					customer: {
						ids: {
							referralCustomerCode: message.actor,
							websiteID: message.actor
						}
					}
				}

				if (Object.keys(serviceNameByUUID).includes(message.consumer)) {
					mappedMessage.pointOfContact = serviceNameByUUID[message.consumer]
				}

				if (message.attributes.sex) {
					mappedMessage.customer.sex = message.attributes.sex
				}

				if (message.attributes.nameLast) {
					mappedMessage.customer.lastName = message.attributes.nameLast
				}

				if (message.attributes.nameFirst) {
					mappedMessage.customer.firstName = message.attributes.nameFirst
				}

				if (message.attributes.namePatronymic) {
					mappedMessage.customer.middleName = message.attributes.namePatronymic
				}

				if (message.attributes.region?.length) {
					mappedMessage.customer.area = {}
					mappedMessage.customer.area.ids = {}
					mappedMessage.customer.area.ids.externalId = message.attributes.region[0].uuid
				}

				if (message.attributes.email?.length) {
					mappedMessage.customer.email = message.attributes.email[0].value
				}

				if (message.attributes.role?.length) {
					mappedMessage.customer.customFields = {}
					mappedMessage.customer.customFields.role = message.attributes.role.map(role => role.uuid)
				}

				if (message.attributes.parentCommittee !== null) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.parentCommittee = message.attributes.parentCommittee
				}

				if (message.attributes.children?.length) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.childrenbirthday = message.attributes.children[0].birthday
					mappedMessage.customer.customFields.children = message.attributes.children[0].name
				}

				if (message.hasOwnProperty('legalEntity')) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.legalentity = message.legalEntity
				}

				if (message.attributes.mailing?.length) {
					mappedMessage.customer.subscriptions = message.attributes.mailing.map(sub => ({
						brand: 'prosv',
						pointOfContact: 'EMAIL',
						topic: sub.uuid
					})).concat([
						{
							brand: 'prosv',
							pointOfContact: 'EMAIL'
						},
						{
							brand: 'prosv',
							pointOfContact: 'SMS'
						},
						{
							brand: 'prosv',
							pointOfContact: 'Webpush'
						},
					])
				}

				return mappedMessage
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'id-authorize-customer-topic': {
		sendMode: 'sync',
		tableName: 'mindbox-id-authorize-customer',
		retriesCount: 0,
		sendingOperation: 'Website.AuthorizeCustomer',
		isDeviceUUIDRequired: true,
		authorizationMapping(message) {
			try {
				const mappedMessage = {
					customer: {
						ids: {
							referralCustomerCode: message.actor,
							websiteID: message.actor
						}
					}
				}

				if (Object.keys(serviceNameByUUID).includes(message.consumer)) {
					mappedMessage.pointOfContact = serviceNameByUUID[message.consumer]
				}

				if (message.attributes.email?.length) {
					mappedMessage.customer.email = message.attributes.email[0].value
				}

				return mappedMessage
			} catch (e) {
				console.log(e.message)
			}
		},
		getCustomerMapping(message) {
			try {
				return {
					customer: {
						ids: {
							websiteID: message.actor
						}
					}
				}
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'id-edit-customer-topic': {
		sendMode: 'sync',
		tableName: 'mindbox-id-edit-customer',
		retriesCount: 0,
		sendingOperation: 'Website.EditCustomer',
		isDeviceUUIDRequired: true,
		mapping(message) {
			try {
				const mappedMessage = {
					customer: {
						ids: {
							websiteID: message.actor
						},
						subscriptions: subscriptionTopics.map(topic => ({
							brand: 'prosv',
							pointOfContact: 'EMAIL',
							topic,
							isSubscribed: message.attributes.mailing?.length ?
								message.attributes.mailing.map(sub => sub.uuid).includes(topic)
								:
								false
						})).concat([
							{
								brand: 'prosv',
								pointOfContact: 'EMAIL',
								isSubscribed: true
							},
							{
								brand: 'prosv',
								pointOfContact: 'SMS',
								isSubscribed: true
							},
							{
								brand: 'prosv',
								pointOfContact: 'Webpush',
								isSubscribed: true
							}
						])
					}
				}

				if (message.attributes.birthday) {
					mappedMessage.customer.birthDate = message.attributes.birthday
				}

				if (message.attributes.sex) {
					mappedMessage.customer.sex = message.attributes.sex
				}

				if (message.attributes.nameLast) {
					mappedMessage.customer.lastName = message.attributes.nameLast
				}

				if (message.attributes.nameFirst) {
					mappedMessage.customer.firstName = message.attributes.nameFirst
				}

				if (message.attributes.namePatronymic) {
					mappedMessage.customer.middleName = message.attributes.namePatronymic
				}

				if (message.attributes.region?.length) {
					mappedMessage.customer.area = {}
					mappedMessage.customer.area.ids = {}
					mappedMessage.customer.area.ids.externalId = message.attributes.region[0].uuid
				}

				if (message.attributes.email?.length) {
					mappedMessage.customer.email = message.attributes.email[0].value
				}

				if (message.attributes.phone?.length) {
					mappedMessage.customer.mobilePhone = message.attributes.phone[0].value
				}

				if (message.attributes.role?.length) {
					mappedMessage.customer.customFields = {}
					mappedMessage.customer.customFields.role = message.attributes.role.map(role => role.uuid)
				}

				if (message.attributes.parentCommittee !== null) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.parentCommittee = message.attributes.parentCommittee
				}

				if (message.attributes.children?.length) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.childrenbirthday = message.attributes.children[0].birthday
					mappedMessage.customer.customFields.children = message.attributes.children[0].name
				}

				if (message.hasOwnProperty('legalEntity')) {
					if (!mappedMessage.customer.customFields) {
						mappedMessage.customer.customFields = {}
					}
					mappedMessage.customer.customFields.legalentity = message.legalEntity
				}

				return mappedMessage
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'id-customer-delete-topic': {
		sendMode: 'sync',
		tableName: 'mindbox-id-customer-delete',
		retriesCount: 0,
		sendingOperation: 'CustomerDataUpdate',
		isDeviceUUIDRequired: false,
		mapping(message) {
			try {
				return {
					customer: {
						customFields: {
							customerDelete: 'True'
						},
						ids: {
							websiteID: message.actor
						}
					}
				}
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'magento-set-cart-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.SetCart',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'magento-notify-arrival-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.NotifyArrival',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'magento-create-unauthorized-order-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.CreateUnauthorizedOrder',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'magento-create-authorized-order-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.CreateAuthorizedOrder',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'm3-license-create-authorized-order-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.CreateAuthorizedOrder',
		isDeviceUUIDRequired: false,
		mapping: false
	},
	'magento-update-order-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.UpdateOrder',
		isDeviceUUIDRequired: false,
		mapping: false
	},
	'magento-update-order-status-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.UpdateOrderStatus',
		isDeviceUUIDRequired: false,
		mapping: false
	},
	'm3-license-update-order-status-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.UpdateOrderStatus',
		isDeviceUUIDRequired: false,
		mapping: false
	},
	'pas-view-product-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.ViewProduct',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'pas-set-wish-list-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.SetWishList',
		isDeviceUUIDRequired: true,
		pricesTableName: 'ps-feed-price-stock-catalog',
		setWishListMapping(groupedPricesById) {
			return {
				productList: Object.keys(groupedPricesById).map(key => ({
					product: {
						ids: {
							website: key
						}
					},
					count: '1',
					pricePerItem: groupedPricesById[key]
				}))
			}
		}
	},
	'pas-view-category-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.ViewCategory',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'pas-subscription-in-footer-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'Website.SubscriptionInFooter',
		isDeviceUUIDRequired: true,
		mapping: false
	},
	'multibook-teacher-student-product-link-topic': {
		sendMode: 'sync',
		retriesCount: 0,
		sendingOperation: 'ReferralInviteFriend',
		isDeviceUUIDRequired: false,
		referralMapping(message) {
			try {
				const mappedMessage = {
					customer: {
						ids: {
							websiteID: message.websiteID
						},
						subscriptions: [
							{
								brand: 'prosv',
								pointOfContact: 'EMAIL',
								isSubscribed: true
							},
							{
								brand: 'prosv',
								pointOfContact: 'SMS',
								isSubscribed: true
							},
							{
								brand: 'prosv',
								pointOfContact: 'Webpush',
								isSubscribed: true
							}
						]
					}
				}

				if (Object.keys(serviceNameByUUID).includes(message.pointOfContact)) {
					mappedMessage.pointOfContact = serviceNameByUUID[message.pointOfContact]
				}

				if (message.productinregister) {
					if (!mappedMessage.customerAction) {
						mappedMessage.customerAction = {}
					}
					if (!mappedMessage.customerAction.customFields) {
						mappedMessage.customerAction.customFields = {}
					}
					mappedMessage.customerAction.customFields.productinregister = message.productinregister
				}

				if (message.referralCustomerCode) {
					if (!mappedMessage.referencedCustomer) {
						mappedMessage.referencedCustomer = {}
					}
					if (!mappedMessage.referencedCustomer.ids) {
						mappedMessage.referencedCustomer.ids = {}
					}
					mappedMessage.referencedCustomer.ids.referralCustomerCode = message.referralCustomerCode
				}

				return mappedMessage
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'hw-mindbox-task-student-completed-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'ReferProgrammaNachislenie',
		isDeviceUUIDRequired: false,
		referralMapping(message) {
			try {
				const mappedMessage = {
					customer: {
						ids: {
							websiteID: message.websiteID
						}
					}
				}

				if (message.email?.length) {
					mappedMessage.customer.email = message.email
				}

				if (Object.keys(serviceNameByUUID).includes(message.pointOfContact)) {
					mappedMessage.pointOfContact = serviceNameByUUID[message.pointOfContact]
				}

				if (message.hasOwnProperty('changeAmount')) {
					mappedMessage.balanceChanges = [
						{
							changeAmount: message.changeAmount
						}
					]
				}

				return mappedMessage
			} catch (e) {
				console.log(e.message)
			}
		}
	},
	'multitrain-login-customer-topic': {
		sendMode: 'async',
		retriesCount: 0,
		sendingOperation: 'Website.LogInCustomer',
		isDeviceUUIDRequired: false,
		mapping: false
	},
}
