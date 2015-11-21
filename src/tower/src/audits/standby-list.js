
var debug           = require('taut.shared/debug')('audit:standby-list');
var flights         = require('../flights');
var standby         = require('../standby');
var isFrequentFlier = require('../is-frequent-flier');

module.exports = function auditStandbyList () {
	var waiting = standby.getLength();
	flights.waiting = waiting;
	if (!waiting) return;

	var availability = flights.availability();

	debug('found', waiting + ' waiting', availability.totalOpen + ' available seats');

	while (waiting && availability.openFlights.length) {
		var flight = availability.openFlights.pop();

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

	flights.waiting = waiting;
};
