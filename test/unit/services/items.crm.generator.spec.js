'use strict'

process.env.ITEMS_FLAT_TABLE_NAME = 'items-flat'
process.env.CRM_ITEMS_TABLE_NAME = 'crm-items'
process.env.REDIS_ITEMS_GENERATOR_RECORDS_COUNT = '100'

const ServiceSchema = require('../../../services/items.crm.generator.service')

describe('items.crm.generator service (unit)', () => {
	let service

	beforeEach(() => {
		service = {
			name: 'items.crm.generator',
			settings: {
				nativeTableName: process.env.ITEMS_FLAT_TABLE_NAME,
				crmTableName: process.env.CRM_ITEMS_TABLE_NAME,
				db: null
			},
			logger: {info: jest.fn(), error: jest.fn()},
			broker: {sendToChannel: jest.fn(), call: jest.fn()},
			crmMapper: function(nativeRecord) { return ServiceSchema.methods.crmMapper.call(this, nativeRecord) }
		}
		jest.clearAllMocks()
	})

	describe('action: generatorProcess', () => {
		it('aggregates by recid and sends mapped CRM item record', async () => {
			const nativeRecord = {
				recid: 101,
				itemid: 'IT-1',
				inventcontentgroupcode: 'G1',
				inventcontentid: 'OLD-1',
				inventcontentcode: 'C-1',
				maintype: 7,
				inventcontentnamealias: 'Item Name',
				isbn: 'ISBN-123',
				inventtitleyearid: 2024,
				subjectid: 'SUB',
				edulevelid: 'EDU',
				classageid: 'AGE',
				serieslineumknamealias: 555,
				literaturetypeid: 'LIT',
				authors: ['A1','A2'],
				houseid: 'PH',
				listid: 'SEQ',
				series: 9,
				brandid: 'BR',
				inventlanguage: 'EN',
				plumetextbookid: 333,
				numberparts: 3,
				activityid: '',
				regproject: 1
			}

			let capturedPipeline
			const cursor = (() => {
				let idx = 0
				const items = [nativeRecord]
				return {
					hasNext: async () => idx < items.length,
					next: async () => items[idx++],
					close: async () => {}
				}
			})()

			service.settings.db = {
				collection: () => ({
					aggregate: jest.fn((pipeline) => { capturedPipeline = pipeline; return cursor })
				})
			}

			await ServiceSchema.actions.generatorProcess.handler.call(service, {
				action: {name: 'items.crm.generator.generatorProcess'},
				params: {keys: ['101']}
			})

			expect(Array.isArray(capturedPipeline)).toBe(true)
			expect(capturedPipeline[0]).toHaveProperty('$match')
			expect(capturedPipeline[0].$match.recid.$in).toEqual([101])
			expect(capturedPipeline[1]).toMatchObject({ $project: { created_at: 0, updated_at: 0, _id: 0 } })

			const sentCrm = service.broker.sendToChannel.mock.calls.find(c => c[0] === `${process.env.CRM_ITEMS_TABLE_NAME}-topic`)
			expect(sentCrm).toBeTruthy()
			const payload = sentCrm[1]
			expect(payload).toMatchObject({
				recid: 'IT-1',
				group_code: 'G1',
				old_content_code: 'OLD-1',
				content_code: 'C-1',
				item_code: 'IT-1',
				main_type_code: '7',
				name: 'Item Name',
				isbn: 'ISBN-123',
				title_year: '2024',
				subject_code: 'SUB',
				educ_level_code: 'EDU',
				class_age_code: 'AGE',
				series_line_umk_code: '555',
				liter_type_code: 'LIT',
				authors: ['A1','A2'],
				publish_house_code: 'PH',
				sequence_num: 'SEQ',
				system: '9',
				brand_code: 'BR',
				language_code: 'EN',
				trail_textbook_code: '333',
				part_num: 3,
				activity_id: '',
				is_reg_project: true
			})
			expect(sentCrm[2]).toEqual({ key: 'IT-1' })
		})
	})

	describe('method: crmMapper', () => {
		it('maps fields and coerces types/fallbacks', () => {
			const rec = {
				itemid: 'IT-2',
				inventcontentgroupcode: 'G2',
				inventcontentid: 'OLD-2',
				inventcontentcode: 'C-2',
				maintype: 5,
				inventcontentnamealias: 'Name2',
				isbn: 'I2',
				inventtitleyearid: null,
				subjectid: 'S2',
				edulevelid: 'E2',
				classageid: 'A2',
				serieslineumknamealias: null,
				literaturetypeid: 'L2',
				authors: 'AU',
				houseid: 'H2',
				listid: 'SEQ2',
				series: null,
				brandid: 'B2',
				inventlanguage: 'RU',
				plumetextbookid: undefined,
				numberparts: undefined,
				activityid: undefined,
				regproject: 0
			}

			const mapped = service.crmMapper(rec)
			expect(mapped).toEqual({
				recid: 'IT-2',
				group_code: 'G2',
				old_content_code: 'OLD-2',
				content_code: 'C-2',
				item_code: 'IT-2',
				main_type_code: '5',
				name: 'Name2',
				isbn: 'I2',
				title_year: '',
				subject_code: 'S2',
				educ_level_code: 'E2',
				class_age_code: 'A2',
				series_line_umk_code: '',
				liter_type_code: 'L2',
				authors: 'AU',
				publish_house_code: 'H2',
				sequence_num: 'SEQ2',
				system: '',
				brand_code: 'B2',
				language_code: 'RU',
				trail_textbook_code: '',
				part_num: 0,
				activity_id: '',
				is_reg_project: false
			})
		})
	})

	describe('channels', () => {
		it('native topic puts key to bucket', async () => {
			const topicName = `${process.env.ITEMS_FLAT_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			await handler.call(service, { channelName: topicName, params: { recid: '42' } })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKey`,
				{ bucket: `${service.name}`, key: '42' }
			)
		})

		it('crm topic puts key/value to insert bucket', async () => {
			const topicName = `${process.env.CRM_ITEMS_TABLE_NAME}-topic`
			const handler = ServiceSchema.channels[topicName].handler
			const callSpy = jest.spyOn(service.broker, 'call').mockResolvedValue()
			const record = { recid: '7', foo: 'bar' }
			await handler.call(service, { channelName: topicName, params: record })
			expect(callSpy).toHaveBeenCalledWith(
				`${service.name}.putKeyValue`,
				{ bucket: `${service.name}:${process.env.CRM_ITEMS_TABLE_NAME}:insert`, key: '7', value: record }
			)
		})
	})
})


