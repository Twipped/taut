
require([
	// 'requirejs',
	// 'require.config',
	'jquery',
	'lodash',
	'backbone',
	'handlebars',
	'helper-hoard',
	'require-components',
	'build/version'
], function () {
	var handlebars = require('handlebars');
	var hoard = require('helper-hoard');

	hoard.load(handlebars);
});
