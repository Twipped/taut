
var redis = require('../../../io/redis');

var pwhash = require('../../../lib/passwords');

var PASSWORDKEY = require('../../config').userEncryptionKey;

function key (userid) {
	return 'user:' + userid + ':irc:password';
}

function decodePassword (userid, encrypted) {
	return pwhash.decrypt(PASSWORDKEY + userid, encrypted);
}

function encodePassword (userid, plaintext) {
	return pwhash.encrypt(PASSWORDKEY + userid, plaintext);
}

exports.get = function (userid) {
	return redis.get(key(userid)).then(decodePassword.bind(null, userid));
};

exports.set = function (userid, plaintext) {
	return redis.set(key(userid), encodePassword(userid, plaintext));
};

exports.clear = function (userid) {
	return redis.del(key(userid));
};
