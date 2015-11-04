
var redis = require('../../../io/redis');
var mapValues = require('lodash/object/mapValues');

var pwhash = require('../../../lib/passwords');

var PASSWORDKEY = require('../../../config').userEncryptionKey;

function key (userid) {
	return 'user:' + userid + ':irc:channels';
}

exports.get = function (userid, chan) {
	if (chan) {
		chan = chan.toLowerCase();
		return redis.hget(key(userid), chan).then(pwhash.decrypt.bind(null, PASSWORDKEY + chan));
	}

	return redis.hgetall(key(userid)).then(function (results) {
		return mapValues(results, function (encrypted, channel) {
			return pwhash.decrypt(PASSWORDKEY + channel, encrypted);
		});
	});
};

exports.set = function (userid, channel, password) {
	if (!channel) return Promise.reject(new Error('Channel is empty'));
	channel = channel.toLowerCase();
	return redis.hset(key(userid), channel, password && pwhash.encrypt(PASSWORDKEY + channel, password) || null);
};

exports.remove = function (userid, channel) {
	return redis.hdel(key(userid), channel);
};
