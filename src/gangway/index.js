
var metrics         = require('taut.shared/metrics');
var newrelic = metrics.newrelic;
var debug           = require('taut.shared/debug')();
var mq              = require('taut.shared/io/mq');
var Promise         = require('bluebird');
var messageHandlers = require('./src/message-handlers');

module.exports = function () {
	return mq.subscribe('irc:incoming', function (type, event) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (messageHandlers[type]) {
			// var p = Promise.try(messageHandlers[type], args)
			var p = Promise.try(newrelic.createWebTransaction('message', function () {
				newrelic.addCustomParameter('type', type);
				newrelic.addCustomParameter('event', event);
				return messageHandlers[type].apply(messageHandlers, args).then(newrelic.endTransaction.bind(metrics.newrelic));
			}))
				.catch(debug.error);

			metrics.timing('digest', p);
			metrics.timing('digest.' + type, p);
			p.then(function () {
				metrics.increment('total');
			});

			return p;
		}

		debug.error('unknown message type', type, args);
	});

};
