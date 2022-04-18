module.exports = (function(){
	let exports = {};

	// TODO: Move to Heightmap module?
	exports.calculateMeanAndVariance = (out, heightMap) => {
		let keys = Object.keys(heightMap);

		for (let i = 0, l = keys.length; i < l; i++) {
			let key = keys[i];
			let entry = heightMap[key];
			
			let n = entry.maxY.length;
			let mean = 0;
			for (let j = 0; j < n; j++) {
				mean += entry.maxY[j];
			}
			mean /= n;

			out[key].mean = mean;

			let variance = 0;
			for (let j = 0; j < n; j++) {
				let diff = entry.maxY[j] - mean;
				variance += diff * diff;
			}
			variance /= n;

			out[key].variance = variance;
		}
	};

	return exports;
})();