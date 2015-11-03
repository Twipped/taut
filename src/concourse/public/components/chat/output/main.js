/* eslint-env browser */

define(['jquery', 'lodash', 'backbone', 'feed-manager', 'scroller'], function ($, _, Backbone, FeedMan, Scroller) { // eslint-disable-line
	return Backbone.View.extend({
		initialize: function (options) {
			this.scroller = new Scroller({ el: this.$el });

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

			var feed = this.feed = options.feed || this.$el.attr('data-feed');

			var cv = this.cv = FeedMan.subscribe(feed, events);

			var fragment = $(document.createDocumentFragment());
			var rows = cv.toRows();
			
			_.each(rows, function (row) {
				row.$el = $(row.html);
				fragment.append(row.$el);
			});

			this.$el.html(fragment);
			this.scroller.scrollToBottom();

			this.listenTo(cv, 'row:append', this.onRowAppend);
			this.listenTo(cv, 'row:update', this.onRowUpdate);
			this.listenTo(cv, 'row:replace', this.onRowReplace);
		},

		remove: function() {
			FeedMan.unsubscribe(this.feed);
			this.cv = null;
			this._removeElement();
			this.stopListening();
			return this;
		},

		onRowAppend: function (row) {
			var $row = $(row.html);
			row.$el = $row;

			this.$el.append($row);

			if (this.scroller.isAtBottom) {
				this.scroller.scrollToElement($row);
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
