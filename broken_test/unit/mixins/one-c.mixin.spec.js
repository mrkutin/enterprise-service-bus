const {ServiceBroker} = require('moleculer')
const TestMixin = require('../../../mixins/one-c.mixin')
const axios = require('axios')

describe('Test \'one-c\' mixin', () => {
	const broker = new ServiceBroker({logger: false})
	const service = broker.createService(TestMixin)

	describe('Test \'one-c\' methods', () => {
		it('Test \'oneCUpload\' method', async () => {
			axios.post = jest.fn(() => {
				return {
					status: '200'
				}
			})

			await service.oneCUpload('someTable', {recid: '111'})

			expect(axios.post).toBeCalledTimes(1)

			expect(axios.post).toBeCalledWith(
				undefined,
				{'recid': '111'},
				{
					'headers': {
						'Authorization': 'Basic undefined',
						'keyMessage': '111',
						'topic': 'someTable-topic'
					}, 'withCredentials': true
				}
			)
		})
	})
})
