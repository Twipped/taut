/* eslint-env browser */

define(['jquery', 'backbone'], function ($, Backbone) {
	return Backbone.View.extend({
		currentPosition: 0,
		isAtBottom: false,
		scrollSpeed: 500,
		threshold: 100,
		isScrolling: false,
		ready: false,
		el: document,

		initialize: function () {
			var self = this;
			$(function () {
				self.ready = true;
				self.scrollToBottom(true);
			});
		},

		scrollToBottom: function (force) {
			var el = this.$el[0];
			var scrollTarget = (el === document) ? document.body : el;
			var height = (el === document) ? $(window).height() : el.clientHeight;
			var y = scrollTarget.scrollHeight - height;

			this.scrollTo(y, force);
		},

		scrollToElement: function (element, force) {
			var el = this.$el[0];
			var scrollTarget = (el === document) ? document.body : el;
			var scrollHeight = scrollTarget.scrollHeight;

			if (typeof element === 'number') {
				return this.scrollTo(element, force);
			}

			var $element = $(element);
			var y = $element.position().top;
			y += scrollTarget.scrollTop;
			y += $element.height();
			y = Math.max( 0, Math.min( y, scrollHeight ) );

			return this.scrollTo(y, force);
		},

		scrollTo: function (y, force) {
			var self = this;
			var el = this.$el[0];
			var scrollTarget = (el === document) ? document.body : el;

			if (force) {
				scrollTarget.scrollTop = y;
				this.onScroll();
				return;
			}

			if ( this.isScrolling || this.currentPosition <= 1 && this.ready ) {

				if (this.isScrolling) {
					this.isScrolling.stop();
					this.isScrolling = false;
				}

				if (!this.scrollSpeed) {
					scrollTarget.scrollTop = y;
					this.onScroll();
					return;
				}

				this.isScrolling = $(scrollTarget);
				this.isScrolling.animate({ scrollTop: y }, {
					duration: this.scrollSpeed,
					complete: function () {
						self.isScrolling = false;
						self.onScroll();
					}
				});
			}
		},

		events: {
			'scroll': 'onScroll',
			'resize': 'onResize'
		},

		onScroll: function () {
			var el = this.$el[0];
			var scrollTarget = (el === document) ? document.body : el;
			if (el === document) {
				this.currentPosition = scrollTarget.scrollHeight - scrollTarget.scrollTop - $(window).height();
			} else {
				this.currentPosition = el.scrollHeight - el.scrollTop - el.clientHeight;
			}
			this.isAtBottom = scrollTarget.scrollHeight - scrollTarget.scrollTop <=
				scrollTarget.clientHeight + this.threshold;
			this.isAtTop = scrollTarget.scrollTop === 0;

			this.trigger('scrolled', this.isAtTop, this.isAtBottom);
		},

		onResize: function () {
			if (this.isAtBottom) {
				this.scrollToBottom(true);
			}
		}
	});
});
