'use strict';

var router = module.exports = require('express').Router(); // eslint-disable-line new-cap

var channelTracking = require('../controllers/channel-tracking');
var Chatview = require('../../public/assets/chatview');

router.get('/:channel', function (req, res, next) {
	var channel = req.params.channel;

	if (channel[0] !== '#') {
		return res.redirect('%23' + channel);
	}

	channelTracking.pageRequest(channel).then(function (events) {
		var cv = new Chatview();
		cv.add(events);

		res.render('channel.hbs', {
			historical: {
				events: events,
				html: cv.toString()
			}
		});
	}).catch(next);
});


