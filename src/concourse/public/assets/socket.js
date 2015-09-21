
define(['socket.io', 'build/version'], function (io, version) {

	if (!io) {
		console.warn('Socket.io did not load, socket server may not be running.');
		return;
	}

	var socket = io('//' + document.location.hostname + (document.location.port === 80 || document.location.port === 443 ? '' : ':' + document.location.port));

	var isConnected = false;
	var subscribedFeeds = [];
	socket.subscribe = function (feed) {
		if (subscribedFeeds.indexOf(feed) > -1) return;
		subscribedFeeds.push(feed);

		if (isConnected) {
			socket.emit('feed.subscribe', feed);
		}
	};

	socket.on('connect', function () {
		isConnected = true;
		// send current frontend version so the server can check for mismatch
		socket.emit('version', version);

		subscribedFeeds.forEach(function (feed) {
			socket.emit('feed.subscribe', feed);
		});
	});

	socket.on('disconnect', function () {
		isConnected = false;
	});

	socket.on('shutdown', function () {
		socket.close();
	});

	var onevent = socket.onevent;
	socket.onevent = function (packet) {
		onevent.apply(socket, arguments);
		console.log.apply(console, packet.data || []);
	};

	return socket;
});
