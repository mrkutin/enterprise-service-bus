const Openapi = require('moleculer-auto-openapi-configurable')

module.exports = {
	name: 'openapi',
	mixins: [Openapi],
	settings: {
		schemaPath: "/openapi.json",
		uiPath: "/ui",
		assetsPath: "/assets",
		openapi: {
			info: {
				title: 'Enterprise service bus',
				description: 'Для фильтрации вывода в запросе <b>GET /v5/{table-name}</b> сервиса <b>state</b> используется поле <b>recid</b>.<br>' +
					'Чтобы изменить поле, по которому будет производиться фильтрация в запросе, необходимо в поле <b>params</b> в описании сервиса добавить новые поля и/или заменить эти поля на необходимые.<br>' +
					'Например:<br><br>' +
					'params: {<br>' +
					'	<b>inventcontent_recid</b>: {type: \'string\', optional: true}<br>' +
					'}<br><br>' +
					'заменить на<br><br>' +
					'params: {<br>' +
					'<b>pricedisctablecust_recid</b>: {type: \'string\', optional: true}<br>' +
					'}'
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					},
				},
			}
		},
		excludeRoutes: ['api/openapi']
	}
}
