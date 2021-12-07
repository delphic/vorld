// Seedable 'random' number generators for use with generation
// As Math.random can not be seeded.
module.exports = (function() {
	let exports = {};

	exports.fromString = function(seed) {
		// Predicatable sort of random numbers from a string
		let minCode = seed.charCodeAt(0), maxCode = seed.charCodeAt(0);
		for(let n = 1, l = seed.length; n < l; n++) {
			minCode = Math.min(minCode, seed.charCodeAt(n));
			maxCode = Math.max(maxCode, seed.charCodeAt(n));
		}
		
		let number = function(index) {
			return (seed.charCodeAt(index) - (minCode - 0.0001)) / (maxCode - minCode + 0.001);
		};

		let i = 0, j = Math.floor(seed.length*number(0));
		return function() {
			let result = 0.5 * (number(i) + number(j));
			i+=1;
			j+=2;
			if (i >= seed.length) { i = 0; }
			if (j >= seed.length) { j = j % seed.length; }
			return result;
		};
	};

	return exports;
})();