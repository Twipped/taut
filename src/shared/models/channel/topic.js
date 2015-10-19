
var redis = require('../../io/redis');

function key (channel) {
	return 'channel:' + channel + ':topic';
}

exports.get = function (channel, hashkey) {
	if (hashkey) {
		return redis.hget(key(channel), hashkey);
	}

	return redis.hgetall(key());
};

exports.set = function (channel, hashkey, value) {
	if (typeof hashkey === 'object') {
		return redis.hmset(key(channel), hashkey);
	}

	return redis.hset(key(channel), hashkey, value);
};
