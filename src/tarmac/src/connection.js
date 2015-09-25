'use strict';

var assign = require('lodash/object/assign');
var each   = require('lodash/collection/each');
var debug  = require('finn.shared/debug')('controller');
var random = require('finn.shared/lib/random');
var IRC    = require('ircsock');
var pluginChannelTracking = require('ircsock/plugins/channels');
var mq     = require('finn.shared/io/mq');
var Timer  = require('finn.shared/lib/timer');

var model = {
	user: {
		connection: require('finn.shared/models/user/irc/connection'),
	},
	connection: {
		user: require('finn.shared/models/connection'),
		channels: require('finn.shared/models/connection/channels')
	}
};

var nickservPatterns = {
	requested: /^This nickname is registered. Please choose a different nickname/,
	success: /^You are now identified for (.+)\.$/,
	failed:  /^Invalid password for (.+)\./,
	failureCount: /(\d+) failed login since last login\./,
	lastFailed: /^Last failed attempt from: (.+) on (.+)\./
};

var connectionsByUser = {};

module.exports = exports = function (user, doNotConnect) {
	var connid = random(10);

	debug('created', connid, user);

	var irc = new IRC(assign({
		name: 'Freenode',
		host: 'irc.freenode.net',
		port: 6667,
		ssl: false,
		nickname: 'finner' + Math.round(Math.random() * 100),
		username: 'username',
		realname: 'realname',
		password: null
	}, user));
	irc.id = connid;
	irc.user = user;

	irc.use(pluginChannelTracking());

	connectionsByUser[user.id] = irc;

	var heartbeat = new Timer(30000, function () {
		debug('heartbeat', irc.nick);
		model.user.connection.set(user.id, connid);
		model.connection.user.set(connid, user.id);
	}).repeating();

	var receiver = mq.subscribe('irc:outgoing:' + user.id, function (action) {
		var command = action.command;
		var args = action.arguments;

		if (action.expires && action.expires < Date.now()) return;

		if (typeof irc[command] !== 'function') {
			debug.error('Received outgoing command that does not exist.', command);
			return;
		}
		irc[command].apply(irc, args);

		debug.apply(null, ['sent ' + command].concat(args));
	});

	function scopeData (event, data) {
		return assign({
			event: event,
			userid: user.id,
			connid: connid,
			timestamp: Date.now()
		}, data);
	}

	function emitPublic (event, data) {
		debug('received public ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'public', event, data.target, scopeData(event, data));
	}

	function emitPrivate (event, data) {
		debug('received private ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'private', event, user.id, scopeData(event, data));
	}

	function emitSystem (event, data) {
		debug('received system ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'system', event, scopeData(event, data));
	}

	irc.on('connecting', debug.bind('connecting', connid));
	irc.on('connect', debug.bind('connected', connid));

	irc.on('welcome', function (nickname) {
		heartbeat.start(true);
		emitPrivate('welcome', { nickname: nickname });
	});

	irc.on('motd', function (motd) {
		emitPrivate('motd', { motd: motd });
	});

	irc.on('whois', function (whois) {
		emitSystem('whois', whois);
	});

	irc.on('join', function (ev) {
		if (ev.isSelf) {
			emitSystem('join', ev);
		}
		emitPublic('join', ev);
	});

	irc.on('part', function (ev) {
		if (ev.isSelf) {
			emitSystem('part', ev);
		}
		emitPublic('part', ev);
	});

	irc.on('kick', function (ev) {
		if (ev.isSelf) {
			emitSystem('kick', ev);
		}
		emitPublic('kick', ev);
	});

	irc.on('quit:self', function (ev) {
		emitSystem('quit', ev);
	});

	irc.on('quit:channel', function (ev) {
		emitPublic('quit', ev);
	});

	irc.on('nick:self', function (ev) {
		emitSystem('nick', ev);
	});

	irc.on('nick:channel', function (ev) {
		emitPublic('nick', ev);
	});

	irc.on('names', function (ev) {
		emitSystem('names', ev);
	});

	irc.on('mode:channel', function (ev) {
		if (ev.isSelf) {
			emitSystem('mode:channel', ev);
		}
		emitPublic('mode:channel', ev);
	});

	irc.on('notice', function (ev) {
		if (ev.server) { // server broadcast
			emitPrivate('notice', ev);
		} else if (ev.toSelf) { // private query
			emitPrivate('notice', ev);
		} else { // channel message
			emitPublic('notice', ev);
		}
	});

	irc.on('privmsg', function (ev) {
		if (ev.toSelf) { // private query
			emitPrivate('privmsg', ev);
		} else { // channel message
			emitPublic('privmsg', ev);
		}
	});

	irc.on('action', function (ev) {
		if (ev.toSelf) { // private query
			emitPrivate('privmsg', ev);
		} else { // channel message
			emitPublic('privmsg', ev);
		}
	});

	irc.on('ctcp', function (ev) {
		if (ev.toSelf) { // private query
			emitPrivate('privmsg', ev);
		} else { // channel message
			emitPublic('privmsg', ev);
		}
	});

	irc.on('topic', function (ev) {
		if (ev.nick) {
			emitPublic('topic', ev);
		} else {
			emitSystem('topic', ev);
		}
	});

	irc.on('topic:time', function (ev) {
		emitSystem('topic', ev);
	});


	function handleReply (type, data) {
		data = assign({type: type}, data);
		emitSystem('reply', data);
	}

	irc.on('RPL', handleReply);
	irc.on('ERR', handleReply);

	irc.on('end', function () {
		delete connectionsByUser[user.id];

		heartbeat.stop();
		receiver.stop();

		model.user.connection.clear(user.id);
		model.connection.user.clear(connid);

		emitSystem('disconnect', 'ended');
	});

	irc.on('tarmac:shutdown', function () {
		model.user.connection.clear(user.id);
		model.connection.user.clear(connid);
		emitSystem('shutdown', {
			channels: Object.keys(irc.channels)
		});
	});

	// setup nickserv handling
	irc.on('privmsg', function (ev) {
		if (!ev.toSelf || ev.nick !== 'nickserv' || ev.username !== 'NickServ') {return false;}

		// loop through the nickserv message patterns and emit any matches as nickserv:<patternName> events
		each(nickservPatterns, function (key) {
			var pattern = nickservPatterns[key];
			var match = ev.message.match(pattern);
			if (!match) return;

			var args = ['nickserv:' + key].concat(Array.prototype.slice.call(match, 1));
			emitPrivate.apply(null, args);
			irc.emit.apply(irc, args);
		});
	});

	irc.on('nickserv:requested', function () {
		if (user.nickserv && user.nickserv[irc.nick]) {
			irc.emit('nickserv:sending', irc.nick);
			emitPrivate('nickserv:sending', irc.nick);
			return irc.privmsg('nickserv', 'identify ' + user.nickserv[irc.nick]);
		}
	});

	// setup auto executing behavior
	irc.on('welcome', function () {
		var timeout = setTimeout(function () {
			irc.emit('ready', 'timeout');
		}, 10000);

		if (user.nickserv && user.nickserv[irc.nick]) {
			irc.once('nickserv:authed', function () {
				clearTimeout(timeout);
				irc.emit('ready');
			});
		} else {
			irc.once('motd', function () {
				irc.emit('ready');
			});
		}
	});

	irc.on('ready', function () {
		(user.activeChannels || []).forEach(function (channel) {
			if (typeof channel === 'string') {
				irc.join(channel);
			} else {
				irc.join(channel.name, channel.password);
			}
		});
		emitSystem('ready');
		receiver.start();
	});

	if (!doNotConnect) {
		irc.connect();
	}

	return irc;
};

module.exports.get = function (user) {
	var irc = connectionsByUser[user.id];
	if (!irc) return false;

	return irc;
};

module.exports.shutdownAll = function (cb) {
	var total = Object.keys(connectionsByUser).length;
	function decr () {
		total--;
		if (total <= 0) {
			debug('all connections closed');
			return cb && cb();
		}
	}

	debug('closing all connections');
	each(connectionsByUser, function (irc) {
		irc.emit('tarmac:shutdown');
		irc.quit('Process Terminated', decr);
	});

	decr();
};
