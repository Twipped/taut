
var Promise = require('bluebird');
var redis = require('../io/redis');
var pwhash = require('../lib/passwords');

// login:<login> = passwordHash

exports.save = function (login, password) {
	if (!login)  return Promise.reject(new Error('Login is missing or blank.'));
	if (!password) return Promise.reject(new Error('Password is missing or blank.'));

	return pwhash.create(password).then(function (hash) {
		return redis.set('login:' + login, hash);
	});
};

exports.check = function (login, password) {
	return redis.get('login:' + login).then(function (hash) {
		if (!hash) return false;

		return pwhash.check(password, hash);
	});
};

exports.changeLogin = function (original, newEmail) {
	return redis.get('login:' + original).then(function (hash) {
		if (!hash) {
			return Promise.reject(new Error('No previous entry for ' + original));
		}

		return Promise.join(
			redis.del('login:' + original),
			redis.set('login:' + newEmail, hash)
		);
	});
};

exports.exists = function (login) {
	return redis.exists('login:' + login);
};
