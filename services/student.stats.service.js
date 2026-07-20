const StateMixin = require('../mixins/state.mixin')

const {
	STUDENT_STATS_TABLE_NAME
} = process.env

module.exports = {
	name: 'student.stats',

	settings: {
		rest: '/v5',
		tableName: STUDENT_STATS_TABLE_NAME
	},

	mixins: [StateMixin],

	actions: {
		taskStats: {
			rest: 'GET /m3activity-student-task-stats',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				query: {
					$$type: 'object',
					page: {type: 'string', optional: true},
					perPage: {type: 'string', optional: true},
					userId: {type: 'string', optional: false},
					nomenclature: {type: 'string', optional: true}
				}
			},
			async handler(ctx) {
				try {
					this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
					const { query: { userId, nomenclature, page, perPage } } = ctx.params
					const limit = parseInt(perPage) || 10
					const matchFilters = {}
					if (nomenclature) {
						matchFilters['data.request.payload.statement.object.definition.extensions.nomenclature'] = {
							$in: nomenclature.split(',')
						}
					}
					if (userId) {
						matchFilters['data.request.payload.statement.object.definition.extensions.userId'] = userId
					}
					const result = (await this.settings.db.collection(this.settings.tableName).aggregate([
						{
							$match: matchFilters
						},
						{
							$project: {
								'_id': 0,
								'userId': '$data.request.payload.statement.object.definition.extensions.userId',
								'nomenclature': '$data.request.payload.statement.object.definition.extensions.nomenclature',
								'taskId': '$data.request.payload.statement.object.id',
								'date': '$data.request.payload.statement.timestamp',
								'result': '$data.request.payload.statement.result'
							}
						},
						{
							$group: {
								_id: {
									userId: '$userId',
									nomenclature: '$nomenclature',
								},
								results: {
									$addToSet: {
										taskId: '$$ROOT.taskId',
										date: '$$ROOT.date',
										result: '$$ROOT.result'
									}
								}
							}
						},
						{
							$skip: (page || 0) * limit
						},
						{
							$limit: limit
						}
					]).toArray()).map(res => ({userId: res._id.userId, nomenclature: res._id.nomenclature, results: res.results}))

					return result
				} catch (e) {
					ctx.meta.$statusCode = 500
					return e.message
				}
			}
		},
		completedTaskDayStats: {
			rest: 'GET /m3activity-student-completed-task-day-stats',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				query: {
					$$type: 'object',
					page: {type: 'string', optional: true},
					perPage: {type: 'string', optional: true},
					userId: {type: 'string', optional: false},
					nomenclature: {type: 'string', optional: true},
					startDate: {type: 'string', optional: false},
					endDate: {type: 'string', optional: false}
				}
			},
			async handler(ctx) {
				try {
					this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
					const { query: { userId, nomenclature, startDate, endDate, page, perPage } } = ctx.params
					const limit = parseInt(perPage) || 10
					const matchFilters = {
						'data.request.payload.statement.object.definition.extensions.userId': userId,
						'data.request.payload.statement.result.extensions.state': 'SUCCESS',
						'data.request.payload.statement.timestamp': { $gte: startDate, $lt: endDate }
					}
					if (nomenclature) {
						matchFilters['data.request.payload.statement.object.definition.extensions.nomenclature'] = nomenclature
					}
					const result = (await this.settings.db.collection(this.settings.tableName).aggregate([
						{
							$match: matchFilters
						},
						{
							$project: {
								'_id': 0,
								'date': '$data.request.payload.statement.timestamp'
							}
						},
						{
							$group: {
								_id: {
									$substr : ['$date', 0, 10],
								},
								count: {
									$sum: 1
								}
							}
						},
						{
							$sort: {
								_id: 1
							}
						},
						{
							$skip: (page || 0) * limit
						},
						{
							$limit: limit
						}
					]).toArray()).map(res => ({[`${res._id}`]: res.count}))

					return result
				} catch (e) {
					ctx.meta.$statusCode = 500
					return e.message
				}
			}
		},
		averageExerciseScoreStats: {
			rest: 'GET /m3activity-student-average-exercise-score-stats',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				query: {
					$$type: 'object',
					userId: {type: 'string', optional: true},
					nomenclature: {type: 'string', optional: false},
					targetDate: {type: 'string', optional: false}
				}
			},
			async handler(ctx) {
				try {
					this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
					const { query: { userId, nomenclature, targetDate } } = ctx.params
					const matchFilters = {
						'data.request.payload.statement.object.definition.extensions.nomenclature': nomenclature,
						'data.request.payload.statement.timestamp': {
							$lte: targetDate
						},
						'data.request.payload.statement.object.definition.name.ru-RU': { $regex: /^(exercise|with_clue|without_clue)/ },
						'data.request.payload.statement.result.extensions.state': 'SUCCESS'
					}
					if (userId) {
						matchFilters['data.request.payload.statement.object.definition.extensions.userId'] = userId
					}
					const result = (await this.settings.db.collection(this.settings.tableName).aggregate([
						{
							$match: matchFilters
						},
						{
							$addFields: {
								timestampDate: { $toDate: "$data.request.payload.statement.timestamp" },
								startDate: { $toDate: "2024-09-01T00:00:00.000Z" },
								targetDate: { $toDate: targetDate }
							}
						},
						{
							$addFields: {
								relativeMonth: {
									$add: [
										{ $subtract: [{ $month: "$timestampDate" }, 9] },
										{ $multiply: [{ $subtract: [{ $year: "$timestampDate" }, 2024] }, 12] },
										1
									]
								},
								relativeWeek: {
									$add: [
										{
											$floor: {
												$divide: [
													{ $subtract: ["$timestampDate", { $subtract: ["$startDate", 1000 * 60 * 60 * 24 * 6] }] },
													1000 * 60 * 60 * 24 * 7
												]
											}
										},
										1
									]
								},
								targetWeekNumber: {
									$add: [
										{
											$floor: {
												$divide: [
													{ $subtract: ["$targetDate", { $subtract: ["$startDate", 1000 * 60 * 60 * 24 * 6] }] },
													1000 * 60 * 60 * 24 * 7
												]
											}
										},
										1
									]
								},
								targetMonthNumber: {
									$add: [
										{ $subtract: [{ $month: "$targetDate" }, 9] },
										{ $multiply: [{ $subtract: [{ $year: "$targetDate" }, 2024] }, 12] },
										1
									]
								}
							}
						},
						{
							$group: {
								_id: {
									startDate: '$startDate',
									targetDate: '$targetDate'
								},
								cumulativeData: {
									$push: {
										month: "$relativeMonth",
										week: "$relativeWeek",
										balls: "$data.request.payload.statement.result.extensions.balls"
									}
								},
								maxWeekNumber: { $max: "$targetWeekNumber" },
								maxMonthNumber: { $max: "$targetMonthNumber" }
							}
						},
						{
							$project: {
								_id: 0,
								byMonth: {
									$map: {
										input: { $range: [1, { $add: [1, "$maxMonthNumber"] }] },
										as: "month",
										in: {
											k: { $toString: "$$month" },
											v: {
												$avg: {
													$map: {
														input: { $filter: { input: "$cumulativeData", cond: { $lte: ["$$this.month", "$$month"] } } },
														as: "item",
														in: "$$item.balls"
													}
												}
											}
										}
									}
								},
								byWeek: {
									$map: {
										input: { $range: [1, { $add: [1, "$maxWeekNumber"] }] },
										as: "week",
										in: {
											k: { $toString: "$$week" },
											v: {
												$cond: [
													{ $eq: ["$$week", { $add: [1, "$maxWeekNumber"] }] },
													0,
													{
														$avg: {
															$map: {
																input: { $filter: { input: "$cumulativeData", cond: { $lte: ["$$this.week", "$$week"] } } },
																as: "item",
																in: "$$item.balls"
															}
														}
													}
												]
											}
										}
									}
								}
							}
						},
						{
							$project: {
								byMonth: { $arrayToObject: "$byMonth" },
								byWeek: { $arrayToObject: "$byWeek" }
							}
						}
					]).toArray())[0]

					return result ?
						Object.keys(result).reduce((acc, sortName) => {
							acc[sortName] = result[sortName]
							Object.keys(result[sortName]).forEach(count => {
								acc[sortName][count] = Math.round(result[sortName][count])
							})
							return acc
						}, {})
						:
						{
							byMonth: {},
							byWeek: {}
						}
				} catch (e) {
					ctx.meta.$statusCode = 500
					return e.message
				}
			}
		},
		ratingStats: {
			rest: 'GET /m3activity-student-rating-stats',
			openapi: {
				security: [{bearerAuth: []}]
			},
			params: {
				query: {
					$$type: 'object',
					userId: {type: 'string', optional: false},
					nomenclature: {type: 'string', optional: false}
				}
			},
			async handler(ctx) {
				try {
					this.logger.info(`Action ${ctx.action.name} input: ${JSON.stringify(ctx.params)}`)
					const { query: { userId, nomenclature } } = ctx.params
					const result = (await this.settings.db.collection(this.settings.tableName).aggregate([
						{
							$match: {
								"data.request.payload.statement.object.definition.extensions.nomenclature": nomenclature,
								'data.request.payload.statement.result.extensions.state': 'SUCCESS',
								'data.request.payload.statement.object.definition.name.ru-RU': { $regex: /^(exercise|with_clue|without_clue)/ }
							}
						},
						{
							$group: {
								_id: "$data.request.payload.statement.object.definition.extensions.userId",
								avgScore: { $avg: "$data.request.payload.statement.result.extensions.balls" }
							}
						},
						{
							$group: {
								_id: null,
								students: { $push: { userId: "$_id", avgScore: "$avgScore" } }
							}
						},
						{
							$set: {
								students: { $sortArray: { input: "$students", sortBy: { avgScore: -1 } } }
							}
						},
						{
							$set: {
								studentRank: {
									$add: [
										{
											$indexOfArray: [
												"$students.userId",
												userId
											]
										},
										1
									]
								},
								totalStudents: { $size: "$students" }
							}
						},
						{
							$project: {
								_id: 0,
								totalStudents: 1,
								studentRank: "$studentRank"
							}
						}
					]).toArray())[0]

					return result || {
						totalStudents: 0,
						studentRank: 0
					}
				} catch (e) {
					ctx.meta.$statusCode = 500
					return e.message
				}
			}
		}
	}
}
