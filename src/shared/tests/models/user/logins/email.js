
var test = require('tape');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var Promise = require('bluebird');

test('models/user/irc/logins/email', function (tr) {

	tr.test('.create(userid, email)', function (t) {
		t.plan(5);

		var clock = sinon.useFakeTimers(Date.now());

		var Model = proxyquire('../../../../models/user/logins/email', {
			'../../../io/redis': {
				'hmset': function (key, actual) {
					t.equal(key, 'login:email:test@example.com');
					t.same(actual, {
						email: 'test@example.com',
						userid: 'USERID',
						password: null,
						date_created: new Date()
					});
					return Promise.resolve();
				},
				'set': function (key, actual) {
					t.equal(key, 'user:USERID:login:email');
					t.equal(actual, 'test@example.com');
					return Promise.resolve();
				},
				'@noCallThru': true
			},
			'../../../lib/passwords': {
				create: function () {
					t.fail('Should not have called bcrypt');
					return Promise.resolve('HASHED');
				}
			}
		});

		Model.create('USERID', 'test@example.com')
			.then(function (result) {
				t.equal(result, undefined);
			})
			.catch(t.fail)
			.then(clock.restore.bind(clock))
			.then(t.end);
	});

	tr.test('.create(userid, email, password)', function (t) {
		t.plan(6);

		var clock = sinon.useFakeTimers(Date.now());

		var Model = proxyquire('../../../../models/user/logins/email', {
			'../../../io/redis': {
				'hmset': function (key, actual) {
					t.equal(key, 'login:email:test@example.com');
					t.same(actual, {
						email: 'test@example.com',
						userid: 'USERID',
						password: 'HASHED',
						date_created: new Date()
					});
					return Promise.resolve();
				},
				'set': function (key, actual) {
					t.equal(key, 'user:USERID:login:email');
					t.equal(actual, 'test@example.com');
					return Promise.resolve();
				},
				'@noCallThru': true
			},
			'../../../lib/passwords': {
				create: function (actual) {
					t.equal(actual, 'PASSWORD');
					return Promise.resolve('HASHED');
				}
			}
		});

		Model.create('USERID', 'test@example.com', 'PASSWORD')
			.then(function (result) {
				t.equal(result, undefined);
			})
			.catch(t.fail)
			.then(clock.restore.bind(clock))
			.then(t.end);
	});

	tr.test('.changePasswordForUserId(userid, password)', function (t) {
		t.plan(5);

		var clock = sinon.useFakeTimers(Date.now());

		var Model = proxyquire('../../../../models/user/logins/email', {
			'../../../io/redis': {
				'hmset': function (key, actual) {
					t.equal(key, 'login:email:test@example.com');
					t.same(actual, {
						email: 'test@example.com',
						userid: 'USERID',
						password: 'HASHED',
						date_created: new Date()
					});
					return Promise.resolve();
				},
				'get': function (key) {
					t.equal(key, 'user:USERID:login:email');
					return Promise.resolve('test@example.com');
				},
				'@noCallThru': true
			},
			'../../../lib/passwords': {
				create: function (actual) {
					t.equal(actual, 'PASSWORD');
					return Promise.resolve('HASHED');
				}
			}
		});

		Model.changePasswordForUserId('USERID', 'PASSWORD')
			.then(function (result) {
				t.equal(result, undefined);
			})
			.catch(t.fail)
			.then(clock.restore.bind(clock))
			.then(t.end);
	});

	tr.test('.changePasswordForEmail(userid, password)', function (t) {
		t.plan(6);

		var clock = sinon.useFakeTimers(Date.now());

		var Model = proxyquire('../../../../models/user/logins/email', {
			'../../../io/redis': {
				'hmset': function (key, actual) {
					t.equal(key, 'login:email:test@example.com');
					t.same(actual, {
						email: 'test@example.com',
						userid: 'USERID',
						password: 'HASHED',
						date_created: new Date()
					});
					return Promise.resolve();
				},
				'hget': function (key, hashkey) {
					t.equal(key, 'login:email:test@example.com');
					t.equal(hashkey, 'userid');
					return Promise.resolve('USERID');
				},
				'@noCallThru': true
			},
			'../../../lib/passwords': {
				create: function (actual) {
					t.equal(actual, 'PASSWORD');
					return Promise.resolve('HASHED');
				}
			}
		});

		Model.changePasswordForEmail('test@example.com', 'PASSWORD')
			.then(function (result) {
				t.equal(result, undefined);
			})
			.catch(t.fail)
			.then(clock.restore.bind(clock))
			.then(t.end);
	});

	tr.test('.changeEmail(userid, email)', function (t) {
		t.plan(9);

		var clock = sinon.useFakeTimers(Date.now());

		var Model = proxyquire('../../../../models/user/logins/email', {
			'../../../io/redis': {
				'hmset': function (key, actual) {
					t.equal(key, 'login:email:test2@example.com');
					t.same(actual, {
						email: 'test2@example.com',
						userid: 'USERID',
						password: 'HASHED',
						date_created: new Date()
					});
					return Promise.resolve();
				},
				'set': function (key, actual) {
					t.equal(key, 'user:USERID:login:email');
					t.equal(actual, 'test2@example.com');
					return Promise.resolve();
				},
				'hget': function (key, hashkey) {
					t.equal(key, 'login:email:test1@example.com');
					t.equal(hashkey, 'password');
					return Promise.resolve('HASHED');
				},
				'get': function (key) {
					t.equal(key, 'user:USERID:login:email');
					return Promise.resolve('test1@example.com');
				},
				'del': function (key) {
					t.equal(key, 'login:email:test1@example.com');
					return Promise.resolve();
				},
				'@noCallThru': true
			}
		});

		Model.changeEmail('USERID', 'test2@example.com')
			.then(function (result) {
				t.equal(result, undefined);
			})
			.catch(t.fail)
			.then(clock.restore.bind(clock))
			.then(t.end);
	});

	tr.end();

});
