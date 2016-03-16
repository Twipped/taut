
var config  = require('./config');

if (config.newrelic && !config.newrelic.disabled) {
	process.env.NEW_RELIC_LICENSE_KEY    = process.env.NEW_RELIC_LICENSE_KEY    || config.newrelic.NEW_RELIC_LICENSE_KEY;
	process.env.NEW_RELIC_APP_NAME       = process.env.NEW_RELIC_APP_NAME       || config.newrelic.NEW_RELIC_APP_NAME;
	process.env.NEW_RELIC_LOG_LEVEL      = process.env.NEW_RELIC_LOG_LEVEL      || config.newrelic.NEW_RELIC_LOG_LEVEL || 'info';
	process.env.NEW_RELIC_NO_CONFIG_FILE = process.env.NEW_RELIC_NO_CONFIG_FILE || true;
	process.env.NEW_RELIC_LOG            = process.env.NEW_RELIC_LOG            || config.newrelic.NEW_RELIC_LOG || 'stdout';
} else {
	process.env.NEW_RELIC_ENABLED = 'false'; // yes, it has to be a string
}

var newrelic = require('newrelic');

var debug   = require('./debug')('metrics');

var timer = setInterval(measureEventLoop, 10000);


function measureEventLoop () {
	setImmediate(exports.timing('eventloop'));
}

exports.newrelic = newrelic;

exports.measure = function (name, value) {
	newrelic.recordMetric(name, value);
};

exports.increment = function (name, amount) {
	newrelic.incrementMetric(name, amount);
};

exports.timing = function (name, resolver) {
	var start = Date.now();

	if (resolver && typeof resolver.then === 'function') {
		resolver = resolver.then(function () {
			var time = Date.now() - start;
			exports.measure(name, time);
		});

		return resolver;
	}

	return function (result) {
		var time = Date.now() - start;
		exports.measure(name, time);
		return result;
	};
};

process.on('graceful stop', function () {
	debug('stopping');
	clearInterval(timer);
});
