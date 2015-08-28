'use strict';

var assign = require('lodash/object/assign');
var debug = require('finn.shared/debug')('controller');
var random = require('finn.shared/random');
var IRC = require('ircsock');
var mq = require('finn.shared/db/mq');
var Timer = require('finn.shared/lib/timer');

var nickservPatterns = {
	request: /^This nickname is registered. Please choose a different nickname/,
	confirm: /^You are now identified for (.+)\.$/
};

var connectionsByUser = {};

module.exports = exports = function (user) {
	var connid = random(10);

	var irc = new IRC(user);
	irc.id = connid;
	irc.user = user;

	connectionsByUser[user.id] = irc;

	var heartbeat = new Timer(30000, function () {

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

	function scopeData (data) {
		return assign({
			userid: user.id,
			connid: connid,
		}, data);
	}

	function emitPublic (event, data) {
		debug('received public ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'public', event, data.target, scopeData(data));
	}

	function emitPrivate (event, data) {
		debug('received private ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'private', event, user.id, scopeData(data));
	}

	function emitSystem (event, data) {
		debug('received system ' + event, irc.nick, data);
		mq.emit('irc:incoming', 'system', event, scopeData(data));
	}

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
			emitPrivate('notice');
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
		emitSystem('topic', ev);
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

		if (ev.message.match(nickservPatterns.request)) {
			if (user.nickserv[irc.nick]) {
				irc.emit('nickserv:sending', irc.nick);
				return irc.privmsg('nickserv', 'identify ' + user.nickserv[irc.nick]);
			}
		}

		var match;
		if ((match = ev.message.match(nickservPatterns.confim))) {
			irc.emit('nickserv:authed', match[1]);
		}
	});

	// setup auto executing behavior
	irc.on('welcome', function () {
		var timeout = setTimeout(function () {
			irc.emit('ready', 'timeout');
		}, 10000);

		if (user.nickserv[irc.nick]) {
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
