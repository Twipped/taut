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
var debug       = require('taut.shared/debug')('rendering');
var cachebuster = require('../cachebuster');
var assign      = require('lodash/object/assign');

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

	Handlebars.registerHelper('require', function (template) {
		Handlebars.registerPartial(template, getTemplate(template));
	});

	Handlebars.registerHelper('rev', function (url) {
		return cachebuster(url);
	});

	return function (req, res, next) {
		res.render = function (view, data) {
			debug(view);
			var html = getTemplate(view)(assign({}, req.locals, res.locals, data));

			if (req.session && req.session.flash) req.session.flash = [];

			res.send(html);
		};
		next();
	};
};
