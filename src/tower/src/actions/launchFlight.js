
var debug = require('finn.shared/debug')('actions:launchFlight');
var config = require('finn.shared/config');
var fs = require('fs');

module.exports = function launchFlight () {
	debug('spawning new tarmac process', config.tower.tarmacPath);

	var stdout = fs.openSync(config.tarmac.stdout, 'a');
	var stderr = fs.openSync(config.tarmac.stderr, 'a');

	var cp = require('child_process');
	var child = cp.spawn(config.tower.tarmacPath, [], {
		detached: true,
		stdio: ['ignore', stdout, stderr]
	});
	child.once('error', function (err) {
		debug.error('could not launch tarmac process', err);
	});
	child.unref();
};
