
var config   = require('./config');
var debug    = require('./debug')('alerts');
var debounce = require('lodash/function/debounce');
var mailer   = require('./io/mailer');

var queue = [];

var send = debounce(function () {
	var letter = {
		to: config.alerts.target,
		from: 'taut@chipersoft.com',
		subject: 'Taut System Alert',
		text: 'The following system alerts have occurred:\n\n'
	};

	letter.text += queue.map(function (row) {
		return JSON.stringify(row, null, 2);
	}).join('\n\n-----\n\n');

	queue = [];

	debug('Dispatching system alert email.');
	mailer.sendMail(letter, function (err) {
		if (err) debug.error(err);
	});

}, config.alerts.wait, { maxWait: config.alerts.maxWait });

module.exports = function () {
	var args = Array.prototype.slice.call(arguments);
	debug('received', args[0]);
	queue.push(args);
	send();
};

