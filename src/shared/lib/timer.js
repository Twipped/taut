'use strict';

var Emitter = require('events').EventEmitter;

function Timer (delay, callback) {
	if (!this) return new Timer();
	Emitter.call(this);

	this._pointer = null;
	this._lastCall = null;
	this._count = 0;

	if (typeof delay === 'function') {
		this._delay = 0;
		this._callback = callback;
	} else {
		this._delay = delay;
		this._callback = callback;
	}

	this._async = this._callback.length > 0;
	this._repeating = false;
}

Timer.prototype = Object.create(Emitter.prototype);

Timer.prototype.delay = function (delay) {
	this._delay = delay;
	return this;
};

Timer.prototype.repeating = function (yes) {
	this._repeating = (yes || typeof yes === 'undefined');
	return this;
};

Timer.prototype.async = function (yes) {
	this._async = (yes || typeof yes === 'undefined');
	return this;
};

Timer.prototype.max = function (total) {
	this._max = total;
	return this;
};

Timer.prototype.start = function (fireBefore) {
	if (this._pointer) {
		this.stop();
	}

	if (fireBefore) {
		this._tick();
	} else {
		this._tock();
	}

	this.emit('started');
	return this;
};

Timer.prototype.stop = function () {
	if (!this._pointer) {return this;}
	clearTimeout(this._pointer);
	this._pointer = undefined;
	this.emit('stopped');
};

Timer.prototype.close = function () {
	this.stop();
	this._callback = undefined;
};

Timer.prototype._tick = function () {
	this._count++;
	this._pointer = undefined;

	this.emit('tick');

	if (!this._repeating) {return;}

	var self = this;
	if (this._async) {
		this._callback(function () {
			self._tock();
		});
	} else {
		this._callback();
		this._tock();
	}
};

Timer.prototype._tock = function () {
	if (this._count >= this._max) {return;}

	this.emit('tock');

	var self = this;
	this._lastCall = Date.now();
	this._pointer = setTimeout(function () {
		self._tick();
	}, this._delay);
};

module.exports = Timer;
