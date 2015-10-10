'use strict';
/**
 * References against the revisions manifest to do path substitution.
 * Used by server side handlebars templates for active replacement.
 */

var isProduction = (process.env.NODE_ENV || 'development') === 'production';
var debug = require('taut.shared/debug')('cachebuster');

var manifest = {};

try {
	manifest = require('./rev-manifest.json');
} catch (e) {
	manifest = {};
}

module.exports = function (path) {
	if (path[0] === '/') path = path.substr(1);

	var lookup = 'rev/' + path;

	debug('lookup', path, manifest[lookup] || 'N/A');

	if (isProduction && manifest[lookup]) return '/' + manifest[lookup];
	return '/' + path;
};
