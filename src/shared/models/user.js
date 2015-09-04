
var Promise = require('bluebird');
var redis = require('../io/redis');
var random = require('../lib/random');

// Value userid:<email> = userid
// Hash user:<userid>#email = email

function key (userid) {
	return 'user:' + userid;
}

exports.get = function (userid, hashkey) {
	if (hashkey) {
		return redis.hget(key(userid), hashkey).then(function (user) {
			if (!user.id) user.id = userid;
			return user;
		});
	}

	return redis.hgetall(key(userid));
};

exports.set = function (userid, hashkey, value) {
	if (typeof hashkey === 'object') {
		if (typeof hashkey.email !== 'undefined') {
			return Promise.reject(new Error('Email must be changed via user.changeEmail.'));
		}
		return redis.hmset(key(userid), hashkey);
	}

	if (hashkey === 'email') {
		return Promise.reject(new Error('Email must be changed via user.changeEmail.'));
	}

	return redis.hset(key(userid), hashkey, value);
};

exports.create = function (email) {
	return exports.getUserIDByEmail(email).then(function (userid) {
		if (userid) return userid;

		userid = random(10);
		return exports.changeEmail(userid, email)
			.then(function () {return exports.set(userid, 'id', userid);})
			.then(function () {return userid;});
	});
};

exports.changeEmail = function (userid, email) {
	if (!userid) return Promise.reject(new Error('Userid is missing or blank.'));
	if (!email)  return Promise.reject(new Error('Email is missing or blank.'));

	// first see if an email already exists for that userid
	return exports.get(userid, 'email').then(function (originalEmail) {
		if (originalEmail) {
			return redis.del('userid:' + originalEmail);
		}
	}).then(function () {
		return Promise.join(
			redis.set('userid:' + email, userid),
			redis.hset(key(userid), 'email', email)
		);
	});
};

exports.getUserIDByEmail = function (email) {
	return redis.get('userid:' + email);
};

exports.getByEmail = function (email) {
	return exports.getUserIDByEmail(email).then(exports.get);
};
