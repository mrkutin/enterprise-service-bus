const GeneratorMixin = require('../mixins/generator.mixin')
const StateMixin = require('../mixins/state.mixin')

const {
	REDIS_ITEMS_GENERATOR_RECORDS_COUNT,
	ITEMS_FLAT_TABLE_NAME,
	CRM_ITEMS_TABLE_NAME
} = process.env

module.exports = {
	name: 'items.crm.generator',

	mixins: [GeneratorMixin, StateMixin],

	settings: {
		nativeTableName: ITEMS_FLAT_TABLE_NAME,
		crmTableName: CRM_ITEMS_TABLE_NAME,
		recordsCount: REDIS_ITEMS_GENERATOR_RECORDS_COUNT
	},

	methods: {
		crmMapper(nativeRecord) {
			try {
				return {
					recid: nativeRecord.itemid,
					group_code: nativeRecord.inventcontentgroupcode,
					old_content_code: nativeRecord.inventcontentid,
					content_code: nativeRecord.inventcontentcode,
					item_code: nativeRecord.itemid,
					main_type_code: nativeRecord.maintype.toString(),
					name: nativeRecord.inventcontentnamealias,
					isbn: nativeRecord.isbn,
					title_year: nativeRecord.inventtitleyearid ? nativeRecord.inventtitleyearid.toString() : '',
					subject_code: nativeRecord.subjectid,
					educ_level_code: nativeRecord.edulevelid,
					class_age_code: nativeRecord.classageid,
					series_line_umk_code: nativeRecord.serieslineumknamealias ? nativeRecord.serieslineumknamealias.toString() : '',
					liter_type_code: nativeRecord.literaturetypeid,
					authors: nativeRecord.authors,
					publish_house_code: nativeRecord.houseid,
					sequence_num: nativeRecord.listid,
					system: nativeRecord.series ? nativeRecord.series.toString() : '',
					brand_code: nativeRecord.brandid,
					language_code: nativeRecord.inventlanguage,
					trail_textbook_code: nativeRecord.plumetextbookid ? nativeRecord.plumetextbookid.toString() : '',
					part_num: nativeRecord.numberparts ? nativeRecord.numberparts : 0,
					activity_id: nativeRecord.activityid || '',
					is_reg_project: Boolean(nativeRecord.regproject)
				}
			} catch (e) {
				this.logger.error(`CRM mapping error in record ${nativeRecord.recid}: `, e)
			}
		}
	},

	actions: {
		generatorProcess: {
			timeout: 5 * 60 * 1000,
			async handler(ctx) {
				this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
				const {keys} = ctx.params
				const cursor = this.settings.db.collection(this.settings.nativeTableName).aggregate([
					{
						$match: {
							recid: {
								$in: keys.map(key => parseInt(key))
							}
						}
					},
					{
						$project: {
							created_at: 0,
							updated_at: 0,
							_id: 0
						}
					}
				])

				while (await cursor.hasNext()) {
					const nativeRecord = await cursor.next()
					const crmRecord = this.crmMapper(nativeRecord)
					if (crmRecord) {
						await this.broker.sendToChannel(`${this.settings.crmTableName}-topic`, crmRecord, {key: `${crmRecord.recid}`})
					}
				}

				await cursor.close()
			}
		},
	},

	channels: {
		[`${ITEMS_FLAT_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKey`, {
					bucket: `${this.name}`,
					key: record.recid
				})
			}
		},
		[`${CRM_ITEMS_TABLE_NAME}-topic`]: {
			group: this.name,
			fromBeginning: true,
			handler(ctx) {
				const record = ctx.params
				this.logger.info(`Channel ${ctx.channelName}: ${JSON.stringify(ctx.params)}`)
				this.broker.call(`${this.name}.putKeyValue`, {
					bucket: `${this.name}:${CRM_ITEMS_TABLE_NAME}:insert`,
					key: record.recid,
					value: record
				})
			}
		}
	}
}
