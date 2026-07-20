const ChannelNameMiddleware = {
	name: 'ChannelNameMiddleware',

	// Wrap the channel handlers
	localChannel(next, chan) {
		return async (msg, raw) => {
			msg.channelName = chan.name
			await next(msg, raw)
		}
	}
}

module.exports = ChannelNameMiddleware
