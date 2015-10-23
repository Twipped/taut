
var throttle        = require('lodash/function/throttle');
var metrics         = require('taut.shared/metrics');

var flights         = require('../flights');
var standby         = require('../standby');

module.exports = throttle(function () {
	var avail = flights.availability();
	var waiting = standby.getLength();

	metrics.measure('seating.open', avail.totalOpen);
	metrics.measure('seating.capacity', avail.totalSeats);
	metrics.measure('seating.flights.empty', avail.emptyFlights.length);
	metrics.measure('seating.flights.total', avail.totalFlights);
	metrics.measure('seating.waiting', waiting);
}, 30000);
