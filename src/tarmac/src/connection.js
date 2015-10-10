'use strict';

var Promise = require('bluebird');
var assign = require('lodash/object/assign');
var omit   = require('lodash/object/omit');
var each   = require('lodash/collection/each');
var debug  = require('taut.shared/debug')('connection');
var random = require('taut.shared/lib/random');
var IRC    = require('ircsock');
var pluginChannelTracking = require('ircsock/plugins/channels');
var mq     = require('taut.shared/io/mq');
var Timer  = require('taut.shared/lib/timer');
var radio  = require('./radio');

var model = {
	user: {
		connection: require('taut.shared/models/user/irc/connection'),
	},
	connection: {
		user: require('taut.shared/models/connection'),
		channels: require('taut.shared/models/connection/channels')
	},
	channel: {
		connections: require('taut.shared/models/channel/connections')
	}
};

var nickservPatterns = {
	requested: /^This nickname is registered. Please choose a different nickname/,
	success: /^You are now identified for (.+)\.$/,
	failed:  /^Invalid password for (.+)\./,
	failureCount: /(\d+) failed login since last login\./,
	lastFailed: /^Last failed attempt from: (.+) on (.+)\./
};

module.exports = exports = function (user, doNotConnect) {
	if (user.toJSON) user = user.toJSON();
	user = omit(user, function (v) {return !Boolean(v);});

	var options = assign({
		name: 'Freenode',
		host: 'irc.freenode.net',
		port: 6667,
		ssl: false,
		nickname: 'finner' + Math.round(Math.random() * 100),
		username: 'username',
		realname: 'realname',
		password: null
	}, user);

	var connid = random(10);
	var userid = user.userid;

	debug('created', connid, user);

	var irc = new IRC(options);
	irc.id = connid;
	irc.user = user;

	irc.use(pluginChannelTracking());

	var heartbeat = new Timer(30000, function () {
		debug('heartbeat', irc.nick);
		model.user.connection.set(userid, connid);
		model.connection.user.set(connid, userid);
	}).repeating();

	var receiver = mq.subscribe('irc:outgoing:' + userid, function (action) {
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
			userid: userid,
			connid: connid,
			timestamp: Date.now()
		}, typeof data === 'object' && data || { message: data });
	}

	function emitPublic (event, data) {
		debug('received public ' + event, irc.nick, data.target);
		return mq.emit('irc:incoming', 'public', event, data.target, scopeData(event, data));
	}

	function emitPrivate (event, data) {
		debug('received private ' + event, irc.nick);
		return mq.emit('irc:incoming', 'private', event, userid, scopeData(event, data));
	}

	function emitSystem (event, data) {
		debug('received system ' + event, irc.nick);
		return mq.emit('irc:incoming', 'system', event, scopeData(event, data));
	}

	irc.on('connecting', debug.bind(null, 'connecting', connid));
	irc.on('connect', debug.bind(null, 'connected', connid));
	irc.on('error', debug.bind(null, 'error'));

	irc.on('welcome', function (nickname) {
		heartbeat.start(true);
		radio.send('connection:online', userid);
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
			radio.send('connection:joinChannel', userid, ev.target);
			Promise.all([
				model.connection.channels.add(connid, ev.target),
				model.channel.connections.add(ev.target, connid)
			]).then(function () {
				emitSystem('join', ev);
			});
		}
		emitPublic('join', ev);
	});

	irc.on('part', function (ev) {
		if (ev.isSelf) {
			radio.send('connection:leaveChannel', userid, ev.target);
			Promise.all([
				model.connection.channels.remove(connid, ev.target),
				model.channel.connections.remove(ev.target, connid)
			]).then(function () {
				emitSystem('part', ev);
			});
		}
		emitPublic('part', ev);
	});

	irc.on('kick', function (ev) {
		if (ev.isSelf) {
			radio.send('connection:leaveChannel', userid, ev.target);
			Promise.all([
				model.connection.channels.remove(connid, ev.target),
				model.channel.connections.remove(ev.target, connid)
			]).then(function () {
				emitSystem('kick', ev);
			});
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
		data = assign({ type: type }, data);
		emitSystem('reply', data);
	}

	irc.on('RPL', handleReply);
	irc.on('ERR', handleReply);

	irc.on('end', function () {
		heartbeat.close();
		receiver.close();
		radio.send('connection:offline', userid);

		model.connection.channels.get(connid).then(function (channels) {
			return Promise.map(channels, function (channel) {
				return model.channel.connections.remove(channel, connid);
			});
		}).then(function () {
			return Promise.all([
				model.user.connection.clear(userid),
				model.connection.user.clear(connid)
			]);
		}).then(function () {
			emitSystem('ended');
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
		radio.send('connection:ready', userid);
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

	irc.shutdown = function (msg, fn) {
		irc.quit(msg, function () {
			var p = emitSystem('shutdown');
			if (fn) p.then(fn);
		});
	};

	if (!doNotConnect) {
		irc.connect(function (err) {
			if (err) debug('error', err, options);
		});
		radio.send('connection:starting', userid);
	}

	return irc;
};

