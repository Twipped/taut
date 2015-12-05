/* eslint-env browser */

define(['socket.io', 'build/version'], function (io, version) {

	if (!io) {
		console.warn('Socket.io did not load, socket server may not be running.');  // eslint-disable-line no-console
		return;
	}

	var lastDirectiveId = 0;
	var url = '//' + document.location.hostname + (
		(document.location.port === 80 || document.location.port === 443) ? '' : ':' + document.location.port
	);
	var socket = io(url);

	var isConnected = false;
	var subscribedFeeds = [];
	socket.subscribe = function (feed, timestamp) {
		if (subscribedFeeds.indexOf(feed) > -1) return;
		subscribedFeeds.push(feed);

		if (isConnected) {
			socket.sendDirective('feed.subscribe', feed, timestamp);
		}
	};

	socket.unsubscribe = function (feed) {
		var i = subscribedFeeds.indexOf(feed);
		subscribedFeeds.splice(i, 1);

		if (isConnected) {
			socket.sendDirective('feed.unsubscribe', feed);
		}
	};


	var hooks = {};
	socket.onDirective = function (name, fn) {
		if (hooks[name]) {
			hooks[name].handler = fn;
			return;
		}

		var hook = {
			name: name,
			handler: fn
		};

		hooks[name] = hook;

		socket.on('directive-request:' + hook.name, function (dir) {
			var args = [socket].concat(dir.arguments);

			Promise.try(function () {
				return hook.handler.apply(socket, args);
			}).then(function (result) {
				socket.emit('directive-reply:' + dir.name + ':' + dir.id, [true, result]);
			}).catch(function (error) {
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

	socket.on('connect', function () {
		isConnected = true;
		// send current frontend version so the server can check for mismatch
		socket.emit('version', version);

		subscribedFeeds.forEach(function (feed) {
			socket.sendDirective('feed.subscribe', feed);
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
