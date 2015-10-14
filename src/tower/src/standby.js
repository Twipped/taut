
var debug = require('taut.shared/debug')('standby');
var flatten = require('lodash/array/flatten');
var difference = require('lodash/array/difference');

var queue = [];

exports.push = function (userids) {
	if (arguments.length > 1) {
		return exports.push(flatten(Array.prototype.slice.call(arguments)));
	}

	if (!Array.isArray(userids)) {
		return exports.push([userids]);
	}

	userids = difference(userids, queue);

	if (!userids.length) return 0;

	debug('pushed', userids + ' Users');
	return queue.push.apply(queue, userids);
};

exports.shift = exports.pull = function () {
	debug('pulled', '1 User');
	return queue.shift();
};

exports.getLength = function () {
	return queue.length;
};

exports.isEmpty = function () {
	return !queue.length;
};

exports.reset = function () {
	queue = [];
};
