
var User = require('../user');
var memoize = require('lodash/function/memoize');

module.exports = memoize(function (userid) {
	return User.get(userid, 'is_agent').then(Boolean);
});
