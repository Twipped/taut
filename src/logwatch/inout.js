
var Emitter = require('events').EventEmitter;
var blessed = require('blessed');

module.exports = function () {
	var inout = new Emitter();

	inout._screen = blessed.screen();

	function quit () {
		inout.emit('quit');
	}

	inout._screen.key(['C-c'], quit);

	var outputBox = inout._output = blessed.box({
		parent: inout._screen,
		top: 0,
		left: 0,
		right: 0,
		bottom: 1,
		scrollable: true,
		alwaysScroll: true
	});

	var inputBox = inout._input = blessed.textbox({
		parent: inout._screen,
		height: 1,
		left: 0,
		right: 0,
		bottom: 0,
		bg: 'black',
		fg: 'white',
		inputOnFocus: true,
		tags: true
	});

	inout.output = function (line) {
		outputBox.pushLine([line]);
		outputBox.setScrollPerc(100);
		inout._screen.render();
	};

	inputBox.key(['C-c'], quit);
	inputBox.key(['enter'], function () {
		var value = inputBox.getValue().trim();
		inputBox.clearValue();
		inputBox.focus();
		if (value) {
			inout.emit('data', value);
		}
	});
	inputBox.focus();

	inout._screen.render();

	return inout;
};


