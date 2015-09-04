'use strict';

var debug         = require('finn.shared/debug')();
var mq            = require('finn.shared/io/mq');
var ircConnection = require('./src/connection');
var argv          = require('minimist')(process.argv.slice(2));
var UserModel     = require('finn.shared/models/user');
var UserIRCModel  = require('finn.shared/models/user/irc');
var Promise       = require('bluebird');

if (argv.userid) {
	launchWithUserid(argv.userid);
} else if (argv.login) {
	UserModel.getUserIDByEmail(argv.login).then(launchWithUserid);
} else {

}

function launchWithUserid (userid) {
	return UserIRCModel.get(userid)
		.then(ircConnection)
		.then(function (irc) {
			irc.connect(function (err) {
				if (err) console.error(err);
			});
		});
}

var terminating = false;
var shutdown = function () {
	if (terminating) return;
	terminating = true;
	debug('Process is terminating, closing connections');

	var promises = [
		mq.shutdown()
	];

	ircConnection.shutdownAll(function () {
		process.emit('graceful stop', promises);

		Promise.settle(promises).then(function () {
			debug('Shutdown');
			process.exit(0); // eslint-disable-line no-process-exit
		});
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
