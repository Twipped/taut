/* eslint no-console:0, no-shadow:0 */

var Promise = require('bluebird');
var test = require('../../testing/preflight')(require('tape'));
var mq = require('../../io/mq');

test('message queues', function (t) {

	t.beforeEach(function (pre) {
		mq().ready.then(pre.end, function (err) {
			pre.fail(err);
			pre.end();
		});
	});

	t.afterEach(function (post) {
		mq.shutdown().then(post.end, function (err) {
			post.fail(err);
			post.end();
		});
	});

	t.test('init', function (tt) {
		tt.ok(mq.emit, 'mq has .emit');
		tt.ok(mq.subscribe, 'mq has .subscribe');
		tt.end();
	});

	t.test('emit and receive', 9, function (t) {
		var iteration = -1;
		var expectedArgs = [
			['a', 'b'],
			['c', 'd', 'e'],
			['f']
		];

		var digister = mq.subscribe('testQueue', function () {
			var args = Array.prototype.slice.call(arguments);

			t.ok(++iteration < expectedArgs.length, 'testQueue received ' + iteration);
			t.same(args, expectedArgs[iteration]);

			if (iteration === expectedArgs.length - 1) {
				t.end();
			}
		});

		mq.getQueue('testQueue').then(function (queue) {
			return Promise.fromNode(function (resolve) {
				t.pass('got queue');
				queue.flush(resolve);
			});
		})
		.then(function () {
			t.pass('queue flushed');
			return Promise.all([
				mq.emit('testQueue', 'a', 'b'),
				mq.emit('testQueue', 'c', 'd', 'e'),
				mq.emit('testQueue', 'f')
			]);
		})
		.then(mq.getLength.bind(mq, 'testQueue'))
		.then(function (length) {
			// busmq has a bug where it returns double the correct number of messages
			t.equal(length, 3, 'queue has the correct number of messages waiting');
			digister.start();
		})
		.catch(t.fail);
	});

	t.end();

});

