
var debug           = require('finn.shared/debug')();
var mq              = require('finn.shared/io/mq');
var Promise         = require('bluebird');
var messageHandlers = require('./src/message-handlers');

module.exports = function () {

	return mq.subscribe('irc:incoming', function (type) {
		var args = Array.prototype.slice.call(arguments, 1);

		if (messageHandlers[type]) {
			return Promise.try(messageHandlers[type], args);
		} else {
			debug.error('unknown message type', type, args);
		}
	});

};
