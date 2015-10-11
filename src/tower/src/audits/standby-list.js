
var debug = require('taut.shared/debug')('audit:standby-list');
var flights = require('../flights');
var standby = require('../standby');
var isFrequentFlier = require('../is-frequent-flier');

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

			if (isFrequentFlier(userid)) {
				debug.error('user has reconnected too many times', userid);
			} else {
				debug('opening connection for', userid);
				flight.bus.send('connection:open', userid);
			}
		}
	}
};
