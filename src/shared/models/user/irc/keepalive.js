
var redis = require('../../io/redis');

function key () {
	return 'users:keepalive';
}

exports.get = function (userid) {
	if (userid) {
		return redis.sismember(key(), userid);
	}
	return redis.smembers(key());
};

exports.set = function (userid, enable) {
	if (enable) {
		return redis.sadd(key(), userid);
	}

	return redis.srem(key(), userid);
};
