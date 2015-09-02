
/**
 * Simple wrapper around bcrypt for easy and secure password hashing with random salts.
 *
 * Exposes two functions:
 *  - passwords.create(passwordText[, callback])
 *    Returns a promise that resolves with a password hash.
 *    If a node style callback is provided, that will be called before the promise is resolved.
 *
 *  - passwords.check(passwordText, hash[, callback])
 *    Returns a promise that resolves with a boolean indicating if the password matches the hash.
 *    If a node style callback is provided, that will be called before the promise is resolved.
 */

var proxmis = require('proxmis');
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

exports.create = function (password, cb) {
	var p = proxmis(cb);

	bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
		if (err) return p(err);

		// hash the password using our new salt
		bcrypt.hash(password, salt, function (err, hash) {
			if (err) return p(err);

			// override the cleartext password with the hashed one
			p(null, hash);
		});
	});

	return p;
};

exports.check = function (candidatePassword, hash, cb) {
	var p = proxmis(cb);

	bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
		if (err) {return p(err);}
		p(null, isMatch);
	});

	return p;
};
