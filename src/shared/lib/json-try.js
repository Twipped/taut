
module.exports = function (input) {
	try {
		return JSON.parse(input);
	} catch (e) {
		return undefined;
	}
};
