
var debug           = require('finn.shared/debug')('io');
var each            = require('lodash/collection/each');
var channelTracking = require('../controllers/channel-tracking');
var channelCache    = require('../controllers/rolling-cache');

var socketio = require('socket.io');

var io = socketio();

io.on('connection', function (socket) {
	debug('socket connection', socket.id);
	var subscribed = {};

	socket.on('feed.subscribe', function (feed) {
		//if this socket is already subbed to that feed, ignore the request
		if (subscribed[feed]) return;
		subscribed[feed] = true;

		debug('feed.subscribe', feed, socket.id);
		socket.join(feed);

		if (feed.substr(0, 12) === 'irc:channel:') {
			var channel = feed.substr(12);

			channelTracking.addSubscriber(channel);
			channelCache.get(channel).forEach(function (event) {
				socket.emit(feed, event);
			});
		}

	});

	socket.on('disconnect', function () {
		debug('socket disconnected', socket.id);

		each(subscribed, function (t, feed) {
			if (!t) return;

			if (feed.substr(0, 12) === 'irc:channel:') {
				channelTracking.removeSubscriber(feed.substr(12));
			}
		});
	});

});

channelTracking.on('_all', function (channel, event) {
	io.to('irc:channel:' + channel).emit('channel event', event);
});

module.exports = io;
