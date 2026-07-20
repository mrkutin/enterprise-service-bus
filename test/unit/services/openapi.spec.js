'use strict'

jest.mock('moleculer-auto-openapi-configurable', () => ({ mocked: true }))
const Openapi = require('moleculer-auto-openapi-configurable')

const ServiceSchema = require('../../../services/openapi.service')

describe('openapi service (unit)', () => {
	it('exports correct name, mixins and settings', () => {
		expect(ServiceSchema.name).toBe('openapi')

		// mixins includes mocked Openapi
		expect(Array.isArray(ServiceSchema.mixins)).toBe(true)
		expect(ServiceSchema.mixins).toContain(Openapi)

		// settings paths
		expect(ServiceSchema.settings.schemaPath).toBe('/openapi.json')
		expect(ServiceSchema.settings.uiPath).toBe('/ui')
		expect(ServiceSchema.settings.assetsPath).toBe('/assets')

		// settings.openapi info
		expect(ServiceSchema.settings.openapi.info).toEqual(
			expect.objectContaining({
				title: 'Enterprise service bus',
				description: expect.any(String)
			})
		)

		// security scheme
		const bearer = ServiceSchema.settings.openapi.components.securitySchemes.bearerAuth
		expect(bearer).toEqual({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })

		// excluded routes
		expect(ServiceSchema.settings.excludeRoutes).toEqual(['api/openapi'])
	})
})


