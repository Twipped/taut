
var Promise = require('bluebird');
var random = require('../lib/random');
var redis = require('../io/redis');

function key (userid) {
	return 'user:' + userid;
}


exports.get = function (userid, hashkey) {
	if (hashkey) {
		return redis.hget(key(userid), hashkey);
	}

	return redis.hgetall(key(userid));
};

exports.set = function (userid, hashkey, value) {
	if (typeof hashkey === 'object') {
		if (Array.isArray(hashkey)) {
			return Promise.reject(new TypeError('Cannot set a user to an array'));
		}
		return redis.hmset(key(userid), hashkey);
	}

	return redis.hset(key(userid), hashkey, value);
};

function ensureUniqueId (count) {
	count = Number(count) + 1;
	var userid = random(32);
	return exports.get(userid).then(function (user) {
		if (!user) {
			return userid;
		}

		// found a user with the random id. If we've done this 3 times, fail
		// otherwise try again.
		if (count > 3) {
			return Promise.reject(new Error('User#ensureUniqueId collided 3 times, something is very wrong.'));
		}

		return ensureUniqueId(count);
	});
}

exports.create = function (forcedID) {
	var promisedUserID;

	if (forcedID) {
		promisedUserID = exports.get(forcedID).then(function (u) {
			if (u) return Promise.reject(new Error(u + ' already exists.'));
			return forcedID;
		});
	} else {
		promisedUserID = ensureUniqueId();
	}

	return promisedUserID.then(function (userid) {
		var user = {
			userid: userid,
			date_created: new Date(),
			is_agent: false
		};

		return exports.set(userid, user);
	});
};
