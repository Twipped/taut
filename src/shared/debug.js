'use strict';

/**
 * App level manager for debug instances.
 * Helps to avoid creating redundant instances of debug, and ensures that
 * every instance is prefixed with the application name (taken from package.json)
 */

var config = require('./config');

if (!process.env.DEBUG) process.env.DEBUG = config.name + '*';

var debug = require('debug');

var debugCache = {};
function getDebug (name) {
	if (!name) name = '';

	if (!debugCache[name]) {
		var log = debug(config.name + (name && ':' + name || ''));
		var error = debug(config.name + (name && ':' + name || '') + ':error');
		error.log = console.error.bind(console); // eslint-disable-line no-console

		log.error = error;

		debugCache[name] = log;
	}
	return debugCache[name];
}

module.exports = exports = getDebug;

exports.noop = function fireAndForget (name) {
	return function (err) {
		if (err) {
			getDebug(name)('error', err);
		}
	};
};
