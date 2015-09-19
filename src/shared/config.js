'use strict';

/**
 * App configuration loader. Uses the `rc` package to find json
 * based config files (see package docs for details), with a set of development defaults.
 */

var pkg = require('./pkg');

var config = require('rc')(pkg.name, {
	name: pkg.name,
	version: pkg.version,
	io: {
		redis: {
			port: 6379,
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
		elasticsearch: {
			host: 'localhost:9200'
		},
		email: {
			method: 'test',
			options: {
				directory: '/srv/logs/mail'
			}
		},
		mq: {
			redis: ['redis://127.0.0.1:6379']
		}
	},

	concourse: {
		port: 8000
	},

	gangway: {
		heartbeat: 30
	},

	tarmac: {
		heartbeat: 30
	}
});


module.exports = config;
