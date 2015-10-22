
var debug    = require('taut.shared/debug')('audit:available-seats');
var throttle = require('lodash/function/throttle');

var config   = require('taut.shared/config');
var flights  = require('../flights');

var launchFlight = require('../actions/launchFlight');

function auditAvailableSeats () {
	var available = flights.availability();

	if (available.totalOpen < config.tower.minimumOpenSeats &&
		available.totalSeats < config.tower.maximumTotalSeats) {
		debug('total open seats below minimum threshold, launching flight');
		flights.waiting++;
		return launchFlight();
	}
}

module.exports = throttle(auditAvailableSeats, 10000);
