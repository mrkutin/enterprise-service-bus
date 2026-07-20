const {MoleculerServerError} = require('moleculer').Errors

module.exports = {
	localAction(next) {
		return async function (ctx) {
			try {
				return await next(ctx)
			} catch (e) {
				if ([400, 401].includes(e.code)) {
					throw e
				}
				throw new MoleculerServerError(e.stack)
			}
		}
	}
}
