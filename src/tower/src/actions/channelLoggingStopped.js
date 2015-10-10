
var mq  = require('taut.shared/io/mq');

module.exports = function (target) {
	return mq.emit('irc:incoming', 'public', 'logging:halted', target, {
		event: 'logging:halted',
		userid: 'TOWER',
		connid: 'TOWER',
		timestamp: Date.now()
	});
};
