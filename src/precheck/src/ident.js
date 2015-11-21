/* eslint no-console:0 */

var net = require('net');
var split = require('split');

var server;
var queue = [];

exports.start = function (listenPort) {

	server = net.createServer(function (socket) {
		console.log('ident connected');
		socket.pipe(split()).on('data', function (line) {
			if (!line) return;

			// console.log('received [', line, ']');
			var port = line.split(',')[0];
			port = port && String(port).trim();
			port = parseFloat(port);

			var username = pull(port);

			if (!username) {
				socket.end(line.trim() + ' : ERROR : NO-USER\r\n');
			} else {
				socket.end(line.trim() + ' : USERID : UNIX : ' + username + '\r\n');
			}
			console.log('ident received for port', port, 'replied with', username);
		});
	});

	server.listen(listenPort || 10113, function () {
		console.log('ident server running on port', listenPort);
	});
};

exports.shutdown = function (cb) {
	server.close(cb);
};

exports.push = function (username, port) {
	console.log('ident pushing', username, port);
	queue.push({
		username: username,
		port: parseFloat(port),
		time: Date.now()
	});
};

function pull (port) {
	cleanup();
	var i = -1;
	while (++i < queue.length) {
		if (queue[i].port === port) {
			var uname = queue[i].username
			queue.splice(i, 1);
			return uname;
		}
	}
	return false;
}

function cleanup () {
	var expires = Date.now() - 5000;
	while (queue[0] && queue[0].time < expires) queue.shift();
}
