
var debug = require('../../debug')('models:channel:connections');
var redis = require('../../io/redis');

function key (channel) {
	return 'channel:' + channel + ':connections';
}

exports.get = function (channel) {
	return redis.smembers(key(channel));
};

exports.add = function (channel, connid) {
	debug('adding', channel, connid);
	return redis.sadd(key(channel), connid);
};

exports.remove = function (channel, connid) {
	debug('removing', channel, connid);
	return redis.srem(key(channel), connid);
};

exports.clear = function (connid) {
	return redis.del(key(connid));
};
