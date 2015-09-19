
// var Promise = require('bluebird');
var config = require('../../../config');
var redis = require('../../../io/redis');
var debug = require('../../../debug')('models:user:irc:connection');

exports.get = function (userid) {
	var key = 'user:' + userid + ':irc:connection';

	return redis.get(key);
};

exports.set = function (userid, connid) {
	var key = 'user:' + userid + ':irc:connection';
	var expire = config.tarmac.heartbeat + 5 || 35;

	debug('setting', key, connid);
	return redis.set(key, connid, 'EX', expire);
};
