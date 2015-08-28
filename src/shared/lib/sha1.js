'use strict';

var crypto = require('crypto');

module.exports = function sha1sum (input) {
	if (typeof input === 'object') input = JSON.stringify(input);

	return crypto.createHash('sha1').update(String(input)).digest('hex');
};
