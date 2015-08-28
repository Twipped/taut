'use strict';

var config       = require('./config');
var forever      = require('forever-monitor');
var gulp         = require('gulp');
var merge        = require('merge-stream');
var eslint       = require('gulp-eslint');
var jscs         = require('gulp-jscs');

/**
 * Runs all JS files through jscs and eslint.
 */
gulp.task('lint-js', function () {
	var files = gulp.src([
		'./index.js',
		'./gulpfile.js',
		'./src/**/*.js'
	]);

	return merge(
		files.pipe(jscs({
			configPath: '../.jscsrc'
		})),
		files.pipe(eslint())
			.pipe(eslint.format())
			.pipe(eslint.failOnError())
	);
});

/**
 * Watch task. Updates LESS builds and launches the server.
 * Uses forever to restart server on changes.
 */
gulp.task('watch', ['clean-rev', 'requirejs-dev','less-dev', 'views', 'amd-version'], function () {
	new forever.Monitor('bin/www', {
		env: { DEBUG: config.appName + '*', DEBUG_COLORS:1, NOAUTOCONNECT:1 },
		killSignal: 'SIGUSR2',
		watch: true,
		watchDirectory: __dirname,
		watchIgnoreDotFiles: true,
		watchIgnorePatterns: ['!**/*.js', 'gulpfile.js']
	}).start();
});


gulp.task('default', ['lint-js']);
