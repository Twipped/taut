
var omit = require('lodash/object/omit');
var elastic = require('../../../io/elasticsearch');

exports.pushPublic = function (data) {
	data = omit(data, [
		'userid',
		'connid',
		'isSelf',
		'match'
	]);
	return elastic.create({
		index: 'irc-messages',
		type: 'public',
		id: data.hash,
		body: data
	});
};

exports.updatePublic = function (data) {
	data = omit(data, [
		'userid',
		'connid',
		'isSelf',
		'match'
	]);
	return elastic.update({
		index: 'irc-messages',
		type: 'public',
		id: data.hash,
		body: data
	});
};

exports.pushPrivate = function (data) {
	return elastic.create({
		index: 'irc-messages',
		type: 'private',
		id: data.hash,
		body: data
	});
};


exports.fetchPublic = function (target, limit, until) {
	var params = {
		"query": {
			"filtered": {
				"query": {
					"match": { "target": target }
				}
			}
		},
		"size": limit || 500,
		"sort": [
			{"timestamp" : {"order": "desc"}},
			{"hash" : {"order": "desc"}}
		]
	};

	if (until) {
		if (typeof until === 'string') {
			until = new Date(until);
		}

		params.query.filtered.filter = {
			"range": {
				"timestamp": {
					"lte": Number(until)
				}
			}
		};
	}

	return elastic.search({
		index: 'irc-messages',
		type: 'public',
		body: params
	}).then(function (results) {
		return results.hits.hits.map(function (event) {
			return event._source;
		}).reverse();
	});
};
