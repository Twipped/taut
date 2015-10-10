'use strict';
var isProduction = (process.env.NODE_ENV || 'development') === 'production';

// var config = require('taut.shared/config');
var express = require('express');
var path = require('path');
var sessionLogin = require('./routes/login');

var app = express();

app.use(require('gnu-terry-pratchett')());
app.use(require('serve-favicon')(path.join(__dirname, '../public/favicon.ico')));

app.use(require('morgan-debug')(require('taut.shared/debug')('app'), 'dev'));
app.use(require('./middleware/render-handlebars')(
	path.join(__dirname, 'views'),
	path.join(__dirname, '../public')
));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/', sessionLogin);
app.use('/', require('./routes/index'));

// app.get('/', sessionLogin.sessionRequired, sessionLogin.validate(), function (req, res) {
// 	res.render('index.hbs', { title: 'Finn' });
// });

if (!isProduction) {
	app.use(require('./middleware/errorHandler')());
	app.use('/requirejs', function (req, res) {
		res.send('define(function () {});');
	});

	app.get('/uitest', function (req, res) {
		res.render('uitest.hbs');
	});
}

// 404 Handler
app.use(function (req, res) {
	res.status(404);
	res.locals.error = 'File not found.';
	res.locals.statusCode = 404;
	res.render('error.hbs', res.locals);
});

module.exports = app;

