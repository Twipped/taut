/* eslint no-console:0, no-shadow:0 */

var Promise = require('bluebird');
var test = require('tap').test;
var test_ = test;
var redtap = require('../../redtap');
var mq = require('../../io/mq');

test('message queues', function (t) {
	var test = redtap(
		test_,
		function beforeEach (done) {
			mq().ready.then(done, function (err) {
				console.error(err);
				done();
			});
		},

		function afterEach (done) {
			mq.shutdown().then(done, function (err) {
				console.error(err);
				done();
			});
		}
	);


	test('init', function (tt) {
		tt.ok(mq.emit);
		tt.ok(mq.subscribe);
		tt.end();
	});

	test('emit and receive', 9, function (t) {

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

