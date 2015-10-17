#!/usr/bin/env node
/* eslint no-console:0, no-process-exit:0 */

var www = require('./src/www');
var ident = require('./src/ident');

ident.start(10113);
www.start(10110, ident.push);

var terminating = false;
var shutdown = function () {
	if (terminating) return;
	terminating = true;
	console.log('Process is terminating, closing connections');

	var count = 2;
	function done () {
		if (--count < 1) {
			console.log('Shutdown');
			process.exit(0);
		}
	}

	www.shutdown(done);
	ident.shutdown(done);

	setTimeout(function () {
		console.log('Shutdown took too long, terminating.');
		process.exit(0); // eslint-disable-line no-process-exit
	}, 5000);
};

process.on('SIGUSR2', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.graceful = shutdown;
