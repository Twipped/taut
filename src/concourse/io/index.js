
var debug           = require('finn.shared/debug')('io');
var each            = require('lodash/collection/each');
var channelTracking = require('../controllers/channel-tracking');
var channelCache    = require('../controllers/rolling-cache');

var socketio = require('socket.io');

var io = socketio();

io.on('connection', function (socket) {
	debug('socket connection', socket.id);
	var subscribed = {};

	socket.on('subscribe to channel', function (channel) {
		if (subscribed[channel]) return;
		subscribed[channel] = true;

		channelTracking.addSubscriber(channel);

		socket.join('irc:channel:' + channel);

		socket.emit('channel events', channelCache.get(channel));
	});

	socket.on('disconnect', function (socket) {
		debug('socket disconnected', socket.id);

		each(subscribed, function (channel) {
			channelTracking.removeSubscriber(channel);
		});
	});

});

channelTracking.on('_all', function (channel, event) {
	io.to('irc:channel:' + channel).emit('channel event', event);
});

module.exports = io;
