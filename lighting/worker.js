let Lighting = require('./lighting');
let Vorld = require('../core/vorld');

onmessage = function(e) {

	let vorld = e.data.vorld;
	let bounds = e.data.bounds;
	let count = 0, total = Object.keys(vorld.heightMap).length;

	Lighting.performLightingPass(vorld, bounds, () => {
		count++;
		this.postMessage({ progress: count / total });
	});

	if (bounds) {
		// Reduce result into bounds requested
		vorld = Vorld.createSlice(vorld, bounds.iMin, bounds.iMax, bounds.jMin, bounds.jMax, bounds.kMin, bounds.kMax);
	}
	this.postMessage({ complete: true, vorld: vorld });
};