'use strict';

var debug   = require('../debug')('redis-emitter');
var Redis   = require('ioredis');
var Emitter = require('events').EventEmitter;


function RedisEmitter (redisConfig) {
	this._emitters = {};

	this._incoming = new Redis(redisConfig);
	this._outgoing = new Redis(redisConfig);

	this._incoming.once('ready', function () {
		debug('incoming ready');
	});

	this._outgoing.once('ready', function () {
		debug('outgoing ready');
	});

	this.prefix = 'RedisEmitter:';

	this._incoming.on('message', this._receive.bind(this));
}

RedisEmitter.prototype.channel = function (channel) {
	return this._emitters[channel] || this._makeEmitter(channel);
};

RedisEmitter.prototype._makeEmitter = function (channel) {
	var self = this;
	var prefix = this.prefix;

	debug('made emitter', channel);
	var e = new Emitter();
	e.publish = function () {
		var args = Array.prototype.slice.call(arguments);
		debug('>', channel, args[0]);
		return self._outgoing.publish(prefix + channel, JSON.stringify(args));
	};

	// Don't subscribe to the redis channel until this emitter has listeners.
	var subscriberCount = 0;
	e.on('removeListener', function () {
		subscriberCount--;
		if (subscriberCount === 0) {
			debug('unsubscribing', prefix + channel);
			self._incoming.unsubscribe(prefix + channel);
		}

		// this shouldn't happen, but just in case...
		if (subscriberCount < 0) {
			subscriberCount = 0;
		}
	});

	e.on('newListener', function () {
		if (subscriberCount === 0) {
			debug('subscribing', prefix + channel);
			self._incoming.subscribe(prefix + channel);
		}

		subscriberCount++;
	});

	this._emitters[channel] = e;
	return e;
};

RedisEmitter.prototype.to = RedisEmitter.prototype.channel;

RedisEmitter.prototype.on = function (channel, event, fn) {
	return this.channel(channel).on(event, fn);
};

RedisEmitter.prototype._receive = function (channel, message) {
	channel = channel.replace(this.prefix, '');

	var emitter = this._emitters[channel];

	// received a message for a channel we didn't subscribe to?
	if (!emitter) return;

	try {
		message = JSON.parse(message);
		debug('<', channel, message[0]);
		emitter.emit.apply(emitter, message);
		emitter.emit.apply(emitter, ['_all'].concat(message));
	} catch (e) {
		emitter.emit('error', new Error('Unparsable message received: "' + message + '" (' + e.message + ')'));
	}
};

RedisEmitter.prototype.quit = function (cb) {
	debug('quitting');
	var i = 2;
	function finished () {
		if (--i > 0) return;

		debug('quit complete');
		if (cb) return cb();
	}

	this._incoming.quit(finished);
	this._outgoing.quit(finished);
};

module.exports = RedisEmitter;
