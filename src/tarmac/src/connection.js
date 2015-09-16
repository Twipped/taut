'use strict';

var assign = require('lodash/object/assign');
var each = require('lodash/collection/each');
var debug = require('finn.shared/debug')('controller');
var random = require('finn.shared/lib/random');
var IRC = require('ircsock');
var mq = require('finn.shared/io/mq');
var Timer = require('finn.shared/lib/timer');

var modelUserIrcConnection = require('finn.shared/models/user/irc/connection');

var nickservPatterns = {
	requested: /^This nickname is registered. Please choose a different nickname/,
	success: /^You are now identified for (.+)\.$/,
	failed:  /^Invalid password for (.+)\./,
	failureCount: /(\d+) failed login since last login\./,
	lastFailed: /^Last failed attempt from: (.+) on (.+)\./
};

var connectionsByUser = {};

module.exports = exports = function (user) {
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

	connectionsByUser[user.id] = irc;

	var heartbeat = new Timer(30000, function () {
		debug('heartbeat', irc.nick);
		modelUserIrcConnection.set(user.id, connid);
	}).repeating();

	var receiver = mq.subscribe('irc:outgoing:' + user.id, function (command) {
		var args = Array.prototype.slice.call(arguments, 1);

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
			timestamp: Date.now
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
		emitPublic('join', ev);
	});

	irc.on('part', function (ev) {
		emitPublic('part', ev);
	});

	irc.on('kick', function (ev) {
		emitPublic('kick', ev);
	});

	irc.on('quit', function (ev) {
		emitPublic('quit', ev);
	});

	irc.on('nick', function (ev) {
		emitPublic('nick', ev);
	});

	irc.on('names', function (ev) {
		emitSystem('names', ev);
	});

	irc.on('mode:channel', function (ev) {
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

	irc.on('RPL', emitSystem.bind(null, 'reply'));
	irc.on('ERR', emitSystem.bind(null, 'reply'));

	irc.on('close', function () {
		delete connectionsByUser[user.id];

		heartbeat.stop();
		receiver.stop();
		emitSystem('disconnect', 'closed');
	});

	irc.on('end', function () {
		delete connectionsByUser[user.id];

		heartbeat.stop();
		receiver.stop();
		emitSystem('disconnect', 'ended');
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
			irc.join(channel.name, channel.password);
		});
		emitSystem('ready');
	});

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
		if (total <= 0) return cb && cb();
	}

	each(connectionsByUser, function (irc) {
		irc.once('end', decr);
		irc.quit('Process Terminated');
	});

	decr();
};
