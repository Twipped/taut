
var debug      = require('taut.shared/debug')('message-handler');
var pubsub     = require('taut.shared/io/pubsub');
var irchistory = require('taut.shared/models/system/irc/history');
var linkify    = require('linkify-it')();

// add git protocol alias
linkify.add('git:', 'http:');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {
	data.date = new Date(data.timestamp);

	debug('system ' + event);
	pubsub.channel('irc:system:receive').publish(event, data);

};

exports.private = function (event, userid, data) {
	data.hash = hashPrivateMessage(data);
	data.date = new Date(data.timestamp);

	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	debug('private ' + event, userid);

	pubsub.channel('irc:user:' + userid + ':receive').publish(event, data);

	return irchistory.pushPrivate(data);
};

exports.public = function (event, channel, data) {
	channel = channel.toLowerCase();

	var isNewMessage = trackPublicMessage(data);
	if (!isNewMessage) {
		return irchistory.updatePublic(data);
	}

	data.date = new Date(data.timestamp);
	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	pubsub.channel('irc:public:' + channel + ':receive').publish(event, data);

	debug('public ' + event, channel);
	return irchistory.pushPublic(data);
};

