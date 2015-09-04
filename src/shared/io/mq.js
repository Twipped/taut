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
	debug('bus has gone offline');
	notReady();
	queues = {};
});

bus.connect();


function getQueue (name) {
	if (queues[name]) {
		return Promise.resolve(queues[name]);
	}

	return exports.ready.then(function () {
		return new Promise(function (resolve) {
			var queue = queues[name] = bus.queue(name);
			queue.once('attached', function () {
				resolve(queue);
			});
			queue.attach({ttl: 60 * 60});
		});
	});
}

exports.getQueue = getQueue;

exports.getLength = function (queueName) {
	return getQueue(queueName).then(function (queue) {
		return Promise.fromNode(function (p) {
			queue.count(p);
		});
	});
};

exports.emit = function (queueName) {
	var args = Array.prototype.slice.call(arguments, 1);
	return getQueue(queueName).then(function (queue) {
		return Promise.fromNode(function (p) {
			queue.push(JSON.stringify(args), p);
		});
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
			message = JSON.parse(message);

			if (!Array.isArray(message)) {
				message = [message];
			}

			// create the done callback for determining jobs in progress
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
				return (wrapper._closing = wrapper._closing || proxmis());
			}
			return Promise.resolve();
		}
	};

	subscribers[queueName] = wrapper;
	return wrapper;
};

exports.shutdown = function () {
	debug('shutting down');

	function settleSubscribers () {
		debug('settling subscribers');
		return Promise.settle(Object.keys(subscribers).map(function (queueName) {
			return subscribers[queueName].close();
		}));
	}

	function settleQueues () {
		debug('settling queues');
		return Promise.settle(Object.keys(queues).map(function (queueName) {
			var queue = queues[queueName];
			return new Promise(function (resolve) {
				queue.once('detached', resolve);
				queue.detach();
			});
		}));
	}

	return exports.ready.then(settleSubscribers).then(settleQueues).then(function () {
		debug('disconnecting bus');
		return new Promise(function (resolve) {
			bus.once('offline', resolve);
			bus.disconnect();
		});
	});
};

