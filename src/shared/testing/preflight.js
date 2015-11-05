
module.exports = function (tape) {
	return function (name, plan, fn) {
		if (typeof plan === 'function') {
			fn = plan;
			plan = 0;
		}

		var before = [];
		var after = [];

		tape(name, function (t) {
			var tTest = t.test.bind(t);

			if (plan) t.plan(plan);

			t.beforeEach = function (cb) {
				before.push(cb);
			};

			t.afterEach = function (cb) {
				after.push(cb);
			};

			t.test = function (tName, tPlan, tFn) {
				if (typeof tPlan === 'function') {
					tFn = tPlan;
					tPlan = 0;
				}

				tTest(tName, function (q) {
					var executedAfters = false;
					var qEnd = q.end.bind(q);

					if (tPlan) q.plan(tPlan);

					q.end = function () {
						runWrapperFns(after, q, function () {
							executedAfters = true;
							qEnd();
						});

					};

					q.on('end', function () {
						if (!executedAfters) {
							runWrapperFns(after, q, function () {
								executedAfters = true;
							});
						}
					});

					tFn(q);
				}, before.slice(0), after.slice(0));
			};

			runWrapperFns(before, t, function () {
				fn(t);
			});
		});
	};

};


function runWrapperFns (fns, t, callback) {
	callback = callback || function () {};
	t = Object.create(t);

	var step = -1;
	var done = function () {
		step++;
		if (step >= fns.length) {
			return callback();
		}

		fns[step](t);
	};

	t.end = done;

	done();
}
