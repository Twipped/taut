
// var Promise = require('bluebird');
var config = require('../../config');
var redis  = require('../../io/redis');
var debug  = require('../../debug')('models:connection');

function key (userid) {
	return 'user:' + userid + ':is-viewing';
}

exports.get = function (userid) {
	return redis.get(key(userid)).then(Boolean);
};

exports.set = function (userid) {
	var expire = config.concourse.visitorExpire || 35;

	debug('setting', userid);
	return redis.set(key(userid), true, 'EX', expire);
};

exports.clear = function (userid) {
	return redis.del(key(userid));
};
