
var Promise = require('bluebird');
var redis = require('../../io/redis');
var random = require('../../lib/random');
var Keepalive = require('./irc/keepalive');

function key (userid) {
	return 'user:' + userid + ':irc';
}

exports.get = function (userid, hashkey) {

	// if we're fetching the username then we need to confirm a username exists.
	// and create one if it does not exist.
	if (hashkey === 'username') {
		return redis.hget(key(userid), hashkey).then(function (result) {
			if (result) return result;

			result = random.username();
			return exports.set(userid, 'username', result).then(function () {
				return result;
			});
		});
	}

	if (hashkey) {
		return redis.hget(key(userid), hashkey);
	}

	return redis.hgetall(key(userid)).then(function (result) {
		// user doesn't exist, pass that on.
		if (!result) return result;

		// if the username is empty, we need to generate and save one before returning the user
		if (!result.username) {
			result.username = random.username();
			return exports.set(userid, 'username', result.username).then(function () {
				return result;
			});
		}

		return result;
	});
};

exports.set = function (userid, hashkey, value) {
	var p = Promise.resolve();

	if (typeof hashkey === 'object') {
		if (Array.isArray(hashkey)) {
			return Promise.reject(new TypeError('Cannot set a user/irc to an array'));
		}

		// if we're setting the keepalive flag, be sure to
		// define that in the keepalive collection.
		if (typeof hashkey.keepalive !== 'undefined') {
			p = Keepalive.set(userid, hashkey.keepalive);
		}

		return Promise.join(redis.hmset(key(userid), hashkey), p, function (a) {return a;});
	}

	// if we're setting the keepalive flag, be sure to
	// define that in the keepalive collection.
	if (hashkey === 'keepalive') {
		p = Keepalive.set(userid, value);
	}

	return Promise.join(redis.hset(key(userid), hashkey, value), p, function (a) {return a;});
};
