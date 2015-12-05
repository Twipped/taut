
define(['lodash', 'backbone', 'chatview/backbone', 'socket'], function (_, Backbone, ChatView, socket) {

	var TIMEOUT = 30000;
	var feeds = {};

	function subscribe (feed, existingContent) {
		var cv = feeds[feed];

		if (cv) {
			cv.subscriberCount++;
			if (cv.timeout) {
				clearTimeout(cv.timeout);
			}
			return feeds[feed];
		}

		cv = new ChatView();
		cv.add(existingContent);

		cv.subscriberCount = 1;

		cv.socketHook = function (event) {cv.add(event);};

		var lastEvent = cv.events.array[cv.events.array.length - 1];

		socket.on(feed, cv.socketHook);
		socket.subscribe(feed, lastEvent && lastEvent.timestamp);

		feeds[feed] = cv;
		return cv;
	}

	function unsubscribe (feed) {
		var cv = feeds[feed];

		if (!cv) {
			return;
		}

		cv.subscriberCount--;

		if (cv.subscriberCount < 1) {
			cv.timeout = setTimeout(function () {
				delete feeds[feed];
				socket.unsubscribe(feed);
				socket.removeListener(feed, cv.socketHook);
				cv.socketHook = null;
			}, TIMEOUT);
		}
	}

	return {
		subscribe: subscribe,
		unsubscribe: unsubscribe
	};
});
