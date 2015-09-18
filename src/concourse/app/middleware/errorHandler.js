/* eslint no-unused-vars:0, no-console:0 */
'use strict';

var extend = require('util')._extend;

module.exports = function () {
	return function (err, req, res, next) {
		var error = {
			error: extend({
				message: err.message,
				stack: (err.stack || '')
					.split('\n')
					.slice(1)
					.map(function (v) { return '' + v + ''; })
			}, err)
		};

		console.error(error);

		res.status(503);
		if ((req.headers.accept || '').indexOf('json') > -1) {
			res.json(error);
		} else {
			res.locals.error = err.toString()
				.replace(/\n/g, '')
				.replace(/&(?!\w+;)/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
			res.locals.statusCode = res.statusCode;
			res.locals.stack = error.stack;
			res.render('error', res.locals);
		}

	};
};
