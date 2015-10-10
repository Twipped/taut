
var debug = require('taut.shared/debug')('audit:available-seats');

var config = require('taut.shared/config');
var flights = require('../flights');

var launchFlight = require('../actions/launchFlight');

module.exports = function auditAvailableSeats () {
	var available = flights.availability();

	if (available.totalOpen < config.tower.minimumOpenSeats &&
		available.totalSeats < config.tower.maximumTotalSeats) {
		debug('total open seats below minimum threshold, launching flight');
		return launchFlight();
	}

	if (available.totalOpen > config.tower.maximumOpenSeats) {
		if (available.emptyFlights.length) {
			debug('too many empty flights, closing one');
			available.emptyFlights[0].bus.send('shutdown');
		} else {
			// TO DO: Move connections to empty a flight
		}
	}
};
