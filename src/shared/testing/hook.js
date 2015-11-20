
module.exports = function (original, options) {

	if (typeof options === 'function') {
		options = { pre: options };
	} else {
		options = options || {};
	}

	var fn = function () {
		var context = typeof options.ctx !== 'undefined' ? options.ctx : this;

		if (options.pre) options.pre.apply(context, arguments);

		original.apply(context, arguments);

		if (options.post) options.post.apply(context, arguments);
	};

	fn.original = original;

	return fn;
};
