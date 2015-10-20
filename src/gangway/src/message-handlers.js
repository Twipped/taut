
var debug      = require('taut.shared/debug')('message-handler');
var pubsub     = require('taut.shared/io/pubsub');
var irchistory = require('taut.shared/models/system/irc/history');
var linkify    = require('linkify-it')();

var ChannelTopic = require('taut.shared/models/channel/topic');
var ChannelNames = require('taut.shared/models/channel/names');
var ChannelModes = require('taut.shared/models/channel/modes');

// add git protocol alias
linkify.add('git:', 'http:');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {
	data.date = new Date(data.timestamp);
	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	debug('system ' + event);
	pubsub.channel('irc:system:receive').publish(event, data);

	if (event === 'topic') {
		ChannelTopic.set(data.target, {
			message: data.message,
			links: data.links
		});
	}

	if (event === 'topic:time') {
		ChannelTopic.set(data.target, {
			nick: data.nick,
			hostmask: data.hostmask,
			date: data.time
		});
	}

	if (event === 'topic:url') {
		ChannelTopic.set(data.target, 'url', data.url);
	}

	if (event === 'names') {
		ChannelNames.set(data.target, data.names);
	}

	if (event === 'mode:channel') {
		ChannelModes.set(data.target, data.modes);
	}
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

	if (event === 'topic') {
		ChannelTopic.set(data.target, {
			nick: data.nick,
			hostmask: data.hostmask,
			message: data.message,
			date: new Date()
		});
		pubsub.channel('irc:public:' + channel + ':receive').publish(event, data);
	}

	if (event === 'join') {
		ChannelNames.add(data.target, data.nick, { 'nick':data.nick,'op':false,'halfop':false,'voice':false });
		pubsub.channel('irc:public:' + channel + ':receive').publish('names:add', data);
	}

	if (event === 'part' || event === 'quit:channel' || event === 'kick') {
		ChannelNames.remove(data.target, data.nick);
		pubsub.channel('irc:public:' + channel + ':receive').publish('names:remove', data);
	}

	debug('public ' + event, channel);
	return irchistory.pushPublic(data);
};

