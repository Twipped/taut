
var debug = require('taut.shared/debug')('io');
var each = require('lodash/collection/each');
var Promise = require('bluebird');

var socketio = require('socket.io');

var io = socketio();

var globalHooks = {};
io.onDirective = function (name, fn) {
	if (globalHooks[name]) {
		globalHooks[name].handler = fn;
		return;
	}

	globalHooks[name] = {
		name: name,
		handler: fn
	};
};

io.on('connection', function (socket) {
	debug('socket connection', socket.id);

	var lastDirectiveId = 0;
	var hooks = {};
	socket.onDirective = function (name, fn) {
		if (hooks[name]) {
			hooks[name].handler = fn;
			return;
		}

		var hook;
		if (typeof name === 'object') {
			hook = name;
		} else {
			hook = {
				name: name,
				handler: fn
			};
		}

		hooks[name] = hook;

		socket.on('directive-request:' + hook.name, function (dir) {
			var args = [socket].concat(dir.arguments);

			Promise.try(function () {
				return hook.handler.apply(socket, args);
			}).then(function (result) {
				socket.emit('directive-reply:' + dir.name + ':' + dir.id, [true, result]);
			}).catch(function (error) {
				debug.error('Directive rejected', error);
				socket.emit('directive-reply:' + dir.name + ':' + dir.id, [false, error]);
			});
		});
	};

	socket.sendDirective = function (name) {
		var args = Array.prototype.slice.call(arguments, 1);
		var dir = {
			name: name,
			id: ++lastDirectiveId,
			arguments: args
		};

		var p = new Promise(function (resolve, reject) {
			socket.once('directive-reply:' + name + ':' + dir.id, function (packet) {
				if (packet[0]) {
					return resolve(packet[1]);
				}

				return reject(packet[1]);
			});
		});

		socket.emit('directive-request:' + name, dir);

		return p;
	};

	each(globalHooks, function (hook) {
		socket.onDirective(hook);
	});

	socket.on('disconnect', function () {
		debug('socket disconnected', socket.id);
	});

	var onevent = socket.onevent;
	socket.onevent = function (packet) {
		onevent.apply(socket, arguments);
		console.log.apply(console, packet.data || []);
	};
});

require('./connection-counter')(io);
require('./feeds')(io);

module.exports = io;
