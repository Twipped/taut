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

if (!config.io.email) {
	config.io.email = {};
}

// load the transport we need
var transport = require(transports[config.io.email.method || 'test'])(config.io.email.options || {});

var transporter = nodemailer.createTransport(transport);

// add auto text conversion
transporter.use('compile', htmlToText());

module.exports = transporter;
