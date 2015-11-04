
var Promise = require('bluebird');
var redis = require('../../../io/redis');

var pwhash = require('../../../lib/passwords');

function keyByUser (userid) {
	return 'user:' + userid + ':login:email';
}

function keyByEmail (email) {
	return 'login:email:' + email.toLowerCase();
}


exports.changePasswordForUserId = function (userid, newPassword) {
	if (!userid)  return Promise.reject(new Error('Userid is missing or blank.'));

	return redis.get(keyByUser(userid)).then(function (email) {
		if (!email) return Promise.reject(new Error('No email login exists for ' + userid));
		return (newPassword && pwhash.create(newPassword) || Promise.resolve(null)).then(function (hash) {
			return redis.hmset(keyByEmail(email), {
				email: email,
				userid: userid,
				password: hash,
				date_created: new Date()
			});
		});
	});

};

exports.changePasswordForEmail = function (email, newPassword) {
	if (!email) return Promise.reject(new Error('Email is missing or blank.'));

	return redis.hget(keyByEmail(email), 'userid').then(function (userid) {
		return (newPassword && pwhash.create(newPassword) || Promise.resolve(null)).then(function (hash) {
			return redis.hmset(keyByEmail(email), {
				email: email,
				userid: userid,
				password: hash,
				date_created: new Date()
			});
		});
	});

};

exports.changeEmail = function (userid, newEmail) {

	var emailLookup = redis.get(keyByUser(userid));
	var hashLookup = emailLookup.then(function (email) {
		if (!email) return null;
		return redis.hget(keyByEmail(email), 'password');
	});

	// fetch the old email for this userid, and the hashed password for that email
	return Promise.join(emailLookup, hashLookup, function (oldEmail, hash) {
		// delete the login data for the old email, if it exists
		return Promise.resolve(oldEmail && redis.del(keyByEmail(oldEmail))).then(function () {
			// save the new login data, and attach the new email to the userid
			return Promise.join(
				redis.hmset(keyByEmail(newEmail), {
					email: newEmail,
					userid: userid,
					password: hash,
					date_created: new Date()
				}),

				redis.set(keyByUser(userid), newEmail),

				function () {}
			);
		});
	});

};

exports.create = function (userid, email, password) {
	if (!userid)  return Promise.reject(new Error('Userid is missing or blank.'));
	if (!email)  return Promise.reject(new Error('Email is missing or blank.'));

	return (password && pwhash.create(password) || Promise.resolve(null)).then(function (hash) {

		return Promise.join(
			redis.hmset(keyByEmail(email), {
				email: email,
				userid: userid,
				password: hash,
				date_created: new Date()
			}),

			redis.set(keyByUser(userid), email),

			function () {}
		);

	});
};

exports.check = function (email, password) {
	return redis.hget(keyByEmail(email), 'password').then(function (hash) {
		if (!hash) return false;
		return pwhash.check(password, hash);
	});
};

exports.exists = function (email) {
	return redis.hget(keyByEmail(email), 'email').then(Boolean);
};

exports.getUserIDByEmail = function (email) {
	return redis.hget(keyByEmail(email), 'userid');
};

exports.getByEmail = function (email) {
	return redis.hgetall(keyByEmail(email));
};
