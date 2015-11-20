
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
var crypto = require('crypto');
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

exports.encrypt = function (key, original) {
	if (!original) return '';
	var cipher = crypto.createCipher('aes-256-cbc', key);
	return cipher.update(original, 'utf8', 'base64') + cipher.final('base64');
};

exports.decrypt = function (key, encrypted) {
	if (!encrypted) return '';
	var decipher = crypto.createDecipher('aes-256-cbc', key);
	return decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
};
