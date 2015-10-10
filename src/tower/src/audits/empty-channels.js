
var debug = require('taut.shared/debug')('audit:empty-channels');

var channelLoggingStopped = require('../actions/channelLoggingStopped');
var channels = require('../channels');

module.exports = function auditEmptyChannels (target) {

	if (target) {
		if (Array.isArray(target)) return target.forEach(auditEmptyChannels);

		var channel = channels.get(target);
		if (channel && !channel.length) {
			debug('deactivating', target);
			channels.remove(target);
			channelLoggingStopped(target);
		}
		return;
	}

	var nowEmpty = channels.getEmptyChannels();
	if (!nowEmpty.length) return;

	channels.remove(nowEmpty);
	debug('deactivating', nowEmpty);
	nowEmpty.forEach(channelLoggingStopped);
};
