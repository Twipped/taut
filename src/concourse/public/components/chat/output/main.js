/* eslint-env browser */

define(['jquery', 'lodash', 'backbone', 'chatview/index', 'socket', 'scroller'], function ($, _, Backbone, ChatView, socket, Scroller) { // eslint-disable-line
	return Backbone.View.extend({
		initialize: function (options) {
			var cv = this.cv = new ChatView();
			cv.onRowUpdate = this.onRowUpdate.bind(this);
			cv.onRowAppend = this.onRowAppend.bind(this);
			cv.onRowReplace = this.onRowReplace.bind(this);

			this.scroller = new Scroller({el: this.$el});

			var events;
			if (options.events) {
				events = options.events;
			} else {
				events = this.$('script[type="text/json"]').html();
				try {
					events = JSON.parse(events);
				} catch (e) {
					events = [];
				}
			}

			events.sort(cv._sorter);

			this.fragment = $(document.createDocumentFragment());

			cv.add(events);

			this.$el.html(this.fragment);
			this.fragment = null;

			var feed = options.feed || this.$el.attr('data-feed');

			if (feed) {
				socket.subscribe(feed);
				socket.on(feed, function (event) {
					cv.add(event);
				});
			}

			$('html, body').scrollTop($(document).height());
		},

		onRowAppend: function (row) {
			var $row = $(row.html);
			row.$el = $row;

			if (this.fragment) {
				this.fragment.append($row);
			} else {
				this.$el.append($row);

				if (this.scroller.isAtBottom) {
					this.scroller.scrollToElement($row);
				}
			}
		},

		onRowUpdate: function (row) {
			var $container = this.fragment || this.$el;
			var $row;

			$row = row.$el || $container.find('.chat-row[data-hash="' + row.hash + '"]');
			row.$el = $(row.html);
			$row.replaceWith(row.$el);

			if (!this.fragment && this.scroller.isAtBottom) {
				this.scroller.scrollToElement(row.$el);
			}
		},

		onRowReplace: function (oldRows, newRows) {
			var $container = this.fragment || this.$el;
			var first = oldRows.shift();
			var $first = first.$el || $container.find('.chat-row[data-hash="' + first.hash + '"]');

			oldRows.forEach(function (row) {
				if (row.$el) row.$el.remove();
				else $container.find('.chat-row[data-hash="' + row.hash + '"]').remove();
			});

			var $set = $(document.createDocumentFragment());
			newRows.forEach(function (row) {
				row.$el = $(row.html);
				$set.append(row.$el);
			});

			$first.replaceWith($set);
		}
	});
});
