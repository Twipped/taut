
var redis = require('../../io/redis');
var indexBy = require('lodash/collection/indexBy');
var mapValues = require('lodash/object/mapValues');

function key (channel) {
	return 'channel:' + channel + ':names';
}

exports.get = function (channel, hashkey) {
	if (hashkey) {
		return redis.hget(key(channel), hashkey).then(JSON.parse);
	}

	return redis.hgetall(key()).then(function (names) {
		return mapValues(names, JSON.parse);
	});
};

exports.set = function (channel, hashkey, value) {
	if (typeof hashkey === 'object') {
		if (Array.isArray(hashkey)) {
			hashkey = indexBy(hashkey, 'nick');
			hashkey = mapValues(hashkey, JSON.stringify);
		}
		return redis.hmset(key(channel), hashkey);
	}

	return redis.hset(key(channel), hashkey, value);
};

exports.add = exports.change = function (channel, nickname, value) {
	return exports.set(channel, nickname, value);
};

exports.remove = function (channel, nickname) {
	return redis.hdel(key(channel), nickname);
};
