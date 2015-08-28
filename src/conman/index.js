'use strict';

var config     = require('finn.shared/config');
var debug      = require('app/debug')();
var mq         = require('finn.shared/db/mq');
var connection = require('./src/connection');

var Promise    = require('bluebird');



var terminating = false;
var shutdown = function () {
	if (terminating) return;
	terminating = true;
	debug('Process is terminating, closing connections');

	var promises = [
		mq.shutdown()
	];

	process.emit('graceful stop', promises);

	Promise.settle(promises).then(function () {
		debug('Shutdown');
		process.exit(0); // eslint-disable-line no-process-exit
	});

	setTimeout(function () {
		debug('Shutdown took too long, terminating.');
		process.exit(0); // eslint-disable-line no-process-exit
	}, 5000);
};

process.on('SIGUSR2', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.graceful = shutdown;
