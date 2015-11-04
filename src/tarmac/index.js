var config            = require('taut.shared/config');
var connect           = require('./src/connection');
var debug             = require('taut.shared/debug')('index');
var UserIRCModel      = require('taut.shared/models/user/irc');
var UserChannelsModel = require('taut.shared/models/user/irc/channels');
var isAgent           = require('taut.shared/models/user/is-agent');
var Promise           = require('bluebird');
var radio             = require('./src/radio');

var MAX_PASSENGERS = config.tarmac.maxConnectionsPerWorker;

var connections = {};

exports.connectUserID = function connectUserID (userid) {
	debug('connecting userid', userid);
	if (connections[userid]) {
		// we already have a connection for that userid, stop asking.
		debug.error('received connection:open for a user already running');
		return;
	}

	return Promise.all([
		UserIRCModel.get(userid),
		UserChannelsModel.get(userid),
		isAgent(userid)
	])
	.then(function (results) {
		var user = results[0];
		user.activeChannels = results[1];
		user.isAgent = results[2];

		var irc = connect(user);

		connections[user.userid] = irc;
		irc.on('end', function () {
			delete connections[user.userid];
		});

		return irc;
	})
	.catch(debug.error);
};

radio.on('identified', function () {
	var uids = Object.keys(connections);

	radio.send('counts', uids.length, MAX_PASSENGERS - uids.length);

	uids.forEach(function (userid) {
		radio.send('connection:exists', userid, Object.keys(connections[userid].channels));
	});
});

radio.on('connection:open', function (userid) {
	if (connections[userid]) {
		// we already have a connection for that userid, stop asking.
		debug.error('received connection:open for a user already running');
		return;
	}

	exports.connectUserID(userid);
});

exports.shutdown = function () {
	var uids = Object.keys(connections);

	debug('closing all connections');
	return Promise.map(uids, function (uid) {
		var irc = connections[uid];

		return new Promise(function (cb) {
			irc.shutdown('Process Terminated', cb);
		});
	}).finally(function () {
		connections = {};
	});
};

