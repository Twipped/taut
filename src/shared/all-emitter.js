'use strict';

var Emitter = require('events').EventEmitter;
var slice = Array.prototype.slice;

module.exports = function (target) {
	if (!target) {target = new Emitter();}
	if (target.proxyTo) {return target;}

	var oldEmit = target.emit;
	target._proxies = [];

	target.emit = function () {
		oldEmit.apply(target, arguments);

		var args = ['all'].concat(Array.prototype.slice.call(arguments));
		oldEmit.apply(target, args);

		var i = target._proxies.length;
		while (i-- > 0) {
			target._proxies[i].fn.apply(target, arguments);
		}
	};

	target.proxyTo = function (destination, options) {
		options = options || {};
		options = {
			prefix: options.prefix || '',
			suffix: options.suggix || ''
		};

		target._proxies.unshift({
			destination: destination,
			fn: function () {
				var args = slice.call(arguments);
				args[0] = options.prefix + args[0] + options.suffix;
				destination.emit.apply(destination, args);
			}
		});
	};

	return target;
};
