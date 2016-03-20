
var webpack = require('webpack');
var path = require('path');

module.exports = {
	context: __dirname,
	entry: {
		'pages/frontpage': './ui/pages/frontpage.js'
	},

	output: {
		path: path.resolve(__dirname, './public/build'),
		publicPath: '/build/',
		filename: '[name].js'
	},

	plugins: [
		// new webpack.ContextReplacementPlugin(/ui\/components\/chat/, /a^/)
		new webpack.IgnorePlugin(/components\/chat/)
		// new webpack.optimize.CommonsChunkPlugin('main.js')
	],

	module: {
		loaders: [
			{ test: /\.hbs$/, loader: 'handlebars-loader' }
		]
	},

	devtool: 'source-map',

	resolve: {
		root: path.resolve(__dirname, './ui'),
		alias: {
			underscore: 'lodash'
		}
	}
};
