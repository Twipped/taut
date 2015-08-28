'use strict';

var config = require('../config');
var debug = require('../debug');

var Redis = require('ioredis');
var Promise = require('bluebird');

var redis = new Redis(config.redis);

debug('initialized');

redis.on('error', function (err) {
	debug.error(err);
});

process.on('graceful stop', function (promises) {
	promises.push(new Promise(function (resolve) {
		try {
			redis.quit(resolve);
		} catch (e) {
			resolve();
		}
	}));
});

module.exports = redis;
