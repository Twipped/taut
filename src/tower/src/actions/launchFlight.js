
var debug = require('finn.shared/debug')('actions:launchFlight');
var config = require('finn.shared/config');
var assign = require('lodash/object/assign');
var fs = require('fs');

module.exports = function launchFlight () {
	debug('spawning new tarmac process', config.tower.tarmacLaunch);

	var stdout = config.tower.tarmacLaunch.out && fs.openSync(config.tower.tarmacLaunch.out, 'a') || 'ignore';
	var stderr = config.tower.tarmacLaunch.err && fs.openSync(config.tower.tarmacLaunch.err, 'a') || 'ignore';

	var cp = require('child_process');
	var child = cp.spawn(config.tower.tarmacLaunch.bin, [], {
		detached: true,
		stdio: ['ignore', stdout, stderr],
		env: assign(process.env, config.tower.tarmacLaunch.env)
	});
	child.once('error', function (err) {
		debug.error('could not launch tarmac process', err);
	});
	child.unref();
};
