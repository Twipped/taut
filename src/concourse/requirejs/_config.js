/*
 * RequireJS config file
 */

require.config({
	baseUrl:    '/assets/',
	locale:     'en-us',
	waitSeconds: 10,

	paths: {
		'requirejs'          : '../vendor/requirejs/require',
		'require.config'     : '../../requirejs/_config',
		'jquery'             : '../vendor/jquery.custom',
		'lodash'             : '../vendor/lodash.custom',
		'backbone'           : '../vendor/backbone/backbone',
		'bootstrap'          : '../vendor/bootstrap',
		'bootbox'            : '../vendor/bootbox/bootbox',
		'handlebars'         : '../vendor/handlebars/dist/amd/handlebars',
		'handlebars.runtime' : '../vendor/handlebars/dist/amd/handlebars.runtime',

		'components'         : '../components',
		'app/handlebars'     : './handlebars'
	},

	map: {
		'*': {
			underscore:   'lodash',
			jQuery:       'jquery',
			Handlebars:   'handlebars'
		}
	},

	deps: []
});

