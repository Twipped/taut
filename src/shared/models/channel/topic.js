
var redis = require('../../io/redis');
var tryParse = function (input) {try {return JSON.parse(input);} catch (e) {return undefined;}};
var assign = require('lodash/object/assign');

function key (channel) {
	return 'channel:' + channel.toLowerCase() + ':topic';
}

exports.get = function (channel, hashkey) {
	if (hashkey) {
		if (hashkey === 'links') {
			return redis.hget(key(channel), hashkey).then(tryParse);
		}

		return redis.hget(key(channel), hashkey).then(function (data) {
			if (data.links) data.links = tryParse(data.links);
			return data;
		});
	}

	return redis.hgetall(key(channel));
};

exports.set = function (channel, hashkey, value) {
	if (typeof hashkey === 'object') {

		if (typeof hashkey.links === 'object') {
			hashkey = assign({}, hashkey);
			hashkey.links = JSON.stringify(hashkey.links);
		}

		return redis.hmset(key(channel), hashkey);
	}

	return redis.hset(key(channel), hashkey, value);
};
