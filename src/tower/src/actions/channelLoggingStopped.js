
var mq  = require('taut.shared/io/mq');

module.exports = function (target) {
	return mq.emit('irc:incoming', 'public', 'logging:halted', target.toLowerCase(), {
		event: 'logging:halted',
		target: target.toLowerCase(),
		userid: 'TOWER',
		connid: 'TOWER',
		timestamp: Date.now()
	});
};
