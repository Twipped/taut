var newrelic = require('newrelic');

module.exports = function (name) {
	return function (req, res, next) {
		if (name) {newrelic.setTransactionName(name);}
		res.locals.newrelic = newrelic.getBrowserTimingHeader();
		next();
	};
};
