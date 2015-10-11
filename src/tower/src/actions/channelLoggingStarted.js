
var mq  = require('taut.shared/io/mq');

module.exports = function (target) {
	return mq.emit('irc:incoming', 'public', 'logging:started', target.toLowerCase(), {
		event: 'logging:started',
		target: target.toLowerCase(),
		userid: 'TOWER',
		connid: 'TOWER',
		timestamp: Date.now()
	});
};
