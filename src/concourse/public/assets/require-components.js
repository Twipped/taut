define(['jquery'], function ($) {
	$(function () {
		$('[data-component]:not([data-noview])').each(function (i, div) {
			var $div = $(div);

			require(['components/' + $div.attr('data-component') + '/main'], function (Component) {
				new Component({el: $div});
			});
		});
	});
});
