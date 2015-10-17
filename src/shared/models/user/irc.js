
var Promise = require('bluebird');
var mysql = require('../../io/mysql');
var quell = require('quell');
var random = require('../../lib/random');

var pwhash = require('../../lib/passwords');
var first = function (arr) {return arr && arr[0];};

var TABLENAME = 'users_irc_settings';
var PASSWORDKEY = require('../../config').userEncryptionKey;

var Settings = quell(TABLENAME, { connection: mysql });
module.exports = Settings;

Settings.prototype.getPassword = function () {
	return pwhash.decrypt(PASSWORDKEY + this.data.username, this.data.password);
};

Settings.prototype.setPassword = function (password) {
	this.set('password', pwhash.encrypt(PASSWORDKEY + this.data.username, password));
};


Settings.get = function (userid, hashkey) {
	if (hashkey) {
		return Settings.find({ userid: userid })
			.select('userid', hashkey).exec()
			.then(first)
			.then(function (user) {
				if (user && user.get('userid') === userid) {
					return user.get(hashkey);
				}
			});
	}

	return Settings.find({ userid: userid }).exec().then(first).then(function (user) {
		// ensure every user has a random username
		if (!user.get('username')) {
			user.set('username', random.username());
			user.save();
		}
		return user;
	})
};

Settings.set = function (userid, hashkey, value) {
	var user = new Settings({ userid: userid });
	user.set(hashkey, value);

	if (hashkey === 'password') {
		this.setPassword(value);
	} else if (typeof hashkey === 'object' && hashkey.password) {
		this.setPassword(hashkey.password);
	}

	return user.save();
};

Settings.getAllKeepAliveUserIds = function () {
	return Promise.fromNode(function (cb) {
		mysql.execute('SELECT userid FROM ' + TABLENAME + ' WHERE keepalive = 1', function (err, results) {
			cb(err, results.map(function (row) {return row.userid;}));
		});
	});
};
