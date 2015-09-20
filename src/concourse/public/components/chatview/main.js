'use strict';

define(['backbone', 'chatview/index'], function (Backbone, ChatView) {
	return Backbone.View.extend({
		initialize: function () {
			this.cv = new ChatView();

			var events = this.$('script[type="text/json"]').html();
			try {
				events = JSON.parse(events);
			} catch (e) {
				events = [];
			}

			this.cv.add(events);

			this.$el.html(this.cv.toString());
		}
	});
});
