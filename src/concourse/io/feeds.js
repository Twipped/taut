var debug           = require('taut.shared/debug')('io:feeds');
var each            = require('lodash/collection/each');
var channelTracking = require('../controllers/channel-tracking');
var channelCache    = require('../controllers/rolling-cache');

module.exports = function (io) {

	io.onDirective('feed.subscribe', function (socket, feed, timestamp) {
		// if this socket is already subbed to that feed, ignore the request
		if (socket.subscribedFeeds[feed]) return;
		socket.subscribedFeeds[feed] = true;

		debug('feed.subscribe', feed, socket.id);
		socket.join(feed.toLowerCase());

		if (feed.substr(0, 12) === 'irc:channel:') {
			var channel = feed.substr(12);

			channelTracking.addSubscriber(channel);
			channelCache.get(channel).forEach(function (event) {
				socket.emit(feed, event);
			});
		}
	});

	io.on('connection', function (socket) {
		socket.subscribedFeeds = {};

		socket.on('disconnect', function () {
			each(socket.subscribedFeeds, function (t, feed) {
				if (!t) return;

				if (feed.substr(0, 12) === 'irc:channel:') {
					channelTracking.removeSubscriber(feed.substr(12));
				}
			});
		});

	});

	channelTracking.on('_all', function (channel, event) {
		channel = channel.toLowerCase();
		io.to('irc:channel:' + channel).emit('irc:channel:' + channel, event);
	});

};
