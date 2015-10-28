
var Promise = require('bluebird');
var mysql = require('../../../io/mysql');
var quell = require('quell');
var queryize = require('queryize');
var pwhash = require('../../../lib/passwords');
var first = function (arr) {return arr && arr[0];};

var TABLENAME = 'users_login_email';

var Login = quell(TABLENAME, { connection: mysql });
module.exports = Login;

Login.prototype.changePassword = function (replacement) {
	var self = this;

	return pwhash.create(replacement).then(function (hash) {
		return queryize
			.update(TABLENAME)
			.where({ email: self.data.email })
			.set({ password: replacement })
			.exec(mysql)
			.then(function (result) {
				if (!result.affectedRows) {
					return Promise.reject(new Error('Could not change password for ' + self.data.email));
				}

				self.data.password = hash;
				return self;
			});
	});
};

Login.prototype.changeEmail = function (replacement) {
	var self = this;
	return queryize
		.update(TABLENAME)
		.where({ email: this.data.email })
		.set({ email: replacement })
		.exec(mysql)
		.then(function (result) {
			if (!result.affectedRows) {
				return Promise.reject(new Error('Could not change email for ' + self.data.email));
			}

			self.data.email = replacement;
			return self;
		});
};



Login.create = function (userid, email, password) {
	if (!userid)  return Promise.reject(new Error('Userid is missing or blank.'));
	if (!email)  return Promise.reject(new Error('Login is missing or blank.'));

	return (password && pwhash.create(password) || Promise.resolve(null)).then(function (hash) {
		var login = new Login({
			userid: userid,
			email: email,
			password: hash,
			date_created: new Date()
		});

		return login.insert();
	});
};

Login.check = function (email, password) {
	return Login.find({ email: email })
		.select('email', 'password').exec().then(first)
		.then(function (login) {
			if (!login.get('password')) return false;

			return pwhash.check(password, login.get('password'));
		});
};

Login.exists = function (email) {
	return Login.find({ email: email })
		.select('userid', 'email').exec()
		.then(function (rows) {return !!rows.length;});
};

Login.getUserIDByEmail = function (email) {
	return Login.find({ email: email })
		.select('userid', 'email').exec().then(first)
		.then(function (user) {
			if (user && user.get('email') === email) {
				return user.get('userid');
			}
		});
};

Login.getByEmail = function (email) {
	return Login.find({ email: email }).exec().then(first);
};
