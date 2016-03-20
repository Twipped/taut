define(['jquery'], function ($) {
	$(function () {
		$('.js-component[data-component]:not(.js-component-bound)').each(function (i, div) {
			var $div = $(div);

			require(['components/' + $div.attr('data-component') + '/main'], function (Component) {
				var c = new Component({ el: $div });
				$div.data('component', c);
				$div.addClass('js-component-bound');
			});
		});
	});
});
