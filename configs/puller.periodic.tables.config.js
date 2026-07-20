module.exports = [
	{
		'pull_procedure': 'PSV_SP_InventSeriesLineUMKLine_DirectSQL',
		'table_name': 'InventSeriesLineUMKLine',
		'ax_consumer_id': 0,
		'cleanup': true
	},
	{
		'pull_procedure': 'PSV_SP_InventClassAgeLine_DirectSQL',
		'table_name': 'InventClassAgeLine',
		'ax_consumer_id': 0,
		'cleanup': true
	}
]
