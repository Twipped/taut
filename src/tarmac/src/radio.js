
var config        = require('taut.shared/config');
var debug         = require('taut.shared/debug')('radio');
var pkg           = require('taut.shared/pkg');
var emittersocket = require('taut.shared/lib/emitter-socket');
var random        = require('taut.shared/lib/random');
var Emitter       = require('events').EventEmitter;
var Timer         = require('taut.shared/lib/timer');
var Promise       = require('bluebird');


var callsign = random(16);
var client;

module.exports = exports = new Emitter();

exports.send = function send () {
	if (!client) return false;

	client.bus.send.apply(client.bus, arguments);
};

var retryTimer = new Timer(30000, connect).repeating();

function connect () {
	if (client) return;
	debug('connecting to tower');

	var timeout = setTimeout(function () {
		if (!client) return;
		debug('connection timed out');

		client.destroy();
		client = null;
	}, 10000);

	client = emittersocket.connect(config.tarmac.control, function () {
		clearTimeout(timeout);
		retryTimer.stop();
		debug('connected with tower');

		client.bus.on('__all__', function () {
			debug.apply(null, arguments);
			exports.emit.apply(exports, arguments);
		});

		client.bus.send('identification', callsign, pkg.version);
	});

	client.on('error', function (err) {
		client = null;
		clearTimeout(timeout);
		if (err.code === 'ECONNREFUSED') {
			debug('connection rejected', err.address, err.port);
			return;
		}

		debug('connection error', err);
	});

	client.on('end', function () {
		// if connection was killed by a predicate, ignore
		if (!client) return;

		debug('lost connection to tower');
		client = null;
		retryTimer.start(true);
	});
}

exports.start = function () {
	debug('starting');
	retryTimer.start(true);

	var pubsub = require('taut.shared/io/pubsub');
	pubsub.channel('tower:control').on('online', function () {
		debug('tower says it is online, reconnecting');
		if (client) {
			client.end();
			client = null;
		}

		connect();
	});
};

exports.shutdown = function () {
	debug('shutting down');
	retryTimer.stop();
	if (!client) return Promise.resolve();

	return Promise.fromNode(function (callback) {
		client.bus.send('shutdown');
		client.end(callback);
	});
};


