var metrics         = require('taut.shared/metrics');

module.exports = function (io) {

	var connectionCounter = 0;

	io.on('connection', function (socket) {
		connectionCounter++;
		metrics.measure('websockets.open', io.connectionCounter);

		socket.on('disconnect', function () {
			connectionCounter--;
			metrics.measure('websockets.open', io.connectionCounter);
		});

	});

};
