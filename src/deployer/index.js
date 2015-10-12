#!/usr/bin/env node

var Promise = require('bluebird');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var makeSigner = require('amazon-s3-url-signer').urlSigner;


function fail (msg) {
	console.error.apply(console, arguments);
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

var config = require('rc')('deployer', {
	aws: {
		"accessKeyId": "",
		"secretAccessKey": "",
		"region": "us-east-1"
	},
	s3: {
		bucket: '',
		key: 'builds/{{name}}/{{build}}/package.tgz'
	}
});

if (!config.aws.accessKeyId) {
	fail('Could not load AWS credentials.');
}

var aws = require('aws-sdk');
aws.config.update(config.aws);

var urlsigner = makeSigner(config.aws.accessKeyId, config.aws.secretAccessKey);

var s3 = new aws.S3();

var target = argv._[0];

if (!target) fail('No target found.');

target = path.resolve(process.cwd(), target);

if (!isDir(target)) {
	fail('Target is not a directory.', target);
}

var pkgPath = path.join(target, 'package.json');
var buildFilePath = path.join(target, 'build.json');

if (!isFile(pkgPath)) {
	fail('Target is not a node app.', pkgPath);
}

var pkg = require(pkgPath);

process.stdout.write('Found project: ' + pkg.name + '\nPacking project...');

var packedFile, build;

npmPack(target).then(function (output) {
	packedFile = path.resolve(target, output).trim();
	process.stdout.write('Done: ' + packedFile + '\n');

	return readBuild();
})
.then(function (data) {
	build = data;
	build.index++;
	process.stdout.write('Current build number is ' + build + '\n');
	process.stdout.write('Uploading build to S3...');
	
	return s3upload(
		packedFile,
		config.s3.bucket,
		config.s3.key
			.replace('{{name}}', pkg.name)
			.replace('{{build}}', process.env.CI_BUILD_NUMBER || build.index)
	);
})
.then(function (res) {
	var url = urlsigner.getUrl('GET', res.Key, res.Bucket, 10);
	process.stdout.write('Done: ' + url + '\n');

	return writeBuild(build).then(function () {return url;});
}).catch(console.error);

function readBuild () {
	return isFile(buildFilePath) && require(buildFilePath) || {index: 0};
}

function writeBuild (data) {
	return Promise.fromNode(function (callback) {
		fs.writeFile(buildFilePath, JSON.stringify(data), callback);
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
		})
	});
}

