
var test = require('tap').test;
var emittersocket = require('../../lib/emitter-socket');

test('emitter socket', function (tmain) {

	test('connects and sends messages both ways', function (t) {
		t.plan(10);

		var server = emittersocket.createServer(function (socket) {
			t.pass('server received connection');
			socket.bus.on('step1', function (data1, data2) {
				t.pass('server received from client');
				t.equal(data1, 21);
				t.equal(data2, '12');

				socket.bus.send('step2', ['foo', 'bar'], { foo:'bar' });
			});

			socket.on('end', function () {
				t.pass('client hungup');
				socket.destroy();
				server.close(t.end);
			});
		});
		server.listen(55555, function () {
			t.pass('server is listening');

			var client = emittersocket.connect(55555, function () {
				t.pass('client connected');

				client.bus.send('step1', 21, '12');
			});

			client.bus.on('step2', function (data1, data2) {
				t.pass('client received from server');
				t.same(data1, ['foo', 'bar']);
				t.same(data2, { foo: 'bar' });

				client.end();
				client.destroy();
			});

		});

	});

	tmain.end();
});
