'use strict';

/**
 * App configuration loader. Uses the `rc` package to find json
 * based config files (see package docs for details), with a set of development defaults.
 */

var pkg = require('./pkg');

var config = require('rc')(pkg.name, {
	name: pkg.name,
	version: pkg.version,
	redis: {
		port: 6380,
		host: '127.0.0.1',
		auth: false
	},
	mysql: {
		host: '127.0.0.1',
		user: 'finn',
		password: 'finn',
		database: 'finn',
		connectionLimit: 2
	},
	email: {
		method: 'test',
		options: {
			directory: '/srv/logs/mail'
		}
	},
	mq: {
		redis: ['redis://127.0.0.1:6380']
	}
});


module.exports = config;
