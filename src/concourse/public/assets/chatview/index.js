/* eslint mex-len:0 */

(function (define) {
	define(['lodash', 'moment', 'handlebars', './templates', 'binary-sorted-set'],
	function (_, moment, handlebars, templates, bss) {
		handlebars.registerHelper('linkify', function (message, links) {
			if (!links || !links.length) return message;

			var result = '';
			var lastindex = 0;
			var url;
			var text;

			_.each(links, function (link) {
				url = handlebars.escapeExpression(link.url);
				text = handlebars.escapeExpression(link.text);

				if (link.index - lastindex > 0) {
					result += handlebars.escapeExpression(message.substring(lastindex, link.index));
				}
				result += '<a href="' + url + '" target="_blank">' + text + '</a>';

				lastindex = link.lastIndex;
			});

			if (lastindex < message.length) {
				result += handlebars.escapeExpression(message.substr(lastindex));
			}

			return new handlebars.SafeString(result);
		});

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
			this.events = bss(this._sorter);

			// copy from the prototype at creation to avoid a static object
			this.templates = _.assign({}, this.templates);
		}

		View.makeRow = makeRow;

		View.prototype.templates = _.assign({}, templates);
		View.prototype._sorter = function eventSorter (a, b) {
			if (a.timestamp > b.timestamp) return 1;
			if (b.timestamp > a.timestamp) return -1;

			if (a.hash > b.hash) return 1;
			if (b.hash > a.hash) return -1;

			return 0;
		};

		View.prototype.onRowReplace = function (originals, replacements) {}; // eslint-disable-line
		View.prototype.onRowUpdate = function (row) {}; // eslint-disable-line
		View.prototype.onRowAppend = function (row) {}; // eslint-disable-line

		View.prototype.toString = function () {
			var output = '';
			var lastRow;

			this.events.array.forEach(function (e) {
				if (e.row === lastRow) return;
				lastRow = e.row;
				output += e.row.html;
			});

			return output;
		};

		View.prototype.rerender = function () {
			var data = this.getAllEvents();

			var self = this;
			var last;
			data.forEach(function (event) {
				if (self['$' + event.event]) {
					event.row = self['$' + event.event](event, last);
				} else {
					event.row = self.$default(event, last);
				}
			});
		};

		View.prototype.getAllEvents = function () {
			return this.events.array.concat();
		};

		View.prototype.add = function add (event, silent) {
			var self = this;
			if (Array.isArray(event)) {
				return event.forEach(function (e) {
					self.add(e);
				});
			}

			if (!event) return;

			if (this.events.has(event)) return;

			this.events.add(event);

			var pos = this.events.indexOf(event);
			var prev = pos > 0 && this.events.array[pos - 1];
			var next = pos < this.events.array.length - 1 && this.events.array[pos + 1];

			if (!next) {
				// inserted at the end of the list
				if (self['$' + event.event]) {
					event.row = self['$' + event.event](event, prev && prev.row);
				} else {
					event.row = self.$default(event, prev && prev.row);
				}

				if (!silent) {
					if (!prev || event.row !== prev.row) {
						this.onRowAppend(event.row);
					} else {
						this.onRowUpdate(event.row);
					}
				}
			} else {
				// inserting into the middle.
				var effectedEvents = [];
				var effectedRows = [];
				var newRows = [];
				if (prev) {
					effectedEvents.push.apply(effectedRows, prev.row.events);
					effectedRows.push(prev.row);
				}
				effectedEvents.push(event);
				if (next) {
					effectedEvents.push.apply(effectedRows, prev.row.events);
					effectedRows.push(next.row);
				}

				var previousRow;
				effectedEvents.forEach(function (e) {
					if (self['$' + e.event]) {
						e.row = self['$' + e.event](e, previousRow);
					} else {
						e.row = self.$default(e, previousRow);
					}
					if (e.row !== previousRow) {
						previousRow = e.row;
						newRows.push(e.row);
					}
				});

				if (!silent) {
					this.onRowReplace(effectedRows, newRows);
				}
			}
		};

		View.prototype.$default = function (event) {
			var row = makeRow(event);
			row.html = this.templates.default(row);

			return row;
		};

		View.prototype.$privmsg = function (event, previousRow) {
			if (previousRow && previousRow.type === 'privmsg' && previousRow.nick === event.nick) {
				previousRow.events.push(event);
				previousRow.html = this.templates.privmsg(previousRow);
				return previousRow;
			}

			var row = makeRow(event);
			row.nick = event.nick;
			row.html = this.templates.privmsg(row);

			return row;
		};

		View.prototype.$nick = function (event) {
			var row = makeRow(event);
			row.oldNick = event.nick;
			row.newNick = event.newNick;
			row.html = this.templates.nickChange(row);

			return row;
		};

		View.prototype.$logging = function (event, previousRow) {
			if (previousRow && previousRow.type === event.event) {
				previousRow.events.push(event);
				previousRow.html = this.templates.logging(previousRow);
				return previousRow;
			}

			var row = makeRow(event);
			row.started = event.event === 'logging:started';
			row.stopped = event.event === 'logging:stopped';
			row.html = this.templates.logging(row);

			return row;
		};

		View.prototype['$logging:stopped'] = View.prototype.$logging;
		View.prototype['$logging:started'] = View.prototype.$logging;

		View.prototype.$joinLeave = function (event, previousRow) {
			if (previousRow && (
				previousRow.type === 'join' ||
				previousRow.type === 'part' ||
				previousRow.type === 'quit'
			)) {
				previousRow.events.push(event);
				switch (event.event) {
				case 'join': previousRow.incoming.push(event); break;
				case 'part': previousRow.outgoing.push(event); break;
				case 'quit': previousRow.outgoing.push(event); break;
				default: break;
				}
				previousRow.html = this.templates.joinLeave(previousRow);

				return previousRow;
			}

			var row = makeRow(event);
			row.nick = event.nick;
			row.incoming = [];
			row.outgoing = [];
			switch (event.event) {
			case 'join': row.incoming.push(event); break;
			case 'part': row.outgoing.push(event); break;
			case 'quit': row.outgoing.push(event); break;
			default: break;
			}
			row.html = this.templates.joinLeave(row);

			return row;
		};

		View.prototype.$join = View.prototype.$joinLeave;
		View.prototype.$part = View.prototype.$joinLeave;
		View.prototype.$quit = View.prototype.$joinLeave;

		return View;
	});

})(typeof define !== 'function' ? require('amdefine')(module) : define);
