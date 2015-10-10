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

gulp.task('default', ['lint-js']);
