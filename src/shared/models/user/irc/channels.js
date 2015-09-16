
var debug = require('../../../debug')('models:user:irc:channels');
var redis = require('../../../io/redis');

function key (userid) {
	return 'user:' + userid + ':irc:channels';
}

exports.get = function (userid) {
	return redis.smembers(key(userid));
};

exports.add = function (userid, channel) {
	debug('adding', userid, channel);
	return redis.sadd(key(userid), channel);
};

exports.remove = function (userid, channel) {
	debug('removing', userid, channel);
	return redis.srem(key(userid), channel);
};
