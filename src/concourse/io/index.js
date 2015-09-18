
var debug = require('finn.shared/debug')('io');

var socketio = require('socket.io');

var io = socketio();

io.on('connection', function (socket) {
	debug('socket connection', socket.id);

	socket.on('disconnect', function (socket) {
		debug('socket disconnected', socket.id);
	});
});

module.exports = io;
