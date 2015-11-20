/* eslint no-shadow:0, max-params:0 */

var tape       = require('tape');
var test       = require('taut.shared/testing/preflight')(tape);
var sequential = require('taut.shared/testing/sequential');
var hook = require('taut.shared/testing/hook');
var proxyquire = require('proxyquire').noCallThru();
var contains   = require('object-contains');

tape.Test.prototype.contains = function (a, b, msg, extra) {
	this._assert(a && b && contains(a, b), {
		message : msg || 'should contain',
		operator : 'equal',
		actual : a,
		expected : b,
		extra : extra
	});
};

test('connection.js', function (t) {

	var sequence = sequential();

	var factory = proxyquire('../src/connection.js', {
		'taut.shared/config': {
			tarmac: {
				heartbeat: 1,
				identurl: 'URL/{{username}}/{{port}}'
			}
		},

		'taut.shared/io/mq': {
			'emit': sequence.bind(null, 'mq.emit'),
			'subscribe': function (feedname, cb) {
				t.equal(feedname, 'irc:outgoing:USERID');
				t.equal(typeof cb, 'function');
				return {
					start: sequence.bind(null, 'receiver.start'),
					close: sequence.bind(null, 'receiver.close')
				};
			}
		},

		'taut.shared/models/user/irc/connection': {
			'set': sequence.bind(null, 'UserConnection.set'),
			'clear': sequence.bind(null, 'UserConnection.clear')
		},

		'taut.shared/alert': sequence.bind(null, 'alert'),

		'taut.shared/lib/timer': function (time, fn) {
			t.equal(time, 1000, 'Expected heartbeat timer');
			t.equal(typeof fn, 'function', 'heartbeat function');
			return {
				repeating: function () {return this;},
				start: sequence.bind(null, 'heartbeat.start'),
				close: sequence.bind(null, 'heartbeat.close')
			};
		},

		'superagent': {
			'get': sequence.bind(null, 'superagent.get')
		},

		'./radio': {
			send: sequence.bind(null, 'radio.send')
		}

	});

	var mockStream = {
		localPort: 1234,
		write: function () {},
		end: sequence.bind(null, 'stream.end')
	};

	var mockUser = {
		userid: 'USERID',
		nickname: 'NICKNAME',
		username: 'USERNAME',
		isAgent: false,
		activeChannels: [
			'#channela',
			{ name: '#channelb' },
			'#channelc'
		]
	};

	sequence.add(function (evt) {
		t.fail('Received ' + evt);
	});

	var irc = factory(mockUser);

	irc.join = hook(irc.join, sequence.bind(null, 'irc.join'));
	irc.getModes = hook(irc.getModes, sequence.bind(null, 'irc.getModes'));

	t.equal(typeof irc.id, 'string', 'irc.id');
	t.same(irc.user, {
		userid: 'USERID',
		nickname: 'NICKNAME',
		username: 'USERNAME',
		activeChannels: [
			'#channela',
			{ name: '#channelb' },
			'#channelc'
		]
	}, 'irc.user');
	t.equal(typeof irc.shutdown, 'function', 'irc.shutdown');

	t.test('connection established', function (t) {
		sequence.reset(true);
		sequence.add(function (evt, cmd, userid) {
			t.equal(evt, 'radio.send', 'Sequence: radio.send');
			t.equal(cmd, 'connection:starting');
			t.equal(userid, 'USERID');
		});
		sequence.add(function (evt, url) {
			t.equal(evt, 'superagent.get', 'Sequence: superagent.get');
			t.equal(url, 'URL/USERNAME/1234', 'precheck registered');
			return {
				end: function () {
					t.pass('superagent.end');
					t.end();
				}
			};
		});

		irc.emit('connecting');
		irc.stream = mockStream;
		irc.emit('connect');
	});

	t.test('welcome/ready', function (t) {
		sequence.reset(true);
		sequence.add(function (evt) {
			t.equal(evt, 'heartbeat.start', 'Sequence: heartbeat.start');
		});
		sequence.add(function (evt, cmd) {
			t.equal(evt, 'radio.send', 'Sequence: radio.send');
			t.equal(cmd, 'connection:online');
		});
		sequence.add(function (evt, bus, type, event, userid, data) {
			t.equal(evt, 'mq.emit', 'Sequence: mq.emit');
			t.equal(bus, 'irc:incoming');
			t.equal(type, 'private');
			t.equal(event, 'welcome');
			t.equal(userid, 'USERID');
			t.contains(data, {
				event: 'welcome',
				userid: mockUser.userid,
				nickname: mockUser.nickname
			});
		});
		sequence.add(function (evt, bus, type, event, userid, data) {
			t.equal(evt, 'mq.emit', 'Sequence: mq.emit');
			t.equal(bus, 'irc:incoming');
			t.equal(type, 'private');
			t.equal(event, 'motd');
			t.contains(data, {
				event: 'motd',
				userid: mockUser.userid,
				motd: 'MOTD'
			});
		});
		sequence.add(function (evt, cmd) {
			t.equal(evt, 'radio.send', 'Sequence: radio.send');
			t.equal(cmd, 'connection:ready');
		});
		sequence.add(function (evt, channel) {
			t.equal(evt, 'irc.join', 'Sequence: irc.join');
			t.equal(channel, '#channela');
		});
		sequence.add(function (evt, channel) {
			t.equal(evt, 'irc.join', 'Sequence: irc.join');
			t.equal(channel, '#channelb');
		});
		sequence.add(function (evt, channel) {
			t.equal(evt, 'irc.join', 'Sequence: irc.join');
			t.equal(channel, '#channelc');
		});
		sequence.add(function (evt, bus, type, event, data) {
			t.equal(evt, 'mq.emit', 'Sequence: mq.emit');
			t.equal(bus, 'irc:incoming');
			t.equal(type, 'system');
			t.equal(event, 'ready');
			t.contains(data, {
				event: 'ready',
				userid: mockUser.userid
			});
		});
		sequence.add(function (evt) {
			t.equal(evt, 'receiver.start', 'Sequence: receiver.start');
			t.end();
		});
		sequence.add(function (evt) {
			t.fail('Received ' + evt);
		});

		irc.emit('welcome', mockUser.nickname);
		irc.emit('motd', 'MOTD');
	});

	t.test('join a channel', function (t) {
		sequence.reset(true);
		sequence.add(function (evt, cmd, userid, target) {
			t.equal(evt, 'radio.send', 'Sequence: radio.send');
			t.equal(cmd, 'connection:joinChannel');
			t.equal(userid, mockUser.userid);
			t.equal(target, '#Node.js');
		});
		sequence.add(function (evt, bus, type, event, data) {
			t.equal(evt, 'mq.emit', 'Sequence: mq.emit');
			t.equal(bus, 'irc:incoming');
			t.equal(type, 'system');
			t.equal(event, 'join');
			t.contains(data, {
				event: 'join',
				userid: mockUser.userid,
				target: '#Node.js',
			});
		});
		sequence.add(function (evt, channel) {
			t.equal(evt, 'irc.getModes', 'Sequence: irc.getModes');
			t.equal(channel, '#Node.js');
		});
		sequence.add(function (evt, bus, type, event, userid, data) {
			t.equal(evt, 'mq.emit', 'Sequence: mq.emit');
			t.equal(bus, 'irc:incoming');
			t.equal(type, 'public');
			t.equal(event, 'join');
			t.contains(data, {
				event: 'join',
				userid: mockUser.userid,
				target: '#Node.js'
			});
			t.end();
		});
		sequence.add(function (evt) {
			t.fail('Received ' + evt);
		});

		irc.emit('join', {
			'nick':'iotest43',
			'host':'~username@ip72-197-194-125.sd.sd.cox.net',
			'target':'#Node.js',
			'isSelf':true
		});

	});


	t.end();

});
