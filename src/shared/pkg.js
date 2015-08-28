'use strict';

var fs = require('fs');
var path = require('path');

function find (dir) {
	if (!dir || dir === '/') return undefined;

	var files = fs.readdirSync(dir);

	if (~files.indexOf('package.json')) {
		return path.join(dir, 'package.json');
	}

	return find(path.dirname(dir));
}

var start = path.dirname(require.main.filename);
var target = find(start);

if (target !== undefined) {
	module.exports = require(target);
} else {
	throw new Error('Could not locate package.json file relative to ' + start);
}
