/* eslint no-shadow:0, max-params:0 */

var test = require('tape').test;
var pwhash = require('../../lib/passwords');

test('passwords', function (t) {

	t.test('encrypt & decrypt', function (t) {
		var input = 'i am the very model of a modern major general';
		var key = 'some insanely long password key of epic proportions';

		var encoded = pwhash.encrypt(key, input);

		t.equal(encoded, 'gh5TAvAB+oqBpBRGTI4JNHLRYnl52sm5q4NDF5iz8qG3eBI+4RpHyzR1186MWyql');

		var decoded = pwhash.decrypt(key, encoded);

		t.equal(decoded, input);

		t.end();
	});

	t.test('encrypt empty string', function (t) {
		var key = 'some insanely long password key of epic proportions';

		var encoded = pwhash.encrypt(key, '');

		t.equal(encoded, '');

		t.end();
	});

	t.test('decrypt empty string', function (t) {
		var key = 'some insanely long password key of epic proportions';

		var decoded = pwhash.decrypt(key, '');

		t.equal(decoded, '');

		t.end();
	});
});
