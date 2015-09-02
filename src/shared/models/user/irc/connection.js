
// var Promise = require('bluebird');
var config = require('finn.shared/config');
var redis = require('finn.shared/io/redis');

exports.get = function (userid) {
	var key = 'user:' + userid + ':irc:connection';

	return redis.get(key);
};

exports.set = function (userid, connid) {
	var key = 'user:' + userid + ':irc:connection';
	var expire = config.conman.heartbeat;

	return redis.set(key, connid, expire);
};
