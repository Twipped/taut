
var debug = require('taut.shared/debug')('flights');

var userConnection = require('taut.shared/models/user/irc/connection');

var each = require('lodash/collection/each');
var map  = require('lodash/collection/map');
var keys = require('lodash/object/keys');
var flights = {};

exports.get = function (flightid) {
	return flights[flightid] && keys(flights[flightid]) || [];
};

exports.add = function (flightid, userid) {
	if (!flights[flightid]) {
		flights[flightid] = {};
	}

	if (!flights[flightid][userid]) {
		debug('adding', flightid, userid);
		flights[flightid][userid] = true;
	}
};

exports.remove = function (flightid, userid) {
	if (Array.isArray(userid)) {
		return userid.forEach(function (uid) {
			exports.remove(flightid, uid);
		});
	}

	if (flights[flightid] && !flights[flightid][userid]) {
		debug('removing', flightid, userid);
		delete flights[flightid][userid];
	}
};

exports.purge = function (flightid) {
	if (flights[flightid]) {
		delete flights[flightid];
	}
};

exports.crashed = function (flightid) {
	var dead = exports.get(flightid);
	exports.purge(flightid);


	dead.forEach(function (userid) {
		debug('removing', flightid, userid);
		userConnection.clear(userid);
	});

	return dead;
};

exports.reset = function () {
	flights = {};
};

exports.all = function () {
	var arrs = map(flights, function (flight) {
		return keys(flight);
	});

	return Array.prototype.concat.apply([], arrs);
};

exports.find = function (userid) {
	var result;
	each(flights, function (flight, flightid) {
		if (flight[userid]) {
			result = flightid;
			return false;
		}
	});
	return result;
};
