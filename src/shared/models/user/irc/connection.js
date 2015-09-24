
// var Promise = require('bluebird');
var config = require('../../../config');
var redis = require('../../../io/redis');
var debug = require('../../../debug')('models:user:irc:connection');

function key (userid) {
	return 'user:' + userid + ':irc:connection';
}

exports.get = function (userid) {
	return redis.get(key(userid));
};

exports.set = function (userid, connid) {
	var expire = config.tarmac.heartbeat + 5 || 35;

	debug('setting', userid, connid);
	return redis.set(key(userid), connid, 'EX', expire);
};

exports.clear = function (userid) {
	return redis.del(key(userid));
};
