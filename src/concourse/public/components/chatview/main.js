'use strict';

define(['backbone', 'chatview/index', 'socket'], function (Backbone, ChatView, socket) {
	return Backbone.View.extend({
		initialize: function (options) {
			var cv = this.cv = new ChatView();
			cv.onRowUpdate = this.onRowUpdate.bind(this);
			cv.onRowAppend = this.onRowAppend.bind(this);

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

			cv.add(events);

			var feed = options.feed || this.$el.attr('data-feed');

			if (feed) {
				socket.subscribe(feed);
				socket.on(feed, function (event) {
					cv.add(event);
				});
			}

			this.$el.html(cv.toString());
		},

		onRowAppend: function (row) {
			this.$el.append(row.html);
		},

		onRowUpdate: function (row) {
			var $row = this.$('.chat-row[data-hash="' + row.hash + '"]');
			$row.replaceWith(row.html);
		}
	});
});
