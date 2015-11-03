
var debug      = require('taut.shared/debug')('message-handler');
var pubsub     = require('taut.shared/io/pubsub');
var irchistory = require('taut.shared/models/system/irc/history');
var linkify    = require('linkify-it')();
var Promise    = require('bluebird');

var ChannelTopic = require('taut.shared/models/channel/topic');
var ChannelNames = require('taut.shared/models/channel/names');
var ChannelModes = require('taut.shared/models/channel/modes');

// add git protocol alias
linkify.add('git:', 'http:');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {
	debug('system ' + event);

	data.date = new Date(data.timestamp);
	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	var proms = [];

	proms.push(pubsub.channel('irc:system:receive').publish(event, data));

	if (event === 'topic') {
		proms.push(ChannelTopic.set(data.target, {
			message: data.message,
			links: data.links
		}).catch(debug.error));
	}

	if (event === 'topic:time') {
		proms.push(ChannelTopic.set(data.target, {
			nick: data.nick,
			hostmask: data.hostmask,
			date: data.time
		}).catch(debug.error));
	}

	if (event === 'topic:url') {
		proms.push(ChannelTopic.set(data.target, 'url', data.url).catch(debug.error));
	}

	if (event === 'names') {
		proms.push(ChannelNames.set(data.target, data.names).catch(debug.error));
	}

	if (event === 'mode:channel') {
		proms.push(ChannelModes.set(data.target, data.modes).catch(debug.error));
	}

	return Promise.all(proms);
};

exports.private = function (event, userid, data) {
	debug('private ' + event, userid);

	data.hash = hashPrivateMessage(data);
	data.date = new Date(data.timestamp);

	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	var proms = [];


	proms.push(pubsub.channel('irc:user:' + userid + ':receive').publish(event, data));

	proms.push(irchistory.pushPrivate(data));

	return Promise.all(proms);
};

exports.public = function (event, channel, data) {
	channel = channel.toLowerCase();

	debug('public ' + event, channel);

	var isNewMessage = trackPublicMessage(data);
	if (!isNewMessage) {
		return irchistory.updatePublic(data);
	}

	data.date = new Date(data.timestamp);
	if (data.message && !data.links) {
		data.links = linkify.match(data.message);
	}

	var proms = [];

	proms.push(pubsub.channel('irc:public:' + channel + ':receive').publish(event, data));

	if (event === 'topic') {
		proms.push(ChannelTopic.set(data.target, {
			nick: data.nick,
			hostmask: data.hostmask,
			message: data.message,
			links: data.links,
			date: new Date()
		}).catch(debug.error));
		proms.push(pubsub.channel('irc:public:' + channel + ':receive').publish(event, data));
	}

	if (event === 'join') {
		proms.push(ChannelNames.add(data.target, data.nick, { 'nick':data.nick }).catch(debug.error));
		proms.push(pubsub.channel('irc:public:' + channel + ':receive').publish('names:add', data));
	}

	if (event === 'part' || event === 'quit:channel' || event === 'kick') {
		proms.push(ChannelNames.remove(data.target, data.nick).catch(debug.error));
		proms.push(pubsub.channel('irc:public:' + channel + ':receive').publish('names:remove', data));
	}


	proms.push(irchistory.pushPublic(data));

	return Promise.all(proms);
};

