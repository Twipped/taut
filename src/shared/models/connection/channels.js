
var debug = require('../../debug')('models:connection:channels');
var redis = require('../../io/redis');

var EXPIRES_AFTER = 60 * 60 * 24; //1 day

function key (connid) {
	return 'connection:' + connid + ':channels';
}

exports.get = function (connid) {
	return redis.smembers(key(connid));
};

exports.add = function (connid, channel) {
	debug('adding', connid, channel);
	return redis.multi()
		.sadd(key(connid), channel)
		.expire(key(connid), EXPIRES_AFTER)
		.exec();
};

exports.remove = function (connid, channel) {
	debug('removing', connid, channel);
	return redis.multi()
		.srem(key(connid), channel)
		.expire(key(connid), EXPIRES_AFTER)
		.exec();
};

exports.clear = function (connid) {
	return redis.del(key(connid));
};
