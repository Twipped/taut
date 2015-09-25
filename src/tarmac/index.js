'use strict';

var connect = require('./src/connection');
var debug  = require('finn.shared/debug')('index');
var UserIRCModel  = require('finn.shared/models/user/irc');
var UserChannelsModel = require('finn.shared/models/user/irc/channels');
var Promise       = require('bluebird');

var connections = {};

exports.connectUserID = function connectUserID (userid) {
	return Promise.all([
			UserIRCModel.get(userid),
			UserChannelsModel.get(userid)
		])
		.then(function (results) {
			var user = results[0];
			user.activeChannels = results[1];

			var irc = connect(user);

			connections[irc.id] = irc;
			irc.on('end', function () {
				delete connections[irc.id];
			});

			return irc;
		})
		.catch(console.error);
};

exports.shutdown = function () {
	var cids = Object.keys(connections);

	debug('closing all connections');
	return Promise.map(cids, function (cid) {
		var irc = connections[cid];

		return new Promise(function (cb) {
			irc.shutdown('Process Terminated', cb);
		});
	}).finally(function () {
		connections = {};
	});
};

