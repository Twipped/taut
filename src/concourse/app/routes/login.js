'use strict';

var config     = require('finn.shared/config');
var checkLogin = require('finn.shared/models/login').check;
var redis          = require('finn.shared/io/redis');

var express        = require('express');
var pitstop        = require('pitstop');
var expressSession = require('express-session');
var bodyParser     = require('body-parser').urlencoded({ extended: false });
var cookieParser   = require('cookie-parser')();
var RedisStore     = require('connect-redis')(expressSession);

/* Setup Passport
***********************************************************************************************/
var passport = require('passport');

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (obj, done) {
	done(null, obj);
});

var LocalStrategy = require('passport-local').Strategy;
passport.use(
	new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password'
	},
	function (email, password, done) {
		// Retrieve the password hash for this user
		checkLogin(email, password).then(function (match) {

			if (!match) {
				done(null, false, { message: 'Invalid login' });
			} else {
				done(null, email);
			}

		}).catch(done);
	}
));

/* Create sessions pitstop
***********************************************************************************************/
var pit = pitstop();

pit.condition(function (req, res, next) {
	cookieParser(req, res, function (err) {
		if (err) return next(err);

		// if the cookie doesn't exist, sessions will not be invoked for the request
		if (!req.cookies[config.sessions && config.sessions.cookieKey || 'session']) {
			return next(false);
		}

		return next();
	});
});

pit.use(expressSession({
	store: config.sessions && config.sessions.store || new RedisStore({
		client: redis
	}),
	secret: config.sessions && config.sessions.secret || 'secret',
	key: config.sessions && config.sessions.cookieKey || 'session',
	resave: true,
	saveUninitialized: true
}));

pit.use(require('flash')());

pit.use(passport.initialize());
pit.use(passport.session());
pit.use(function (req, res, next) {
	if (req.isAuthenticated()) {
		res.locals.user = req.user;
	}
	next();
});


/* Create router for handling login routes
 ***********************************************************************************************/

var router = express.Router(); // eslint-disable-line new-cap

router.route('/login')
	.get(pit.execute, function (req, res) {
		res.render('login.hbs');
	})
	.post(pit.execute, bodyParser, function (req, res) {
		passport.authenticate('local', {
			successRedirect: req.session && req.session.goingTo || '/',
			failureRedirect: '/login',
			failureFlash: true
		})(req, res);
	});

router.get('/logout', pit, function (req, res) {
	if (res.logout) res.logout();
	res.redirect('/login');
});

router.get('/loggedin', pit, function (req, res) {
	res.json(req.user);
});

/* Export router and middleware
 ***********************************************************************************************/

module.exports = router;
module.exports.sessionOptional = pit;
module.exports.sessionRequired = pit.execute;
module.exports.validate = function (role) {

	return function (req, res, next) {

		if (!req.isAuthenticated()) {
			// If the user is not authorized, save the location that was being accessed so we can redirect afterwards.
			req.session.goingTo = req.url;
			res.redirect('/login');
			return;
		}

		// If a role was specified, make sure that the user has it.
		if (role && (typeof req.user.role === 'undefined' || req.user.role !== role)) {
			res.status(403);
			res.locals.error = 'You must be a moderator to access that page.';
			res.locals.statusCode = 403;
			res.render('error.hbs', res.locals);
		}

		next();
	};

};
