/**
 * Custom rendering engine for server side templates.
 * - Loads the helper hoard collection into handlebars.
 * - Handles synchronous requirement and caching of partials.
 * - Provides the `{{rev}}` helper for cache busting
 *
 * Replaces the express res.render function.
 */
'use strict';

var path        = require('path');
var Handlebars  = require('handlebars');
var debug       = require('finn.shared/debug')('rendering');
var cachebuster = require('../cachebuster');

require('helper-hoard').load(Handlebars);

module.exports = function (root, publicRoot) {
	var cache = {};

	function getTemplate (src) {
		var actualpath;

		if (src.substr(0,7) === 'public/') {
			actualpath = path.resolve(path.join(publicRoot, 'views/', src));
		} else if (src.substr(0,11) === 'components/') {
			actualpath = path.resolve(path.join(publicRoot, src));
		} else {
			actualpath = path.resolve(path.join(root, src));
		}

		if (cache[actualpath]) {
			return cache[actualpath];
		}

		debug('loading', actualpath);
		var template = require(actualpath);

		return (cache[actualpath] = template);
	}

	Handlebars.registerHelper('require', function (path) {
		Handlebars.registerPartial(path, getTemplate(path));
	});

	Handlebars.registerHelper('rev', function (path) {
		return cachebuster(path);
	});

	return function (req, res, next) {
		res.render = function (view, data) {
			debug(view);
			res.send(getTemplate(view)(data));
		};
		next();
	};
};
