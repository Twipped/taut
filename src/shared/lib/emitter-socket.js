
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

		socket.bus = new Emitter();
		socket.bus.send = function () {
			outgoing.write(Array.prototype.slice.call(arguments));
		};

		socket.pipe(JSONStream.parse('*')).on('data', function (data) {
			if (Array.isArray(data)) {
				socket.bus.emit.apply(socket.bus, data);
			} else {
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

	socket.bus = new Emitter();
	socket.bus.send = function () {
		outgoing.write(Array.prototype.slice.call(arguments));
	};

	socket.pipe(JSONStream.parse('*')).on('data', function (data) {
		if (Array.isArray(data)) {
			socket.bus.emit.apply(socket.bus, data);
		} else {
			socket.bus.emit('data', data);
		}
	});

	return socket;
};
