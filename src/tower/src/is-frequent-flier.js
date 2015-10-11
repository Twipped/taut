
var config = require('taut.shared/config');
var debug = require('taut.shared/debug')('frequent-fliers');

var passengers = {};

var TOO_SOON = config.tower.maximumReconnect.timeout || 60000 * 5;
var TOO_MANY = config.tower.maximumReconnect.count || 3;

module.exports = function (userid) {
	if (!passengers[userid]) {
		passengers[userid] = [Date.now()];
		return false;
	}

	var stack = passengers[userid];
	var expired = Date.now() - TOO_SOON;
	while (stack.length && stack[0] < expired) {
		stack.shift();
	}

	if (stack.length >= TOO_MANY) {
		return true;
	}

	stack.push(Date.now());
	return false;
}