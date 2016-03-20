'use strict';

var clone = require('lodash/lang/clone');
var router = module.exports = require('express').Router(); // eslint-disable-line new-cap

var Promise = require('bluebird');
var ChannelTopic = require('taut.shared/models/channel/topic');
var ChannelNames = require('taut.shared/models/channel/names');
var ChannelModes = require('taut.shared/models/channel/modes');
var channelTracking = require('../../controllers/channel-tracking');
var Chatview = require('../../ui/chatview');

router.get('/:channel', function (req, res, next) {
	var channel = req.params.channel;

	if (channel[0] !== '#') {
		return res.redirect('%23' + channel);
	}

	var pdata = {
		events: channelTracking.pageRequest(channel),
		topic: ChannelTopic.get(channel),
		names: ChannelNames.get(channel),
		modes: ChannelModes.get(channel)
	};

	Promise.props(pdata).then(function (data) {
		var cv = new Chatview();
		cv.add(data.events.map(clone));

		res.render('channel.hbs', {
			channelName: channel,
			topic: data.topic,
			names: data.names,
			modes: data.modes,
			historical: {
				events: data.events,
				json: JSON.stringify(data.events).replace(/<\//g, '<\\/'),
				html: cv.toString()
			}
		});
	}).catch(next);
});


