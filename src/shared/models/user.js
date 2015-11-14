
var Promise = require('bluebird');
var random = require('../lib/random');
var redis = require('../io/redis');

var UserIsAgent = require('./user/is-agent');

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
	var p = Promise.resolve();

	if (typeof hashkey === 'object') {
		if (Array.isArray(hashkey)) {
			return Promise.reject(new TypeError('Cannot set a user to an array'));
		}

		// if we're setting the is_agent flag, be sure to
		// define that in the is_agent collection.
		if (typeof hashkey.is_agent !== 'undefined') {
			p = UserIsAgent.set(userid, hashkey.is_agent);
		}

		return Promise.join(redis.hmset(key(userid), hashkey), p, function (a) {return a;});
	}

	// if we're setting the is_agent flag, be sure to
	// define that in the is_agent collection.
	if (hashkey === 'is_agent') {
		p = UserIsAgent.set(userid, value);
	}

	return Promise.join(redis.hset(key(userid), hashkey, value), p, function (a) {return a;});
};

function ensureUniqueId (count) {
	count = Number(count) + 1;
	var userid = random(32);
	return exports.get(userid, 'userid').then(function (user) {
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

exports._ensureUniqueId = ensureUniqueId;

exports.create = function (forcedID) {
	var promisedUserID;

	if (forcedID) {
		promisedUserID = exports.get(forcedID).then(function (u) {
			if (u && u.userid) return Promise.reject(new Error(forcedID + ' already exists.'));
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
