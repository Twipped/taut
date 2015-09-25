'use strict';

var ircConnection = require('./src/connection');
var UserIRCModel  = require('finn.shared/models/user/irc');
var UserChannelsModel = require('finn.shared/models/user/irc/channels');
var Promise       = require('bluebird');

exports.connectUserID = function connectUserID (userid) {
	return Promise.all([
			UserIRCModel.get(userid),
			UserChannelsModel.get(userid)
		])
		.then(function (results) {
			var user = results[0];
			user.activeChannels = results[1];

			ircConnection(user);
		})
		.catch(console.error);
};
