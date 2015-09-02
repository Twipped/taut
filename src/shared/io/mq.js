'use strict';

var config = require('../config');
var debug = require('../debug')('mq');

var Promise = require('bluebird');
var proxmis = require('proxmis');


var ready = null;
exports.ready = null;
function notReady () {
	ready = proxmis();
	exports.ready = ready.promise;
}
notReady();


var queues = {};
var subscribers = {};


var bus = require('busmq').create(config.io.mq);

bus.on('error', function (err) {
	debug.error('bus error', err);
});
bus.on('online', function () {
	debug('bus is online');
	ready();
});
bus.on('offline', function () {
	debug.error('bus has gone offline, redis unavailable?');
	notReady();
	queues = {};
});

bus.connect();


function getQueue (name) {
	if (queues[name]) {
		return Promise.resolve(queues[name]);
	}

	return exports.ready.then(function () {
		var queue = queues[name] = bus.queue(name);
		return new Promise(function (resolve) {
			queue.on('attached', function () {
				resolve(queue);
			});
			queue.attach();
		});
	});
}


exports.emit = function (queueName) {
	var args = Array.prototype.slice.call(arguments, 1);
	return getQueue(queueName).then(function (queue) {
		queue.push(args);
	});
};


exports.subscribe = function (queueName, handler) {

	if (subscribers[queueName]) {
		subscribers[queueName].handler = handler;
		return subscribers[queueName];
	}

	var wrapper = {
		name:       queueName,
		handler:    handler,
		queue:      null,
		processing: 0,
		_closing:   false,
		start: function () {
			if (wrapper.queue) {
				return;
			}
			return getQueue(queueName).then(function (queue) {
				wrapper.queue = queue;
				queue.on('message', wrapper.process);
				queue.consume();
			});
		},

		stop: function () {
			if (!wrapper.queue) {
				return;
			}
			wrapper.queue.stop();
			wrapper.queue.removeListener('message', wrapper.process);
			wrapper.queue = null;
		},

		process: function (message) {
			if (!Array.isArray(message)) {
				message = [message];
			}

			var done = proxmis();
			done.then(function () {
				wrapper.processing--;
				if (wrapper._closing && wrapper.processing < 1) {
					wrapper._closing();
				}
			});

			message.push(done);

			wrapper.processing++;
			wrapper.handler.apply(null, message);
		},

		close: function () {
			wrapper.stop();
			if (wrapper.processing > 0) {
				return (wrapper.closing = proxmis());
			}
			return Promise.resolve();
		}
	};

	subscribers[queueName] = wrapper;
	return wrapper;
};

exports.shutdown = function () {
	var allSubscribers = Object.keys(subscribers).map(function (queueName) {
		return subscribers[queueName].close();
	});

	var allQueues = Object.keys(queues).map(function (queueName) {
		return queues[queueName];
	});

	return Promise.all(allSubscribers).then(function () {
		return Promise.map(allQueues, function (queue) {
			return new Promise(function (resolve) {
				queue.once('detached', resolve);
				queue.detach();
			});
		});
	}).then(function () {
		return new Promise(function (resolve) {
			bus.once('offline', resolve);
			bus.disconnect();
		});
	});
};

