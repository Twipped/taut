
var debug         = require('finn.shared/debug')('message-handler');
var elastic = require('finn.shared/io/elasticsearch');
var pubsub = require('finn.shared/io/pubsub');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {

	debug('system ' + event);
	pubsub.channel('irc:system:receive').emit(event, data);

};

exports.private = function (event, userid, data) {
	debug('private ' + event);

	data.hash = hashPrivateMessage(data);

	pubsub.channel('irc:user:' + userid + ':receive').emit(event, data);

	return elastic.create({
		index: 'irc-messages',
		type: 'private',
		id: data.hash,
		body: data
	});
};

exports.public = function (event, channel, data) {
	debug('public ' + event);

	var isNewMessage = trackPublicMessage(data);
	if (!isNewMessage) return;

	pubsub.channel('irc:public:' + channel + ':receive').emit(event, data);

	return elastic.create({
		index: 'irc-messages',
		type: 'public',
		id: data.hash + '-' + data.hashId,
		body: data
	});
};

