
var each = require('lodash/collection/each');
var throttle = require('lodash/function/throttle');
var bss = require('binary-sorted-set');

var byTarget = {};

var TIMEOUT = 1 * 60000;

function getTargetEvents (target) {
	if (!byTarget[target]) {
		byTarget[target] = bss(eventSorter);
	}

	return byTarget[target];
}

function eventSorter (a, b) {
	if (a.timestamp > b.timestamp) return 1;
	if (b.timestamp > a.timestamp) return -1;

	if (a.hash > b.hash) return 1;
	if (b.hash > a.hash) return -1;

	return 0;
}

function cleanup_ () {
	var expires = Date.now() - TIMEOUT;
	each(byTarget, function (targetEvents) {
		var events = targetEvents.array;
		while (events.length && events[0].timestamp < expires) {
			targetEvents.rm(events[0]);
		}
	});
}
var cleanup = throttle(cleanup_, 5000);

function push (event) {
	if (Array.isArray(event)) {
		return each(event, push);
	}

	//if the event is older than 30 seconds, ignore it.
	if (event.timestamp < Date.now() - TIMEOUT) {
		return;
	}

	var targetEvents = getTargetEvents(event.target);

	if (!targetEvents.has(event)) {
		targetEvents.add(event);
	}

	cleanup();
}

function get (target) {
	// concat the array so we get a new array.
	return getTargetEvents(target).array.concat();
}

exports.push = push;
exports.get = get;
