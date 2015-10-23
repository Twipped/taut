
var config  = require('./config');
var debug   = require('./debug')('metrics');
var Promise = require('bluebird');
var assign  = require('lodash/object/assign');
var librato;

if (!config.librato.email || !config.librato.token) {
	debug.error('Missing librato configuration');
}

function startup () {
	if (librato || !config.librato.email || !config.librato.token) return;

	librato = require('librato-node');
	librato.configure(assign({ prefix: config.name + '.' }, config.librato));
	librato.start();
	debug('started');
}

exports.measure = function () {
	startup();
	return librato && librato.measure.apply(librato, arguments);
};

exports.increment = function () {
	startup();
	return librato && librato.increment.apply(librato, arguments);
};

exports.timing = function (name, resolver, opts) {
	startup();
	if (resolver && typeof resolver.then === 'function') {
		resolver = Promise.resolve(resolver);
		librato.timing(name, function (done) {
			resolver.nodeify(done);
		}, opts);
		return resolver;
	}

	return librato && librato.timing.apply(librato, arguments);
};

exports.middleware = function (countName, timeName) {
	startup();
	if (!librato) {
		return function (req, res, next) {return next();};
	}

	return librato.middleware({
		requestCountKey: countName || 'express.requests',
		responseTimeKey: timeName || 'express.duration'
	});
};

process.on('graceful stop', function (promises) {
	debug('stopping');
	if (!librato) return;

	promises.push(
		Promise.fromNode(function (resolve) {
			librato.stop(resolve);
		}).then(function () { debug('stopped'); })
	);
});
