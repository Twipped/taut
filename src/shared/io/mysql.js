'use strict';

var config = require('../config');
var debug = require('../debug');

var Promise = require('bluebird');

var mysql = require('mysql2').createPool(config.mysql);

debug('initialized');

mysql.on('connection', function () {
	debug('connection opened');
});

mysql.on('error', function (err) {
	debug.error(err);
});

process.on('graceful stop', function (promises) {
	promises.push(new Promise(function (resolve) {
		try {
			mysql.end(resolve);
		} catch (e) {
			resolve();
		}
	}));
});

module.exports = mysql;
