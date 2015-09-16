'use strict';

var Redis = require('ioredis');
var Emitter = require('events').EventEmitter;

function RedisEmitter (redisConfig) {
	this._emitters = {};

	this._incoming = new Redis(redisConfig);
	this._outgoing = new Redis(redisConfig);

	this.prefix = 'RedisEmitter:';

	this._incoming.on('message', this._receive.bind(this));
}

RedisEmitter.prototype.channel = function (channel) {
	return this._emitters[channel] || this._makeEmitter(channel);
};

RedisEmitter.prototype._makeEmitter = function (channel) {
	var self = this;
	var prefix = this.prefix;

	var e = new Emitter();
	e._emit = e.emit;
	e.emit = function () {
		var args = Array.prototype.slice.call(arguments);
		return self._outgoing.publish(prefix + channel, JSON.stringify(args));
	};

	this._incoming.subscribe(prefix + channel);

	return this._emitters[channel] = e;
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
		emitter._emit.apply(emitter, message);
	} catch (e) {
		emitter._emit('error', new Error('Unparsable message received: "' + message + '" (' + e.message + ')'));
	}
};

RedisEmitter.prototype.quit = function (cb) {
	var i = 2;
	function finished () {
		if (i>0) return;

		if (cb) cb();
	}

	this._incoming.quit(finished);
	this._outgoing.quit(finished);
};

module.exports = RedisEmitter;
