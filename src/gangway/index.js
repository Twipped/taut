
var debug           = require('taut.shared/debug')();
var mq              = require('taut.shared/io/mq');
var Promise         = require('bluebird');
var messageHandlers = require('./src/message-handlers');

module.exports = function () {
	return mq.subscribe('irc:incoming', function (type) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (messageHandlers[type]) {
			return Promise.try(messageHandlers[type], args).catch(console.error);
		}

		debug.error('unknown message type', type, args);
	});

};
