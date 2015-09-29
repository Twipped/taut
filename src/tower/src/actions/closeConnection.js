
var debug      = require('finn.shared/debug')('actions:closeConnection');
var flights    = require('../flights');
var passengers = require('../passengers');

module.exports = function closeConnection (userid) {
	var flightid = passengers.find(userid);
	if (!userid) {
		// huh?
		debug('could not find flightid for', userid);
		return;
	}

	var flight = flights.get(flightid);
	if (!flight) {
		// wat?
		debug('could not find flight for', flightid, userid);
	}

	debug('dispatching', userid);
	flight.bus.send('connection:close', userid);
};
