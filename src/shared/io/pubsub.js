'use strict';

var config = require('../config');
var debug = require('../debug')('pubsub');

var RedisEmitter = require('../lib/redis-emitter');
var Promise = require('bluebird');

var pubsub = new RedisEmitter(config.io.redis);

debug('initialized');

process.on('graceful stop', function (promises) {
	promises.push(new Promise(function (resolve) {
		try {
			pubsub.quit(resolve);
		} catch (e) {
			resolve();
		}
	}));
});


module.exports = pubsub;