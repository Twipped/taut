
var each       = require('lodash/collection/each');
var debug      = require('taut.shared/debug')('channel-tracking');
var pubsub     = require('taut.shared/io/pubsub');
var irchistory = require('taut.shared/models/system/irc/history');
var cache      = require('./rolling-cache');
var Emitter    = require('events').EventEmitter;

var EXPIRE_TRACKING_AFTER = 5 * 60000;

module.exports = exports = new Emitter();


var subscriberCounts = {};

exports.on('removeListener', function (channel) {
	if (channel === '_all') return;
	exports.removeSubscriber(channel);
});

exports.on('newListener', function (channel) {
	if (channel === '_all') return;
	exports.addSubscriber(channel);
});

exports.removeSubscriber = function (channel) {
	channel = channel.toLowerCase();
	// if subscriber count for that channel is already 0 or undefined
	// then there is no need to timeout the tracking
	if (!subscriberCounts[channel]) return;

	debug('remove subscriber', channel);
	subscriberCounts[channel]--;

	exports.cycleExpireTimer(channel);
};

exports.addSubscriber = function (channel) {
	channel = channel.toLowerCase();
	debug('add subscriber', channel);
	exports.startTracking(channel);

	// subscriberCounts[channel] might be undefined, so we can't just ++
	subscriberCounts[channel] = (subscriberCounts[channel] || 0) + 1;

	exports.cycleExpireTimer(channel);
};

/** *****************************************************************************************************************/

var trackingTimeouts = {};

exports.cycleExpireTimer = function (channel) {
	channel = channel.toLowerCase();
	if (trackingTimeouts[channel]) {
		debug('stopping expiration timer', channel);
		clearTimeout(trackingTimeouts[channel]);
		trackingTimeouts[channel] = undefined;
	}

	// if there are still subscribers, no need to start the timer
	if (subscriberCounts[channel]) return;

	debug('starting expiration timer', channel);
	trackingTimeouts[channel] = setTimeout(function () {
		if (subscriberCounts[channel]) return;
		exports.stopTracking(channel);
	}, EXPIRE_TRACKING_AFTER);
};


/** *****************************************************************************************************************/


var trackingCallbacks = {};

exports.startTracking = function (channel) {
	channel = channel.toLowerCase();
	if (trackingCallbacks[channel]) return true;

	var cb = trackingCallbacks[channel] = function (event, data) {
		cache.push(data);
		exports.emit(data.target, data);
		exports.emit('_all', data.target, data);
		// debug('tracked event', data.target);
	};

	pubsub.channel('irc:public:' + channel + ':receive').on('_all', cb);
	debug('tracking started', channel);
};

exports.stopTracking = function (channel) {
	channel = channel.toLowerCase();
	if (!trackingCallbacks[channel]) return;

	pubsub.channel('irc:public:' + channel + ':receive').removeListener('_all', trackingCallbacks[channel]);
	delete trackingCallbacks[channel];
	debug('tracking stopped', channel);
};


/** *****************************************************************************************************************/


exports.pageRequest = function (channel) {
	channel = channel.toLowerCase();
	if (!exports.startTracking(channel)) {
		exports.cycleExpireTimer(channel);
	}

	return irchistory.fetchPublic(channel).then(function (events) {
		cache.push(events);
		return events;
	});
};


/** *****************************************************************************************************************/


process.on('graceful stop', function () {
	each(trackingCallbacks, function (cb, channel) {
		// nuke subscriber counts so the expire timer doesn't reset.
		subscriberCounts[channel] = 0;

		exports.stopTracking(channel);
	});

	exports.removeAllListeners();

	// clear any lingering timers
	each(trackingTimeouts, function (timer) {
		if (timer) clearTimeout(timer);
	});
});
