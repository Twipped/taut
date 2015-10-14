
var debug      = require('taut.shared/debug')('audits:active-passengers');
var Promise    = require('bluebird');
var difference = require('lodash/array/difference');
var throttle   = require('lodash/function/throttle');

var UserIrcSettings     = require('taut.shared/models/user/irc');
var UserIsViewing       = require('taut.shared/models/user/is-viewing');
var ExpectedConnections = require('taut.shared/models/connections/expected');

var passengers = require('../passengers');
var standby    = require('../standby');

var closeConnection  = require('../actions/closeConnection');
var auditStandbyList = require('./standby-list');

function auditActivePassengers () {
	return Promise.props({
		keepalives: UserIrcSettings.getAllKeepAliveUserIds(),
		expected: ExpectedConnections.get(),
		current: passengers.all()
	}).then(function (data) {

		var missing = difference(data.keepalives, data.expected);
		var nonKeepAlive = difference(data.expected, data.keepalives);

		data.needClosing = Promise.filter(nonKeepAlive, function (userid) {
			return UserIsViewing.get(userid);
		});

		data._expectClosed = data.needClosing.then(function (userids) {
			if (!userids.length) return;
			debug('need to close connections for', userids);
			return Promise.map(userids, closeConnection);
		});

		if (missing.length) {
			debug('expected connections is missing keepalive connections', missing);
			// push the missing ids onto the expected array and add them to the model set
			Array.prototype.push.apply(data.expected, missing);
			data._expectMissing = ExpectedConnections.add(missing);
		}

		// find all the users who should be online but aren't and put them on standby
		missing = difference(data.expected, data.current);
		if (missing.length) {
			debug('missing connections for users expected to be online', missing);
			standby.push(missing);
		}

		if (!standby.isEmpty()) {
			data._expectStandby = auditStandbyList();
		}

		return Promise.props(data);
	});
}

module.exports = throttle(auditActivePassengers, 5000);
