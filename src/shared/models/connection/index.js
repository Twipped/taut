
// var Promise = require('bluebird');
var config = require('../../config');
var redis = require('../../io/redis');
var debug = require('../../debug')('models:system:irc:connection');

function key (connid) {
	return 'connection:' + connid;
}

exports.get = function (connid) {
	return redis.get(key(connid));
};

exports.set = function (connid, userid) {
	var expire = config.tarmac.heartbeat + 5 || 35;

	debug('setting', connid, userid);
	return redis.set(key(connid), userid, 'EX', expire);
};

exports.clear = function (connid) {
	return redis.del(key(connid));
};
