
var config        = require('taut.shared/config');
var debug         = require('taut.shared/debug')('control');
var Promise       = require('bluebird');
var emittersocket = require('taut.shared/lib/emitter-socket');
var pubsub        = require('taut.shared/io/pubsub');
var Timer         = require('taut.shared/lib/timer');

var auditActivePassengers = require('./src/audits/active-passengers');

var flights = require('./src/flights');

var auditTimer = new Timer(30000, function () {
	debug('audit timer');
	auditActivePassengers();
}).repeating();


var control;
exports.start = function () {
	debug('starting');

	control = emittersocket.createServer(function (socket) {
		debug('flight spotted');
		socket.flight = {};

		// if the socket doesn't send its ID within 10 seconds, hang up.
		var waiting = setTimeout(function () {
			socket.end();
		}, 10000);

		var bus = socket.bus;
		bus.once('identification', function (id, version) { // eslint-disable-line no-unused-vars
			debug('flight identified', id, version);

			socket.flightid = id;
			flights.add(id, socket);
			clearTimeout(waiting);
			waiting = null;

			socket.bus.send('identified');
		});
	});

	control.listen(config.tower.control.port, config.tower.control.host, function () {
		debug('online', 'waiting ' + config.tower.launchWait + ' seconds');
		pubsub.channel('tower:control').publish('online');

		// wait 30 seconds for all workers to identify, then start assigning connections
		setTimeout(function () {
			debug('ready');
			auditTimer.start(true);
		}, config.tower.launchWait * 1000);
	});
};

function shutdownControl () {
	return Promise.fromNode(function (cb) {
		debug('stopping');
		control.close(cb);
		flights.all().forEach(function (flight) {
			flight.safeShutdown();
		});
	}).then(debug.bind(null, 'stopped'));
}

exports.shutdown = function () {
	auditTimer.close();
	return shutdownControl();
};
