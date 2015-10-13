'use strict';

/**
 * App configuration loader. Uses the `rc` package to find json
 * based config files (see package docs for details), with a set of development defaults.
 */

var pkg = require('./pkg');
var path = require('path');

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
			user: 'vagrant',
			password: 'vagrant',
			database: 'taut',
			connectionLimit: 2
		},
		elasticsearch: {
			host: 'localhost:9200'
		},
		email: {
			method: 'test',
			options: {
				directory: path.resolve('../logs/mail')
			}
		},
		mq: {
			redis: ['redis://127.0.0.1:6379']
		}
	},

	userEncryptionKey: 'ktiR9MQ87rPH4Kk6dtmLR6A9vpe8Y32T',

	concourse: {
		port: 8000,
		visitorHeartbeat: 30,
		visitorExpire: 60 * 15
	},

	gangway: {
		heartbeat: 30
	},

	tarmac: {
		control: {
			port: 56001,
			host: '127.0.0.1'
		},
		heartbeat: 30,
		maxConnectionsPerWorker: 1
	},

	tower: {
		control: {
			port: 56001,
			host: '127.0.0.1'
		},
		launchWait: 10,
		minimumOpenSeats: 1,
		maximumOpenSeats: 2,
		maximumTotalSeats: 20,
		maximumReconnect: {
			timeout: 60000 * 5,
			count: 3
		},
		tarmacLaunch: {
			bin: path.join(path.dirname(require.main.filename), '..', '..', 'tarmac', 'bin', 'taut-tarmac'),
			out: path.join(path.dirname(require.main.filename), '..', '..', 'logs', 'tarmac.log'),
			err: path.join(path.dirname(require.main.filename), '..', '..', 'logs', 'tarmac.log'),
			env: {
				DEBUG: 'taut.tarmac:*'
			}
		}
	},

	alerts: {
		target: 'chiper@chipersoft.com',
		wait: 10000,
		maxWait: 120000
	}
});


module.exports = config;
