'use strict';

var rc = require('rc');
var jsonstream = require('jsonstream');
var fs = require('fs');
var IRC = require('ircsock');
var inout = require('./inout')();

var config = rc('ircsock', {
	name: 'Freenode',
	host: 'irc.freenode.net',
	port: 6667,
	ssl: false,
	nickname: 'iotest' + Math.round(Math.random() * 100),
	username: 'username',
	realname: 'realname',
	password: null
});

var irc = new IRC(config);

var commands = {
	'quit': function () {irc.quit();},
	'join': function (channel) {irc.join(channel);},
	'part': function (channel) {irc.part(channel);},
	'msg' : function (target)  {irc.privmsg(target, this.segments.slice(1).join(' '));}
};

var writable = jsonstream.stringify('[\n\t', ',\n\t', '\n]\n');
var filestream = fs.createWriteStream('./' + (new Date).toISOString() + '.json');
writable.pipe(filestream);


inout.on('quit', function () {
	process.exit(0);
});
inout.on('data', function (text) {
	if (text[0] === '/') {
		var segments = text.substr(1).split(' ');
		var command = segments.shift();
		if (commands[command]) {
			commands[command].apply({
				args: segments.join(' '),
				segments: segments
			}, segments);
		}
	} else {
		irc.write(text);
	}
});


var emit = irc.emit;
irc.emit = function (name, data) {
	emit.apply(this, arguments);

	writable.write(Array.prototype.slice.call(arguments));

	if (!name || name === 'data') {return;}

	inout.output(name.toUpperCase() + ': ' + JSON.stringify(data));
};

irc.on('connect', function () {
	inout.output('PORT ' + irc.stream.localPort);
});

irc.on('close', function () {
	writable.end(function () {
		process.exit(0);
	});
});
irc.on('end', function () {
	writable.end(function () {
		process.exit(0);
	});
});

irc.connect();

process.on('unhandledException', function (err) {
	console.log(err.stack);
	writable.end(function () {
		process.exit(0);
	});
});
