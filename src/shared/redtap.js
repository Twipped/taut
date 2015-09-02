
module.exports = redtape;
function redtape(test, setup, teardown) {
	var noop = function (cb) { if (typeof cb === 'function') cb(); };
	var options = {};
	if (arguments.length === 1 && typeof arguments[0] === 'object') {
		options = test;
		test = options.test || require('tap').test;
		setup = options.setup || options.beforeEach || noop;
		teardown = options.teardown || options.afterEach || noop;
	} else {
		setup = setup || noop;
		teardown = teardown || noop;
	}

	return function testCase (name, plan, cb) {
		if (arguments.length === 2 && typeof plan === 'function') {
			cb = plan;
		}
		test(name, function (t) {
			var args;

			var ended = false;
			var tt = Object.create(t);
			tt.end = function () {
				if (ended) return;
				ended = true;
				var _args = args;
				var _cb = function (err) {
					if (err) return t.error(err);
					t.end();
				};
				// pass setup args if needed
				if (teardown.length > 1) {
					_args = args.concat(_cb);
				} else {
					_args = [_cb];
				}
				teardown.apply(null, _args);
			};

			setup(function (err) {
				if (err) return t.error(err);
				if (typeof plan === 'number' && plan >= 0) t.plan(plan);
				args = Array.prototype.slice.call(arguments, 1);
				cb.apply(null, [tt].concat(args));
			});
		});
	};
}
