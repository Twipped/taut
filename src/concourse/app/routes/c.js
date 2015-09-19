'use strict';

var router = module.exports = require('express').Router(); // eslint-disable-line new-cap

var channelTracking = require('../controllers/channel-tracking');

router.get('/:channel', function (req, res) {
	var channel = req.params.channel;

	if (channel[0] !== '#') {
		return res.redirect('%23' + channel);
	}

	channelTracking.pageRequest(channel).then(function (events) {
		res.json(events);
	});
});


