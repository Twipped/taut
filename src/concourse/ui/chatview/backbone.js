/* eslint-env browser */

define(['lodash', 'backbone', 'chatview/index'], function (_, Backbone, ChatView) { // eslint-disable-line

	_.assign(ChatView.prototype, Backbone.Events, {
		onRowAppend: function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift('row:append');
			this.trigger.apply(this, args);
		},

		onRowUpdate: function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift('row:update');
			this.trigger.apply(this, args);
		},

		onRowReplace: function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift('row:replace');
			this.trigger.apply(this, args);
		}
	});

	return ChatView;
});
