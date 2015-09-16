'use strict';

var debug         = require('finn.shared/debug')();
var mq            = require('finn.shared/io/mq');
var Promise       = require('bluebird');
var messageHandlers = require('./src/message-handlers');

mq.subscribe('irc:incoming', function (type) {
	var args = Array.prototype.slice.call(arguments, 1);

	if (messageHandlers[type]) {
		return Promise.try(messageHandlers[type], args);
	} else {
		debug.error('unknown message type', type, args);
	}
});



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
