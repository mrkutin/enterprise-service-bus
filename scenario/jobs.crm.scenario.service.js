

module.exports = {
	name: 'jobs.crm.scenario',

	methods: {
		async process(){
			await this.broker.waitForServices([this.name, 'api'])

			await this.broker.call('jobs.crm.jobs', {
				body: [
					{
						"recid": "d7bbbbb6-c510-45fb-96f7-120770641d56",
						"code": 1,
						"created_date": "/Date(1667230142000)/",
						"is_deleted": false,
						"modified_date": "/Date(1667230142000)/",
						"name": "test1"
					}
				]
			})
		}
	},

	async started() {
		this.process()
	},
}
