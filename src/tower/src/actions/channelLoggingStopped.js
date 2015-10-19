
var mq  = require('taut.shared/io/mq');

module.exports = function (target) {
	return mq.emit('irc:incoming', 'public', 'logging:stopped', target.toLowerCase(), {
		event: 'logging:stopped',
		target: target.toLowerCase(),
		userid: 'TOWER',
		connid: 'TOWER',
		timestamp: Date.now()
	});
};
