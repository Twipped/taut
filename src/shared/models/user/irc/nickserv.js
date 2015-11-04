
var redis = require('../../../io/redis');
var mapValues = require('lodash/object/mapValues');

var pwhash = require('../../../lib/passwords');

var PASSWORDKEY = require('../../../config').userEncryptionKey;

function key (userid) {
	return 'user:' + userid + ':irc:nickserv';
}

exports.get = function (userid, nick) {
	if (nick) {
		return redis.hget(key(userid), nick).then(pwhash.decrypt.bind(null, PASSWORDKEY + nick));
	}

	return redis.hgetall(key(userid)).then(function (results) {
		return mapValues(results, function (encrypted, nickname) {
			return pwhash.decrypt(PASSWORDKEY + nickname, encrypted);
		});
	});
};

exports.set = function (userid, nickname, password) {
	return redis.hset(key(userid), nickname, password && pwhash.encrypt(PASSWORDKEY + nickname, password) || null);
};

exports.remove = function (userid, nickname) {
	return redis.hdel(key(userid), nickname);
};
