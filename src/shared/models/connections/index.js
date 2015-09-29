
var redis = require('../io/redis');

function key () {
	return 'connections';
}

exports.get = function (userid) {
	if (userid) {
		return redis.hget(key(), userid);
	}

	return redis.hgetall(key());
};

exports.set = function (userid, connid) {
	if (typeof userid === 'object') {
		return redis.hmset(key(), userid);
	}

	return redis.hset(key(), userid, connid);
};
