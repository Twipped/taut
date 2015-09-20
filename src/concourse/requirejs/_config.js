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
		'moment'             : '../vendor/moment/moment',
		'backbone'           : '../vendor/backbone/backbone',
		'bootstrap'          : '../vendor/bootstrap',
		'bootbox'            : '../vendor/bootbox/bootbox',
		'handlebars'         : '../vendor/handlebars/dist/amd/handlebars',
		'handlebars.runtime' : '../vendor/handlebars/dist/amd/handlebars.runtime',
		'helper-hoard'       : '../vendor/helper-hoard/build/hoard.all',
		'socket.io'          : '../vendor/socket.io.js',

		'components'         : '../components'
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

