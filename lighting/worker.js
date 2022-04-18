let Lighting = require('./lighter');
let Vorld = require('../core/vorld');

onmessage = function(e) {

	let id = e.data.id;
	let vorld = e.data.vorld;
	let bounds = e.data.bounds;
	let count = 0, total = Object.keys(vorld.heightMap).length;

	Lighting.performLightingPass(vorld, bounds, () => {
		count++;
		this.postMessage({ id: id, progress: count / total });
	});

	if (bounds) {
		// Reduce result into bounds requested
		vorld = Vorld.createSlice(vorld, bounds.iMin, bounds.iMax, bounds.jMin, bounds.jMax, bounds.kMin, bounds.kMax);
	}
	this.postMessage({ id: id, complete: true, vorld: vorld });
};