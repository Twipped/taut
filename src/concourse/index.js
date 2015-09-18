
var Promise = require('bluebird');

module.exports = function (app, io) {
	return Promise.try(setup, app, io);
};

function setup (app, io) {

}
