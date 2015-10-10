
var debug      = require('taut.shared/debug')('message-handler');
var pubsub     = require('taut.shared/io/pubsub');
var irchistory = require('taut.shared/models/system/irc/history');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {

	debug('system ' + event);
	pubsub.channel('irc:system:receive').publish(event, data);

};

exports.private = function (event, userid, data) {
	debug('private ' + event);

	data.hash = hashPrivateMessage(data);

	pubsub.channel('irc:user:' + userid + ':receive').publish(event, data);

	return irchistory.pushPrivate(data);
};

exports.public = function (event, channel, data) {
	debug('public ' + event);

	var isNewMessage = trackPublicMessage(data);
	if (!isNewMessage) {
		return irchistory.updatePublic(data);
	}

	pubsub.channel('irc:public:' + channel + ':receive').publish(event, data);

	return irchistory.pushPublic(data);
};

