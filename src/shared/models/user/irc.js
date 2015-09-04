
var redis = require('../../io/redis');

function key (userid) {
	return 'user:' + userid + ':irc';
}

exports.get = function (userid) {
	return redis.hgetall(key(userid)).then(function (user) {
		if (!user.id) user.id = userid;
		return user;
	});
};

exports.set = function (userid, hashkey, value) {
	if (typeof hashkey === 'object') {
		return redis.hmset(key(userid), hashkey);
	} else {
		return redis.hset(key(userid), hashkey, value);
	}
};
