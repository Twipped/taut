var config            = require('taut.shared/config');
var connect           = require('./src/connection');
var debug             = require('taut.shared/debug')('index');
var UserIRCModel      = require('taut.shared/models/user/irc');
var UserChannels      = require('taut.shared/models/user/irc/channels');
var UserNickserv      = require('taut.shared/models/user/irc/nickserv');
var userIsAgent       = require('taut.shared/models/user/is-agent');
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

	return Promise.join(
		UserIRCModel.get(userid),
		UserChannels.get(userid).then(Object.keys),
		userIsAgent(userid),
		UserNickserv.get(userid),
		function (user, channels, isAgent, nickserv) {
			if (!user) {
				return Promise.reject(new Error('User ' + userid + ' not found.'));
			}

			user.activeChannels = channels || [];
			user.isAgent = isAgent || false;
			user.nickserv = nickserv || {};

			var irc = connect(user);

			connections[user.userid] = irc;
			irc.on('end', function () {
				delete connections[user.userid];
			});

			irc.connect();

			return irc;
		}
	)
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

