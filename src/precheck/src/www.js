/* eslint no-console:0 */

var http = require('http');

var server;

exports.start = function (listenPort, onPush) {

	server = http.createServer(function (req, res) {
		var params = req.url.split('/').slice(1);
		var username = params[0];
		var port = Number(params[1]) || 6667;

		if (!username || !port) {
			res.statusCode = 400;
			res.end('Request url should be in the form of /username/port');
			return;
		}

		onPush(username, port);
		res.end('ok');
	});

	server.listen(listenPort || 10110, function () {
		console.log('www server running on port', listenPort);
	});
};

exports.shutdown = function (cb) {
	server.close(cb);
};
