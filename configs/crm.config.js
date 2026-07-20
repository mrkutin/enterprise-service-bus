module.exports = [
	{
		name: 'crm incoming orders',
		tableName: process.env.CRM_INCOMING_ORDERS_TABLE_NAME || 'one-c-orders-crm',
		recordsCount: process.env.CRM_INCOMING_ORDERS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_INCOMING_ORDERS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_INCOMING_ORDERS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendOrders',
		matchQuery: {},
		accountCodesMapping(records) {
			return records.map(record => [record.account_code, record.consignee_code]).flat()
		}
	},
	{
		name: 'crm realization orders',
		tableName: process.env.CRM_REALIZATION_ORDERS_TABLE_NAME || 'one-c-realization-orders-crm',
		recordsCount: process.env.CRM_REALIZATION_ORDERS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_REALIZATION_ORDERS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_REALIZATION_ORDERS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendRealizationOrders',
		matchQuery: {},
		accountCodesMapping(records) {
			return records.map(record => [record.account_code, record.consignee_code]).flat()
		}
	},
	{
		name: 'crm one-c incoming orders',
		tableName: process.env.CRM_ONE_C_INCOMING_ORDERS_TABLE_NAME || 'crm-one-c-incoming-orders',
		recordsCount: process.env.CRM_INCOMING_ORDERS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_INCOMING_ORDERS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_INCOMING_ORDERS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendOrders',
		matchQuery: {},
		accountCodesMapping(records) {
			return records.map(record => [record.account_code, record.consignee_code]).flat()
		}
	},
	{
		name: 'crm one-c realization orders',
		tableName: process.env.CRM_ONE_C_REALIZATION_ORDERS_TABLE_NAME || 'crm-one-c-realization-orders',
		recordsCount: process.env.CRM_REALIZATION_ORDERS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_REALIZATION_ORDERS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_REALIZATION_ORDERS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendRealizationOrders',
		matchQuery: {},
		accountCodesMapping(records) {
			return records.map(record => [record.account_code, record.consignee_code]).flat()
		}
	},
	{
		name: 'crm agreements',
		tableName: process.env.CRM_AGREEMENTS_TABLE_NAME || 'one-c-agreements-crm',
		recordsCount: process.env.CRM_AGREEMENTS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_AGREEMENTS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_AGREEMENTS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendContracts',
		matchQuery: {
			$expr: { $gt: [{ $strLenCP: '$cust_account_code' }, 0] },
			$or: [
				{
					channel_code: {
						$in: ['000000001', '000000008']
					}
				},
				{
					is_correct_efu: true
				}
			]
		},
		accountCodesMapping(records) {
			return records.map(record => record.cust_account_code)
		}
	},
	// TODO REMOVE AFTER TESTING one-c-counterparty-response-crm
	// and add one-c-counterparty-response-crm to CRM_CLIENTS_TABLE_NAME env
	{
		name: 'crm clients',
		tableName: 'cust-table-response-crm',
		recordsCount: process.env.CRM_CLIENTS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_CLIENTS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_CLIENTS_ENDPOINT
			:
			'https://test.crm.prosv.ru/0/rest/CrocEntityService/SendAccounts',
		matchQuery: {
			$or: [
				{
					'ax_identificators.channel_code': {
						$in: ['000000001', '000000008']
					}
				},
				{
					forced: true
				}
			]
		}
	},
	//
	{
		name: 'crm clients',
		tableName: 'one-c-counterparty-response-crm',
		recordsCount: process.env.CRM_CLIENTS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_CLIENTS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_CLIENTS_ENDPOINT
			:
			'https://test.crm.prosv.ru/0/rest/CrocEntityService/SendAccounts',
		matchQuery: {
			$or: [
				{
					'ax_identificators.channel_code': {
						$in: ['000000001', '000000008']
					}
				},
				{
					forced: true
				}
			]
		}
	},
	{
		name: 'crm items',
		tableName: process.env.CRM_ITEMS_TABLE_NAME || 'one-c-items-crm',
		recordsCount: process.env.CRM_ITEMS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_ITEMS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_ITEMS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/CrocEntityService/SendProducts',
		matchQuery: {}
	},
	{
		name: 'crm bi payment orders',
		tableName: process.env.CRM_BI_PAYMENT_ORDERS_TABLE_NAME || 'bi-payment-orders',
		recordsCount: process.env.CRM_BI_PAYMENT_ORDERS_RECORDS_COUNT || 20,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_BI_PAYMENT_ORDERS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_BI_PAYMENT_ORDERS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/DWHService/SendPaymentOrders',
		matchQuery: {}
	},
	{
		name: 'crm bi account receivables',
		tableName: process.env.CRM_BI_ACCOUNT_RECEIVABLES_TABLE_NAME || 'bi-accounts-receivable',
		recordsCount: process.env.CRM_BI_ACCOUNT_RECEIVABLES_RECORDS_COUNT || 20,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_BI_ACCOUNT_RECEIVABLES_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_BI_ACCOUNT_RECEIVABLES_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/DWHService/SendAccountReceivables',
		matchQuery: {}
	},
	{
		name: 'crm bi kpi sales',
		tableName: process.env.CRM_BI_KPI_SALES_TABLE_NAME || 'bi-kpi-sales',
		recordsCount: process.env.CRM_BI_KPI_SALES_RECORDS_COUNT || 20,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_BI_KPI_SALES_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_BI_KPI_SALES_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/DWHService/SendIndividualRegionOrderAmount',
		matchQuery: {}
	},
	{
		name: 'crm contacts',
		tableName: 'crm-contacts',
		recordsCount: process.env.CRM_CONTACTS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_CONTACTS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_CONTACTS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/BookOrdersService/SendContacts',
		matchQuery: {}
	},
	{
		name: 'crm jobs',
		tableName: 'crm-jobs',
		recordsCount: process.env.CRM_JOBS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_JOBS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_JOBS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/BookOrdersService/SendContacts',
		matchQuery: {}
	},
	{
		name: 'crm leads',
		tableName: 'crm-leads',
		recordsCount: process.env.CRM_LEADS_RECORDS_COUNT || 30,
		sendUrl: process.env.CRM_HOST && process.env.CRM_SEND_LEADS_ENDPOINT ?
			process.env.CRM_HOST + process.env.CRM_SEND_LEADS_ENDPOINT
			:
			'https://test.crm.prosv.ru/rest/LandingService/ImportMethod',
		matchQuery: {}
	}
]
