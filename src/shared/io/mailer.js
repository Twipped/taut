'use strict';

var config = require('../config');
var debug = require('../debug')('mailer');
var emailConfig = config.io.email || {};

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

var transports = {
	smtp:     'nodemailer-smtp-transport',
	test:     'nodemailer-pickup-transport',
	ses :     'nodemailer-ses-transport',
	stub:     'nodemailer-stub-transport',
	sendmail: 'nodemailer-sendmail-transport'
};

// load the transport we need
var transport;

if (emailConfig.method === 'gmail') {
	transport = {
		service: 'gmail',
		auth: emailConfig.options
	};
	debug('transport setup for ', emailConfig.method);
} else if (emailConfig.method === 'gmail-oauth') {
	var generator = require('xoauth2').createXOAuth2Generator(emailConfig.options);
	transport = {
		service: 'gmail',
		auth: { xoauth2: generator }
	};
	debug('transport setup for ', emailConfig.method);
} else if (transports[emailConfig.method]) {
	transport = require(transports[emailConfig.method])(emailConfig.options || {});
	debug('transport setup for ', emailConfig.method);
} else {
	debug.error('Could not setup a transport.', emailConfig);
}


var transporter = nodemailer.createTransport(transport);

// add auto text conversion
transporter.use('compile', htmlToText());

module.exports = transporter;
