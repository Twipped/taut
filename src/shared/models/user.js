
var Promise = require('bluebird');
var mysql = require('../io/mysql');
var quell = require('quell');
var random = require('../lib/random');
var first = function (arr) {return arr && arr[0];};

var TABLENAME = 'users';

var User = quell(TABLENAME, { connection: mysql });
module.exports = User;

User.get = function (userid, hashkey) {
	if (hashkey) {
		return User.find({ userid: userid })
			.select('userid', hashkey).exec()
			.then(first)
			.then(function (user) {
				if (user && user.get('userid') === userid) {
					return user.get(hashkey);
				}
			});
	}

	return User.find({ userid: userid }).exec().then(first);
};

User.set = function (userid, hashkey, value) {
	var user = new User({ userid: userid });
	user.set(hashkey, value);
	return user.save();
};

function ensureUniqueId (count) {
	count = Number(count) + 1;
	var userid = random(32);
	return User.get(userid).then(function (user) {
		if (!user) {
			return userid;
		}

		// found a user with the random id. If we've done this 3 times, fail
		// otherwise try again.
		if (count > 3) {
			return Promise.reject(new Error('User.ensureUniqueId collided 3 times, something is very wrong.'));
		}

		return ensureUniqueId(count);
	});
}

User.create = function (forcedID) {
	var promisedUserID;

	if (forcedID) {
		promisedUserID = User.get(forcedID).then(function (u) {
			if (u) return Promise.reject(new Error(u + " already exists."));
			return forcedID;
		});
	} else {
		promisedUserID = ensureUniqueId();
	}

	return promisedUserID.then(function (userid) {
		var user = new User({
			userid: userid,
			date_created: new Date()
		});
		return user.insert();
	});
};
