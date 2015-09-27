
var debug = require('../../../debug')('models:user:irc:channels');
var mysql = require('../../../io/mysql');
var queryize = require('queryize');
var pwhash = require('../../../lib/passwords');

var TABLENAME = 'users_irc_channels';
var PASSWORDKEY = require('../../../config').userEncryptionKey;

exports.get = function (userid) {
	return queryize().from(TABLENAME)
		.select('channel', 'password')
		.where({ userid: userid })
		.exec(mysql)
		.then(function (rows) {
			return rows.map(function (row) {
				if (row.password) {
					return {
						channel: row.channel,
						password: pwhash.decrypt(PASSWORDKEY + row.channel, row.password)
					};
				}
				return row.channel;
			});
		});
};

exports.add = function (userid, channel, password) {
	debug('adding', userid, channel);

	return queryize().from(TABLENAME)
		.replace({
			userid: userid,
			channel: channel,
			password: password && pwhash.encrypt(PASSWORDKEY + channel, password) || null
		})
		.debug()
		.exec(mysql);
};

exports.remove = function (userid, channel) {
	debug('removing', userid, channel);

	return queryize().from(TABLENAME)
		.delete()
		.where({ userid: userid, channel: channel })
		.exec(mysql);
};
