
var redis = require('../../io/redis');
var mapValues = require('lodash/object/mapValues');
var indexBy = require('lodash/collection/indexBy');
var debug = require('../../debug')('modes');

function key (channel) {
	return 'channel:' + channel.toLowerCase() + ':modes';
}

exports.get = function (channel, hashkey) {
	if (hashkey) {
		return redis.hget(key(channel), hashkey);
	}

	return redis.hgetall(key());
};

exports.set = function (channel, hashkey, value) {
	if (typeof hashkey === 'object') {
		if (Array.isArray(hashkey)) {
			hashkey = hashkey.filter(function (m) {return m.mode !== 'b';}); // ignore bans
			hashkey = indexBy(hashkey, 'mode');
			hashkey = mapValues(hashkey, function (m) {return m.delta && m.target || m.delta;});
		}
		debug('setting', channel, hashkey);
		return redis.hmset(key(channel), hashkey);
	}

	debug('setting', channel, hashkey, value);
	return redis.hset(key(channel), hashkey, value);
};
