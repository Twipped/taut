
var debug           = require('taut.shared/debug')();
var mq              = require('taut.shared/io/mq');
var Promise         = require('bluebird');
var messageHandlers = require('./src/message-handlers');
var metrics         = require('taut.shared/metrics');

module.exports = function () {
	return mq.subscribe('irc:incoming', function (type) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (messageHandlers[type]) {
			var p = Promise.try(messageHandlers[type], args)
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
