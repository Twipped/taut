#!/usr/bin/env node
/* eslint no-console:0, no-process-exit:0, one-var:0 */

var Promise = require('bluebird');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var urlparse = require('url').parse;
var aws, s3, config;

function fail (err) {
	if (err.stack) console.error(err.stack);
	else console.error.apply(console, arguments);
	process.exit(1);
}

function isDir (target) {
	try {
		return fs.statSync(target).isDirectory();
	} catch (e) {
		return false;
	}
}

function isFile (target) {
	try {
		return fs.statSync(target).isFile();
	} catch (e) {
		return false;
	}
}

function hmacSha1 (message, secret) {
	return crypto.createHmac('sha1', secret)
		.update(message)
		.digest('base64');
}

function readBuildHistory (name) {
	return Promise.fromNode(function (callback) {
		s3.getObject({
			Bucket: config.s3bucket,
			Key: config.buildHistoryFile.replace('{{name}}', name)
		}, callback);
	}).then(function (response) {
		var data = response.Body.toString();
		try {
			data = data && JSON.parse(data) || [];
		} catch (e) {
			data = [];
		}
		return data;
	}).catch(function (err) {
		if (err.code === 'NoSuchKey') {
			return [];
		}
		return Promise.reject(err);
	});
}

function writeBuildHistory (name, data) {
	return Promise.fromNode(function (callback) {
		s3.putObject({
			Bucket: config.s3bucket,
			Key: config.buildHistoryFile.replace('{{name}}', name),
			ContentType: 'text/json',
			ACL: 'bucket-owner-full-control',
			Body: JSON.stringify(data)
		}, callback);
	});
}

function npmPack (target) {
	return new Promise(function (resolve, reject) {
		exec('npm pack', {
			cwd: target
		}, function (err, stdout, stderr) {
			if (err) return reject(err);
			if (stderr.length) return reject(new Error('npm pack output an error: ' + stderr.toString()));
			return resolve(stdout.toString());
		});
	});
}

function s3upload (filePath, bucket, key) {
	return Promise.fromNode(function (callback) {
		fs.readFile(filePath, callback);
	}).then(function (body) {
		return Promise.fromNode(function (callback) {
			s3.upload({
				ACL: 'bucket-owner-read',
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: 'application/octet-stream'
			}, callback);
		});
	});
}

function signURL (location, expiration) {
	var epo = Math.floor(expiration.getTime() / 1000);
	var str = 'GET\n\n\n' + epo + '\n' + urlparse(location).pathname;
	var hashed = hmacSha1(str, config.aws.secretAccessKey);

	var url = location +
		'?Expires=' + epo +
		'&AWSAccessKeyId=' + config.aws.accessKeyId +
		'&Signature=' + encodeURIComponent(hashed);

	return url;
}

function makeNewBuild (target, projectName, buildHistory) {
	var packedFile, buildDestination;

	var lastBuild = buildHistory[0] || { index: 0 };
	var newBuild = {
		index: lastBuild.index + 1
	};
	buildHistory.unshift(newBuild);

	buildDestination = config.buildDestination
		.replace('{{name}}', projectName)
		.replace('{{build}}', newBuild.index);

	process.stdout.write('Done\n');
	console.log('Current build number: ', newBuild.index);

	process.stdout.write('Packing project...');

	return npmPack(target)
	.then(function (output) {
		packedFile = path.resolve(target, output.trim());
		process.stdout.write('Done: ' + packedFile + '\n');

		process.stdout.write('Uploading build to S3...');
		return s3upload(
			packedFile,
			config.s3bucket,
			buildDestination
		);
	})
	.then(function (res) {
		process.stdout.write('Done\n');

		var expiration = new Date();
		expiration.setDate(expiration.getDate() + 30);

		var url = signURL(res.Location, expiration);

		newBuild.s3 = res;
		newBuild.url = url;
		newBuild.urlExpires = expiration;

		console.log('Build complete: ', newBuild);

		process.stdout.write('Updating build history...');
		return writeBuildHistory(projectName, buildHistory);
	})
	.then(function () {
		process.stdout.write('Done\n');
	});
}

function deployBuild (build) {
	var expiration = new Date();
	expiration.setDate(expiration.getDate() + 1);

	if (!build || !build.s3 || !build.s3.Location) {
		return Promise.reject(new Error('Build does not have an S3 url.'));
	}

	var url = signURL(build.s3.Location, expiration);

	return new Promise(function (resolve, reject) {
		spawn('npm', ['i', '--production', url], {
			stdio: 'inherit'
		}).on('error', reject).on('close', function (code) {
			if (code) return reject(new Error('NPM Exited non-zero: ' + code));
			return resolve();
		});
	});
}

config = require('rc')('deployer', {
	aws: {
		'accessKeyId': process.env.AWS_ACCESS_KEY_ID || '',
		'secretAccessKey': process.env.AWS_SECRET_ACCESS_KEY || '',
		'region': process.env.AWS_DEFAULT_REGION || 'us-east-1'
	},
	s3bucket: 'taut.us',
	buildHistoryFile: 'builds/{{name}}/builds.json',
	buildDestination: 'builds/{{name}}/{{build}}.tgz'
});

/** **********************************************************************************************/

if (!config.aws.accessKeyId) {
	fail('Could not find AWS credentials.');
}

aws = require('aws-sdk');
aws.config.update(config.aws);
s3 = new aws.S3();

Promise.resolve(require('minimist')(process.argv.slice(2)))
.then(function (argv) {
	var target = argv._[0];

	if (!target) fail('No target found.');

	target = path.resolve(process.cwd(), target);

	if (!isDir(target)) fail('Target is not a directory.', target);

	var pkgPath = path.join(target, 'package.json');
	if (!isFile(pkgPath)) {
		fail('Target is not a node app.', pkgPath);
	}

	var pkg = require(pkgPath);
	var projectName = pkg.name;

	if (argv.verbose) console.log('Found project: ', projectName);

	if (argv.verbose) process.stdout.write('Loading build history...');

	return readBuildHistory(projectName).then(function (buildHistory) {
		buildHistory = buildHistory || [];
		var lastBuild = buildHistory[0] || { index: 0 };

		if (argv.verbose) {
			console.log('Done\nLast build was ', lastBuild.index);
		}

		if (argv.url) {
			var targetBuild;
			if (argv.url === true) targetBuild = lastBuild;
			else {
				var i = 0;
				while (i < buildHistory.length) {
					if (buildHistory[i] && [i].index == argv.url) {
						targetBuild = buildHistory[i];
						break;
					}
					i++;
				}
				if (!targetBuild) {
					fail('Build not found: ', argv.url);
				}
			}

			var expiration = new Date();
			expiration.setDate(expiration.getDate() + 1);

			return console.log(signURL(targetBuild.s3.Location, expiration));
		}

		if (argv.deploy) {
			var targetBuild;
			if (argv.deploy === true) targetBuild = lastBuild;
			else {
				var i = 0;
				while (i < buildHistory.length) {
					if (buildHistory[i] && [i].index == argv.deploy) {
						targetBuild = buildHistory[i];
						break;
					}
					i++;
				}
				if (!targetBuild) {
					fail('Build not found: ', argv.deploy);
				}
			}

			return deployBuild(targetBuild);
		}

		return makeNewBuild(target, projectName, buildHistory);
	});
})
.catch(fail);
