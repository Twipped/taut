
var debug = require('../../../debug')('models:user:irc:nickserv');
var mysql = require('../../../io/mysql');
var queryize = require('queryize');
var pwhash = require('../../../lib/passwords');

var TABLENAME = 'users_irc_nickserv';
var PASSWORDKEY = require('../../../config').userEncryptionKey;

exports.get = function (userid, nick) {
	if (nick) {
		return queryize().from(TABLENAME)
			.select('nickname', 'password')
			.where({ userid: userid, nickname: nick })
			.exec(mysql)
			.then(function (rows) {
				if (!rows || !rows[0]) return;

				return {
					nickname: rows[0].nickname,
					password: pwhash.decrypt(PASSWORDKEY + rows[0].nickname, rows[0].password)
				};
			});
	}

	return queryize().from(TABLENAME)
		.select('nickname', 'password')
		.where({ userid: userid })
		.exec(mysql)
		.then(function (rows) {
			return rows.map(function (row) {
				return {
					nickname: row.nickname,
					password: pwhash.decrypt(PASSWORDKEY + row.nickname, row.password)
				};
			});
		});
};

exports.add = function (userid, nickname, password) {
	debug('adding', userid, nickname);

	return queryize().from(TABLENAME)
		.replace({
			userid: userid,
			nickname: nickname,
			password: password && pwhash.encrypt(PASSWORDKEY + nickname, password) || null
		})
		.exec(mysql);
};

exports.remove = function (userid, nickname) {
	debug('removing', userid, nickname);

	return queryize().from(TABLENAME)
		.delete()
		.where({ userid: userid, nickname: nickname })
		.exec(mysql);
};
