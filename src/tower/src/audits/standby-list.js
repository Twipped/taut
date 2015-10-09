
var debug = require('finn.shared/debug')('audit:standby-list');
var flights = require('../flights');
var standby = require('../standby');

module.exports = function auditStandbyList () {
	var waiting = standby.getLength();
	if (!waiting) return;

	var openFlights = flights.availability().openFlights;

	debug('found', waiting + ' waiting', openFlights.length + ' available seats');

	while (waiting && openFlights.length) {
		var flight = openFlights.pop();

		var i = flight.metadata.seatsAvailable;
		var userid;
		while (i-- && waiting) {
			userid = standby.shift();
			waiting--;
			debug('opening connection for', userid);
			flight.bus.send('connection:open', userid);
		}
	}
};
