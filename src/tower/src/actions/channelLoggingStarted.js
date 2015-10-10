
var mq  = require('taut.shared/io/mq');

module.exports = function (target) {
	return mq.emit('irc:incoming', 'public', 'logging:started', target, {
		event: 'logging:started',
		userid: 'TOWER',
		connid: 'TOWER',
		timestamp: Date.now()
	});
};
