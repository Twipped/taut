
var debug = require('../../debug')('models:channel:connections');
var redis = require('../../io/redis');

function key () {
	return 'connections:expected';
}

exports.get = function () {
	return redis.smembers(key()).then(function (results) {return results.filter(Boolean);});
};

exports.add = function (userid) {
	debug('adding', userid);
	return redis.sadd(key(), userid);
};

exports.remove = function (userid) {
	debug('removing', userid);
	return redis.srem(key(), userid);
};

exports.clear = function () {
	return redis.del(key());
};
