
var test = require('tape');
// var sequential = require('../../../testing/sequential');
var proxyquire = require('proxyquire');
var Promise = require('bluebird');

test('models/user/irc', function (tr) {

	tr.test('.get(userid)', function (t) {
		t.plan(6);

		var EXPECTED = { userid: 'USERID' };

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'@noCallThru': true
			},
			'../../io/redis': {
				'hgetall': function (key, target) {
					t.equal(key, 'user:USERID:irc');
					t.notOk(target, 'Hash target was not supplied');
					return Promise.resolve(EXPECTED);
				},
				'@noCallThru': true
			}
		});

		Model.set = function (userid, key, value) {
			t.equal(userid, 'USERID');
			t.equal(key, 'username');
			t.equal(typeof value, 'string', 'a new username was created: ' + value);
			return Promise.resolve();
		};

		Model.get('USERID')
			.then(function (result) {
				t.same(result, EXPECTED);
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.get(userid, hashkey)', function (t) {
		t.plan(3);

		var EXPECTED = { userid: 'USERID' };

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'@noCallThru': true
			},
			'../../io/redis': {
				'hget': function (key, target) {
					t.equal(key, 'user:USERID:irc');
					t.equal(target, 'HASHKEY');
					return Promise.resolve(EXPECTED);
				},
				'@noCallThru': true
			}
		});

		Model.set = function () {
			t.fail('should not have called set for this');
			return Promise.resolve();
		};

		Model.get('USERID', 'HASHKEY')
			.then(function (result) {
				t.same(result, EXPECTED);
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.get(userid, "username")', function (t) {
		t.plan(6);

		var EXPECTED = null;

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'@noCallThru': true
			},
			'../../io/redis': {
				'hget': function (key, target) {
					t.equal(key, 'user:USERID:irc');
					t.equal(target, 'username');
					return Promise.resolve(null);
				},
				'@noCallThru': true
			}
		});

		Model.set = function (userid, key, value) {
			t.equal(userid, 'USERID');
			t.equal(key, 'username');
			t.equal(typeof value, 'string', 'a new username was created: ' + value);
			EXPECTED = value;
			return Promise.resolve();
		};

		Model.get('USERID', 'username')
			.then(function (result) {
				t.same(result, EXPECTED);
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.set(userid, hashkey, value)', function (t) {
		t.plan(4);

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'@noCallThru': true
			},
			'../../io/redis': {
				'hset': function (key, target, value) {
					t.equal(key, 'user:USERID:irc');
					t.equal(target, 'HASHKEY');
					t.equal(value, 'VALUE');
					return Promise.resolve();
				},
				'@noCallThru': true
			}
		});

		Model.set('USERID', 'HASHKEY', 'VALUE')
			.then(function () {
				t.pass('promise resolved');
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.set(userid, object)', function (t) {
		t.plan(4);

		var PASSING = { somevalue: 42 };

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'@noCallThru': true
			},
			'../../io/redis': {
				'hmset': function (key, target, value) {
					t.equal(key, 'user:USERID:irc');
					t.same(target, PASSING);
					t.notOk(value, 'Value received something');
					return Promise.resolve();
				},
				'@noCallThru': true
			}
		});

		Model.set('USERID', PASSING)
			.then(function () {
				t.pass('promise resolved');
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.set(userid, "keepalive", true)', function (t) {
		t.plan(6);

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'set': function (userid, value) {
					t.equal(userid, 'USERID');
					t.equal(value, true);
					return Promise.resolve();
				},
				'@noCallThru': true
			},
			'../../io/redis': {
				'hset': function (key, target, value) {
					t.equal(key, 'user:USERID:irc');
					t.equal(target, 'keepalive');
					t.equal(value, true);
					return Promise.resolve();
				},
				'@noCallThru': true
			}
		});

		Model.set('USERID', 'keepalive', true)
			.then(function () {
				t.pass('promise resolved');
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.test('.set(userid, object)', function (t) {
		t.plan(6);

		var PASSING = { keepalive: false };

		var Model = proxyquire('../../../models/user/irc', {
			'./irc/keepalive': {
				'set': function (userid, value) {
					t.equal(userid, 'USERID');
					t.equal(value, false);
					return Promise.resolve();
				},
				'@noCallThru': true
			},
			'../../io/redis': {
				'hmset': function (key, target, value) {
					t.equal(key, 'user:USERID:irc');
					t.same(target, PASSING);
					t.notOk(value, 'Value received something');
					return Promise.resolve();
				},
				'@noCallThru': true
			}
		});

		Model.set('USERID', PASSING)
			.then(function () {
				t.pass('promise resolved');
			})
			.catch(t.fail)
			.then(t.end);
	});

	tr.end();
});
