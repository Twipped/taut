
var debug           = require('taut.shared/debug')();
var mq              = require('taut.shared/io/mq');
var Promise         = require('bluebird');
var messageHandlers = require('./src/message-handlers');
// var newrelic        = require('newrelic');

module.exports = function () {

	return mq.subscribe('irc:incoming', function (type) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (messageHandlers[type]) {
			// return newrelic.createBackgroundTransaction('digest:' + type, function () {
				return Promise.try(messageHandlers[type], args).then(function () {
					// newrelic.endTransaction();
				});
			// }).catch(console.error);
		}

		debug.error('unknown message type', type, args);
	});

};
