'use strict';

var express = require('express');
var router = express.Router(); // eslint-disable-line new-cap

/* GET home page. */
router.get('/', require('../middleware/newrelic')('frontpage'), function (req, res) {
	res.render('index.hbs', { title: 'Freenode IRC Network Nexus' });
});

router.use('/c', require('../middleware/newrelic')('channel'), require('./c'));

module.exports = router;
