define(['jquery'], function ($) {
	$(function () {
		$('.js-component[data-component]:not(.js-component-bound)').each(function (i, div) {
			var $div = $(div);

			require(['components/' + $div.attr('data-component') + '/main'], function (Component) {
				new Component({el: $div});
				$div.addClass('js-component-bound');
			});
		});
	});
});
