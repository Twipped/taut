#!/usr/bin/env node
/* eslint no-console:0, no-process-exit:0, one-var:0 */

var Promise = require('bluebird');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var makeSigner = require('amazon-s3-url-signer').urlSigner;
var aws, s3, config;

function fail () {
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
var urlsigner = makeSigner(config.aws.accessKeyId, config.aws.secretAccessKey);
s3 = new aws.S3();

var target, projectName, packedFile, buildHistory, lastBuild, newBuild;

Promise.resolve(process.argv.slice(2))
.then(function (args) {
	target = args[0];

	if (!target) fail('No target found.');

	target = path.resolve(process.cwd(), target);

	if (!isDir(target)) fail('Target is not a directory.', target);

	var pkgPath = path.join(target, 'package.json');
	if (!isFile(pkgPath)) {
		fail('Target is not a node app.', pkgPath);
	}

	var pkg = require(pkgPath);
	projectName = pkg.name;

	console.log('Found project: ', projectName);

	process.stdout.write('Loading build history...');

	return readBuildHistory(projectName);
})
.then(function (data) {
	buildHistory = data || [];
	lastBuild = buildHistory[0] || { index: 0 };
	newBuild = {
		index: lastBuild.index + 1
	};
	buildHistory.unshift(newBuild);

	process.stdout.write('Done\n');
	console.log('Current build number: ', newBuild.index);

	process.stdout.write('Packing project...');
	return npmPack(target);
}).then(function (output) {
	packedFile = path.resolve(target, output.trim());
	process.stdout.write('Done: ' + packedFile + '\n');

	process.stdout.write('Uploading build to S3...');
	return s3upload(
		packedFile,
		config.s3bucket,
		config.buildDestination
			.replace('{{name}}', projectName)
			.replace('{{build}}', newBuild.index)
	);
})
.then(function (res) {
	var url = urlsigner.getUrl('GET', res.Key, res.Bucket, 60 * 24 * 30);
	process.stdout.write('Done\n');
	console.log('Build available at: ', url);

	var expiration = new Date();
	expiration.setDate(expiration.getDate() + 30);

	newBuild.key = res.Key;
	newBuild.url = url;
	newBuild.urlExpires = expiration;

	process.stdout.write('Updating build history...');
	return writeBuildHistory(projectName, buildHistory);
})
.then(function () {
	process.stdout.write('Done\n');
})
.catch(fail);
