'use strict';

var crypto = require('crypto');

// based on code from http://stackoverflow.com/a/25690754/110189
function randomString (length, chars) {
	if (!chars) {
		throw new Error('Argument \'chars\' is undefined');
	}

	var charsLength = chars.length;
	if (charsLength > 256) {
		throw new Error('Length must be less than 256 characters');
	}

	var randomBytes;

	try {
		randomBytes = crypto.randomBytes(length);
	} catch (e) {
		randomBytes = crypto.pseudoRandomBytes(length);
	}

	var result = new Array(length);

	var cursor = 0;
	for (var i = 0; i < length; i++) {
		cursor += randomBytes[i];
		result[i] = chars[cursor % charsLength];
	}

	return result.join('');
}

module.exports = function randomAsciiString (length) {
	return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUWXYZ0123456789');
};

module.exports.fromCharSet = randomString;
