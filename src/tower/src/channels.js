
var debug    = require('finn.shared/debug')('channels');
var map      = require('lodash/collection/map');
var keys     = require('lodash/object/keys');
var channels = {};

exports.get = function (channel) {
	return channels[channel] && keys(channels[channel]) || false;
};

exports.add = function (channel, userid) {
	if (!channels[channel]) {
		channels[channel] = {};
	}

	if (!channels[channel][userid]) {
		debug('adding', channel, userid);
		channels[channel][userid] = true;
	}
};

exports.remove = function (channel, userid) {
	if (Array.isArray(userid)) {
		return userid.map(function (cid) {
			return exports.remove(channel, cid);
		});
	}

	if (channel === true) {
		return map(channels, function (chan, channelName) {
			if (chan[userid]) {
				debug('removing', channelName, userid);
				delete chan[userid];
				return channelName;
			}
		}).filter(Boolean);
	}

	if (arguments.length === 1) {
		if (Array.isArray(channel)) {
			return channel.forEach(function (c) {
				debug('deleting channel', c);
				delete channels[c];
			});
		}

		debug('deleting channel', channel);
		delete channels[channel];
		return;
	}

	if (channels[channel] && !channels[channel][userid]) {
		debug('removing', channel, userid);
		delete channels[channel][userid];
	}
};

exports.purge = function (channel) {
	if (channels[channel]) {
		delete channels[channel];
	}
};

exports.reset = function () {
	channels = {};
};

exports.getEmptyChannels = function () {
	return map(channels, function (channel, name) {
		var l = keys(channel).length;
		return !l && name;
	}).filter(Boolean);
};
