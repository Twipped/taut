'use strict';

var config = require('../config');
var debug = require('../debug')('elasticsearch');

var Client = require('elasticsearch').Client;
var client = new Client(config.io.elasticsearch);

debug('initialized');

module.exports = client;
