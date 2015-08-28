'use strict';

var config = require('../config');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

var transports = {
	smtp:     'nodemailer-smtp-transport',
	test:     'nodemailer-pickup-transport',
	ses :     'nodemailer-ses-transport',
	stub:     'nodemailer-stub-transport',
	sendmail: 'nodemailer-sendmail-transport'
};

if (!config.email) {
	config.email = {};
}

// load the transport we need
var transport = require(transports[config.email.method || 'test'])(config.email.options || {});

var transporter = nodemailer.createTransport(transport);

// add auto text conversion
transporter.use('compile', htmlToText());

module.exports = transporter;
