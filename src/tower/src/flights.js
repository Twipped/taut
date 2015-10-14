
var debug  = require('taut.shared/debug')('flights');
var each   = require('lodash/collection/each');
var values = require('lodash/object/values');
var alert  = require('taut.shared/alert');

var auditEmptyChannels    = require('./audits/empty-channels');
var auditActivePassengers    = require('./audits/active-passengers');
var channelLoggingStarted = require('./actions/channelLoggingStarted');

var passengers = require('./passengers');
var channels   = require('./channels');
var flights    = {};

exports.waiting = 0;

exports.get = function (flightid) {
	return flights[flightid];
};

exports.add = function (flightid, flight) {
	flights[flightid] = flight;

	flight.metadata = {
		flightid: flightid,
		seatsFilled: 0,
		seatsAvailable: 0,
		seatsTotal: 0,
	};

	flightOnline(flightid, flight, flight.metadata, flight.bus);
};

exports.remove = function (flightid) {
	if (flights[flightid]) {
		delete !flights[flightid];
	}
};

exports.reset = function () {
	flights = {};
};

exports.all = function () {
	return values(flights);
};

exports.availability = function () {
	var results = {
		totalOpen: 0,
		totalSeats: 0,
		emptyFlights: [],
		openFlights: []
	};

	each(flights, function (flight) {
		var metadata = flight.metadata;

		results.totalOpen += metadata.seatsAvailable;
		results.totalSeats += metadata.seatsTotal;
		results.openFlights.push(flight);

		if (metadata.seatsFilled === 0) {
			results.emptyFlights.push(flight);
		}
	});

	return results;
};


function flightOnline (flightid, socket, metadata, radio) {
	debug('flight is airborn', flightid);
	metadata.availableSeats = 0;

	radio.on('counts', function (occupied, available) {
		debug('received counts', flightid, occupied, available);
		metadata.seatsFilled = occupied;
		metadata.seatsAvailable = available;
		metadata.seatsTotal = occupied + available;
	});

	radio.on('connection:exists', function (userid, userChannels) {
		debug('seated passenger', flightid, userid, userChannels.length + ' channels');
		passengers.add(flightid, userid);
		channels.add(userid, userChannels);
	});

	radio.on('connection:starting', function (userid) {
		debug('passenger boarding', flightid, userid);
		passengers.add(flightid, userid);
	});

	radio.on('connection:online', function (userid) {
		debug('passenger seated', flightid, userid);
		// passengers.add(flightid, userid);
	});

	radio.on('connection:joinChannel', function (userid, channelName) {
		debug('passenger joined channel', flightid, userid, channelName);
		channels.add(channelName, userid);
		if (channels.get(channelName).length === 1) {
			channelLoggingStarted(channelName);
		}
	});

	radio.on('connection:leaveChannel', function (userid, channelName) {
		debug('passenger left channel', flightid, userid, channelName);
		channels.remove(channelName, userid);
		auditEmptyChannels(channelName);
	});

	radio.on('connection:offline', function (userid) {
		debug('passenger disembarked', flightid, userid);
		passengers.remove(flightid, userid);
		var occupied = channels.remove(true, userid);
		auditEmptyChannels(occupied);
	});

	var safeShutdown = false;
	radio.on('shutdown', function () {
		debug('flight shutting down', flightid);
		safeShutdown = true;
	});

	socket.safeShutdown = function () {
		safeShutdown = true;
		socket.end();
	};

	socket.on('end', function () {
		// remove the flight from the collection
		exports.remove(flightid);

		// if the flight announced it was clear then we're fine
		if (safeShutdown) return;

		debug.error('flight crashed', flightid);

		// find the passengers lost in that crash
		var dead = passengers.crashed(flightid);

		alert('flight crashed', dead.length + ' dead');

		// remove those passengers from all channels
		channels.remove(true, dead);

		auditEmptyChannels();
		auditActivePassengers();

	});

	if (exports.waiting) {
		exports.waiting--;
		auditActivePassengers();
	}
}
