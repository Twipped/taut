'use strict';

module.exports = function listenUntilTrue (emitter, event, callback) {
	if (typeof callback !== 'function') throw new TypeError('You must provide a callback function.');

	var listener = function () {
		if (callback.apply(this, arguments)) {
			emitter.removeListener(event, listener);
		}
	};
	return emitter.on(event, listener);
};
