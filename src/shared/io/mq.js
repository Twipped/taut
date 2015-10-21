'use strict';

var config = require('../config');
var debug = require('../debug')('mq');

var Promise = require('bluebird');
var proxmis = require('proxmis');

var bus;
var queues = {};
var subscribers = {};

function getQueue (name) {
	// self initialization
	if (!bus) exports();

	if (queues[name]) {
		return queues[name];
	}

	return (queues[name] = exports.ready.then(function () {
		return new Promise(function (resolve) {
			debug('opening queue', name);
			var queue = bus.queue(name);
			queue.once('attached', function () {
				debug('queue attached', name);
				resolve(queue);
			});
			queue.attach({ ttl: 60 * 60 });
		});
	}));
}

var ready = null;

function notReady () {
	ready = proxmis();
	exports.ready = ready.promise;
}

module.exports = exports = function () {
	if (bus) return;

	bus = require('busmq').create(config.io.mq);

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
	return exports;
};

exports.ready = null;
notReady();


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
		debug('emitting', queueName, args[0]);

		return Promise.fromNode(function (p) {
			queue.push(JSON.stringify(args), p);
		});
	});
};


exports.subscribe = function (queueName, handler) {

	if (subscribers[queueName]) {
		debug('replacing subscriber', queueName);
		subscribers[queueName].handler = handler;
		return subscribers[queueName];
	}

	debug('creating subscriber', queueName);
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
			debug('starting subscriber', queueName);
			return getQueue(queueName).then(function (queue) {
				wrapper.queue = queue;
				queue.on('message', wrapper.process);
				queue.consume();
			});
		},

		stop: function () {
			debug('stopping subscriber', queueName);
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

			debug('received message', queueName, message);

			wrapper.processing++;

			Promise.try(wrapper.handler, message)
				.catch(debug.error.bind(null, 'Subscriber rejected'))
				.then(function finished () {
					wrapper.processing--;
					if (wrapper._closing && wrapper.processing < 1) {
						wrapper._closing();
					}
				});
		},

		close: function () {
			debug('closing subscriber', queueName);
			wrapper.stop();
			wrapper.handler = null;
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
