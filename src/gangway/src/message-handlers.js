
var elastic = require('finn.shared/io/elasticsearch');
var redis = require('finn.shared/io/elasticsearch');

var trackPublicMessage = require('./message-cache').match;
var hashPrivateMessage = require('./message-cache').hashPrivateMessage;

exports.system = function (event, data) {

	redis.channel('irc:system:receive').emit(event, data);

};

exports.private = function (event, userid, data) {
	data.hash = hashPrivateMessage(data);

	redis.channel('irc:user:' + userid + ':receive').emit(event, data);

	return elastic.create({
		index: 'irc-messages',
		type: 'private',
		id: data.hash,
		body: data
	});
};

exports.public = function (event, channel, data) {
	var isNewMessage = trackPublicMessage(data);
	if (!isNewMessage) return;

	redis.channel('irc:public:' + channel + ':receive').emit(event, data);

	return elastic.create({
		index: 'irc-messages',
		type: 'public',
		id: data.hash + '-' + data.hashId,
		body: data
	});
};

