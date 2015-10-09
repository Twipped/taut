
var debug = require('finn.shared/debug')('standby');

var queue = [];

exports.push = function () {
	if (arguments.length === 1 && Array.isArray(arguments[0])) {
		debug('pushed', arguments[0].length + ' Users');
		return arguments[0].length && queue.push.apply(queue, arguments[0]);
	}

	debug('pushed', arguments.length + ' Users');
	return arguments.length && queue.push.apply(queue, arguments);
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
