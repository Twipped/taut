'use strict';

define(['backbone', './main.hbs'], function (Backbone, tmpl) {
	return Backbone.View.extend({
		initialize: function () {
			this.$el.html(tmpl());
		}
	});
});
