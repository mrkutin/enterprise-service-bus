'use strict'

const ServiceSchema = require('../../../services/inventedition.bom.generator.service')

describe('inventedition.bom.generator service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'inventedition.bom.generator',
			settings: { db: null },
			logger: { info: jest.fn(), error: jest.fn() },
			broker: { sendToChannel: jest.fn(), call: jest.fn() },
			getInventEditionBOM: jest.fn(),
			applyMessages: jest.fn()
		}
		jest.clearAllMocks()
	})

	describe('action: stateProcess', () => {
		it('maps BOM, applies messages, and publishes processed records', async () => {
			const records = [
				{ itemidassign: 'SKU1', inventeditionid: 'IE1', recid: '1' },
				{ itemidassign: 'SKU2', inventeditionid: 'IE2', recid: '2' }
			]
			service.getInventEditionBOM
				.mockResolvedValueOnce([
					{ INVENTEDITIONIDBOM: 'IE1', ItemId: 'SKU1', QTY: 2 },
					{ INVENTEDITIONIDBOM: 'IE1', ItemId: 'SKU1', QTY: 3 }
				])
				.mockResolvedValueOnce([
					{ INVENTEDITIONIDBOM: 'IE2', ItemId: 'SKU2', QTY: 5 }
				])

			await ServiceSchema.actions.stateProcess.handler.call(service, {
				action: { name: 'inventedition.bom.generator.stateProcess' },
				params: { records, action: 'insert' }
			})

			// Calls BOM fetch per record with correct args
			expect(service.getInventEditionBOM).toHaveBeenNthCalledWith(1, 'SKU1', 'IE1')
			expect(service.getInventEditionBOM).toHaveBeenNthCalledWith(2, 'SKU2', 'IE2')

			// applyMessages invoked with mapped records
			expect(service.applyMessages).toHaveBeenCalledTimes(1)
			const [table, processed, act] = service.applyMessages.mock.calls[0]
			expect(table).toBe('inventeditionbom-pim')
			expect(act).toBe('insert')
			expect(Array.isArray(processed)).toBe(true)
			expect(processed).toEqual([
				{ recid: '1', inventeditionid: 'IE1', sku: 'SKU1', bom: [ { inventeditionid: 'IE1', sku: 'SKU1', qty: 2 }, { inventeditionid: 'IE1', sku: 'SKU1', qty: 3 } ] },
				{ recid: '2', inventeditionid: 'IE2', sku: 'SKU2', bom: [ { inventeditionid: 'IE2', sku: 'SKU2', qty: 5 } ] }
			])

			// Published to topic for each processed record
			expect(service.broker.sendToChannel).toHaveBeenCalledWith('inventeditionbom-pim-topic', processed[0], { key: '1' })
			expect(service.broker.sendToChannel).toHaveBeenCalledWith('inventeditionbom-pim-topic', processed[1], { key: '2' })
		})
	})

	describe('channel: inventedition-topic', () => {
		it('publishes to KV when maintype is 7 or 8', async () => {
			const handler = ServiceSchema.channels['inventedition-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()

			await handler.call(service, { channelName: 'inventedition-topic', params: { recid: '42', maintype: 7 } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:inventedition`, key: '42', value: { recid: '42', maintype: 7 } }
			)

			await handler.call(service, { channelName: 'inventedition-topic', params: { recid: '43', maintype: 8 } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:inventedition`, key: '43', value: { recid: '43', maintype: 8 } }
			)
		})

		it('skips KV publish when maintype is not 7/8', async () => {
			const handler = ServiceSchema.channels['inventedition-topic'].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: 'inventedition-topic', params: { recid: '55', maintype: 6 } })
			expect(callSpy).not.toHaveBeenCalled()
		})
	})
})


