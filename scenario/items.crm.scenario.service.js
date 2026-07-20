module.exports = {
	name: 'items.crm.scenario',

	methods: {
		async process() {
			await this.broker.waitForServices([this.name])

			await this.broker.sendToChannel('itemsflat-topic', {
				eventrecid: Math.floor(Math.random() * 10000000000),
				recid: 5638460181,
				itemid: "NM0183380",
				description: "Медиаграмотность и медиабезопасность. 5-6 классы. Учебник",
				namealias: "Медиаграмотность и медиабезопасность. 5-6 классы. Учебник",
				unitid: "шт",
				unitcode: 796,
				taxitemgroupid: "10_МПЗ",
				itemtype: 0,
				itemtypename: "Номенклатура",
				budgetarticleid: "",
				categoryname: "",
				typeid: 320,
				typename: "Межпредметный (bin)",
				maintype: 1,
				maintypestr: "Печатное издание",
				inventcontentgroupid: "320-0140",
				inventcontentgroupcode: "320-0140",
				inventcontentid: "320-0140-01",
				inventcontentcode: "320-0140-01",
				inventtitleyearid: 2026,
				inventcontentnamealias: "Медиаграмотность и медиабезопасность. 5-6 классы. Учебник",
				inventeditionid: "ИЗД0217371",
				inventeditioncode: "320-0140-01-2026",
				isbn: "978-5-09-128290-0",
				authors: "Милкус А.Б.",
				brandid: "Просвещение",
				taxvalue: 10,
				inventcontentannotation: "",
				subjectid: "Межпредметный",
				subjectdescription: "Межпредметный",
				classageid: "5-6 кл.",
				classagetype: 0,
				classagetypestr: "Класс",
				literaturetypeid: "Учебники",
				contentannotationnote: "Учебник «Медиаграмотность и  медиабезопасность» для 5—6 классов  — это курс внеурочной деятельности,целькоторого —формированиеобъективного,патриотическогомировоззренияроссийских школьников. В  учебник учащимся даётся представление о  том, как развивается мир современных коммуникаций, какие риски возникают в  связи с  нарастающей информационной волной,развитиемнейросетейи массовымраспространениемфейкови дипфейков.Курспризван сформироватькритическоемышлениепоотношениюк разногородаманипуляционныммедийным инструментам, выработать навыки безопасной работы в  социальных сетях, на других цифровых платформах",
				cfrid: 200008,
				regproject: 0,
				itemarticlescode: "",
				plumetextbookid: "Учебник",
				edulevelid: "5-9 классы",
				inventlanguage: "русский",
				houseid: "АО \"Издательство \"Просвещение\"",
				listid: "2.1.2.4.2.5.1.",
				activityid: "Основная деятельность",
				numberparts: 0,
				series: "",
				serieslineumknamealias: "",
				inventeditiontypename: ""
			}, {key: "5638460181"})
		}
	},

	async started() {
		this.process()
	},
}
