'use strict';

var config = require('../config');
var debug = require('../debug')('redis');

var Redis = require('ioredis');
var Promise = require('bluebird');

var redis = new Redis(config.io.redis);

debug('initialized');

redis.on('ready', function () {
	debug('ready');
});

redis.on('error', function (err) {
	debug.error(err);
});

process.on('graceful stop', function (promises) {
	debug('stopping');
	promises.push(new Promise(function (resolve) {
		try {
			redis.quit(resolve);
		} catch (e) {
			resolve();
		}
	}).then(debug.bind(null, 'stopped')));
});

module.exports = redis;
