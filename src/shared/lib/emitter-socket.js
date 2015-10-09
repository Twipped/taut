
var debug   = require('../debug')('emitter-socket');
var net = require('net');
var JSONStream = require('JSONStream');
var Emitter = require('events').EventEmitter;

exports.createServer = function () {
	var args = Array.prototype.slice.call(arguments);
	var connectionListener;
	if (args.length && typeof args[args.length - 1] === 'function') {
		connectionListener = args.pop();
	}

	var server = net.createServer.apply(net, args);
	server.on('connection', function (socket) {
		var outgoing = JSONStream.stringify();
		outgoing.pipe(socket);
		debug('server connected');

		socket.once('end', function () {
			debug('ended');
		});

		socket.bus = new Emitter();
		socket.bus.send = function () {
			var args = Array.prototype.slice.call(arguments);
			if (typeof args[args.length - 1] === 'function') {
				var cb = args.pop();
				outgoing.write(args, cb);
			} else {
				outgoing.write(args);
			}
			debug.apply(null, ['>'].concat(args));
		};
		socket.bus._outgoing = outgoing;

		socket.pipe(JSONStream.parse('*')).on('data', function (data) {
			if (Array.isArray(data)) {
				debug.apply(null, ['<'].concat(data));
				socket.bus.emit.apply(socket.bus, data);
				socket.bus.emit.apply(socket.bus, ['__all__'].concat(data));
			} else {
				debug('<data', data);
				socket.bus.emit('data', data);
			}
		});

		if (connectionListener) connectionListener(socket);
	});

	return server;
};

exports.connect = function () {
	var socket = net.connect.apply(net, arguments);

	var outgoing = JSONStream.stringify();
	outgoing.pipe(socket);

	socket.once('connect', function () {
		debug('connected');
	});

	socket.bus = new Emitter();
	socket.bus.send = function () {
		var args = Array.prototype.slice.call(arguments);
		if (typeof args[args.length - 1] === 'function') {
			var cb = args.pop();
			outgoing.write(args, cb);
		} else {
			outgoing.write(args);
		}
		debug.apply(null, ['>'].concat(args));
	};
	socket.bus._outgoing = outgoing;

	socket.pipe(JSONStream.parse('*')).on('data', function (data) {
		if (Array.isArray(data)) {
			debug.apply(null, ['<'].concat(data));
			socket.bus.emit.apply(socket.bus, data);
			socket.bus.emit.apply(socket.bus, ['__all__'].concat(data));
		} else {
			debug('<data', data);
			socket.bus.emit('data', data);
		}
	});

	return socket;
};
