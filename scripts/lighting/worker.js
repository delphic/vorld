const Lighting = require('./lighter');
const Vorld = require('../world');

module.exports = (function(){
	let exports = {};

	exports.execute = function(data, postMessage) {
		let id = data.id;
		let vorld = data.vorld;
		let bounds = data.bounds;
		let count = 0, total = Object.keys(vorld.heightMap).length;
	
		Lighting.performLightingPass(vorld, bounds, () => {
			count++;
			postMessage({ id: id, progress: count / total });
		});
	
		if (bounds) {
			// Reduce result into bounds requested
			vorld = Vorld.createSlice(vorld, bounds.iMin, bounds.iMax, bounds.jMin, bounds.jMax, bounds.kMin, bounds.kMax);
		}
		postMessage({ id: id, complete: true, vorld: vorld });
	};

	return exports;
})();