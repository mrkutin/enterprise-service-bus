const sql = require('mssql')
const {NVarChar, Int} = require('mssql')

const {
	MSSQL_SERVER: server,
	MSSQL_PORT: port,
	MSSQL_USER: user,
	MSSQL_PASSWORD: password,
	MSSQL_DATABASE: database
} = process.env

const sqlConfig = {
	server, port: parseInt(port), user, password, database, requestTimeout: 600000, pool: {
		max: 10, min: 0, idleTimeoutMillis: 30000
	}, options: {
		encrypt: false, // true for azure
		trustServerCertificate: true // change to true for local dev / self-signed certs
	}
}

module.exports = {
	name: 'mssql.mixin',

	methods: {
		async createCustomer(inn, kpp, channelid, custvendsource, custvendtype) {
			await this.settings.pool.request()
				.input('DataArea', NVarChar, 'psv')
				.input('Inn', NVarChar, inn)
				.input('Kpp', NVarChar, kpp)
				.input('ChannelId', NVarChar, channelid)
				.input('CustVendSource', NVarChar, custvendsource)
				.input('CustVendType', NVarChar, custvendtype)
				.execute('PSV_SP_SysExchCustTableInsert_DirectSQL')
			this.logger.info(`Customer with ${JSON.stringify({inn, kpp, channelid, custvendsource, custvendtype})} created successfully`)
		},
		async createAgreement(custvend, partynumber, agreementid, documenttitle, agreementdate, classificationid, custvendsource) {
			await this.settings.pool.request()
				.input('DataArea', NVarChar, 'psv')
				.input('CustVend', Int, custvend)
				.input('PartyNumber', NVarChar, partynumber)
				.input('AgreementId', NVarChar, agreementid)
				.input('DocumentTitle', NVarChar, documenttitle)
				.input('AgreementDate', NVarChar, agreementdate)
				.input('ClassificationId', NVarChar, classificationid)
				.input('CustVendSource', Int, custvendsource)
				.execute('PSV_SP_SysExchAgreementInsert_DirectSQL')
			this.logger.info(`Agreement with ${JSON.stringify({custvend, partynumber, agreementid, documenttitle, agreementdate, classificationid, custvendsource})} created successfully`)
		},
		async getInventEditionBOM(itemid, inventeditionid) {
			const result = await this.settings.pool.request()
				.input('ItemId', NVarChar, itemid)
				.input('InventEditionId', NVarChar, inventeditionid)
				.execute('PSV_SP_InventEditionBOM_DirectSQL')
			return result.recordset
		},
		async getSalesConsigneeLine(salesconsigneecode) {
			const result = await this.settings.pool.request()
				.input('SalesConsigneeCode', NVarChar, salesconsigneecode)
				.execute('PSV_SP_SysExchSalesConsigneeLine_DirectSQL')
			return result.recordset
		},
		async getSalesInvConsigneeLine(salesid) {
			const result = await this.settings.pool.request()
				.input('SalesId', NVarChar, salesid)
				.execute('PSV_SP_SysExchSalesInvConsigneeLine_DirectSQL')
			return result.recordset
		}
	},

	async started() {
		this.settings.pool = await sql.connect(sqlConfig)
	}
}
