
(function () {
	if (typeof define !== 'function') return require('amdefine')(module);
	return define;
})()(['lodash', 'moment', 'handlebars', './templates'], function (_, moment, handlebars, templates) {

	_.each(templates, function (template, key) {
		templates[key] = handlebars.compile(template);
	});

	function makeRow (event) {
		return {
			type: event.event,
			timestamp: event.timestamp,
			hash: event.hash,
			html: '',
			events: [event]
		};
	}

	function View () {
		this.rows = [];

		//copy from the prototype at creation to avoid a static object
		this.templates = _.assign({}, this.templates);

		this.onRowUpdate = function () {};
		this.onRowAppend = function () {};
	}

	View.makeRow = makeRow;

	View.prototype.templates = _.assign({}, templates);

	View.prototype.toString = function () {
		return this.rows.map(function (row) {return row.html || '';}).join('');
	};

	View.prototype.rerender = function (extraEvents) {
		var data = this.rows.map(function (row) {return row.events;});
		if (Array.isArray(extraEvents)) data.push(extraEvents);
		data = Array.prototype.concat.apply([], data); //combine all events into a collection.
		data.sort(function eventSorter (a, b) {
			if (a.timestamp > b.timestamp) return 1;
			if (b.timestamp > a.timestamp) return -1;

			if (a.hash > b.hash) return 1;
			if (b.hash > a.hash) return -1;

			return 0;
		});

		this.rows = [];
		this.add(data);
	};

	View.prototype.add = function add (event) {
		var self = this;
		if (Array.isArray(event)) return event.forEach(function (e) {
			self.add(e);
		});

		if (!event) return;

		var last = this.rows[this.rows.length - 1];

		if (this['$' + event.event]) {
			this['$' + event.event](event, last);
		} else {
			this.$default(event, last);
		}
	};

	View.prototype.$default = function (event) {
		var row = makeRow(event);
		row.html = this.templates.default(row);

		this.rows.push(row);
		return this.onRowAppend(row);
	};

	View.prototype.$privmsg = function (event, previousRow) {
		if (previousRow && previousRow.type === 'privmsg' && previousRow.nick === event.nick) {
			previousRow.events.push(event);
			previousRow.html = this.templates.privmsg(previousRow);
			return this.onRowUpdate(previousRow);
		}

		var row = makeRow(event);
		row.nick = event.nick;
		row.html = this.templates.privmsg(row);

		this.rows.push(row);
		return this.onRowAppend(row);
	};

	View.prototype.$joinLeave = function (event, previousRow) {
		if (previousRow && (previousRow.type === 'join' || previousRow.type === 'part' || previousRow.type === 'quit')) {
			previousRow.events.push(event);
			switch (event.event) {
			case 'join': previousRow.incoming.push(event); break;
			case 'part': previousRow.outgoing.push(event); break;
			case 'quit': previousRow.outgoing.push(event); break;
			}
			previousRow.html = this.templates.joinLeave(previousRow);

			return this.onRowUpdate(previousRow);
		}

		var row = makeRow(event);
		row.nick = event.nick;
		row.incoming = [];
		row.outgoing = [];
		switch (event.event) {
		case 'join': row.incoming.push(event); break;
		case 'part': row.outgoing.push(event); break;
		case 'quit': row.outgoing.push(event); break;
		}
		row.html = this.templates.joinLeave(row);

		this.rows.push(row);
		return this.onRowAppend(row);
	};

	View.prototype.$join = View.prototype.$joinLeave;
	View.prototype.$part = View.prototype.$joinLeave;
	View.prototype.$quit = View.prototype.$joinLeave;

	return View;
});
