
var redis = require('finn.shared/io/redis');

function key (userid) {
	return 'user:' + userid + ':irc:channels';
}

exports.get = function (userid) {
	return redis.smembers(key(userid));
};

exports.add = function (userid, channel) {
	return redis.sadd(key(userid), channel);
};

exports.remove = function (userid, channel) {
	return redis.srem(key(userid), channel);
};
