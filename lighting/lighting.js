let Vorld = require('../core/vorld');

let Lighting = module.exports = (function(){
	let exports = {};

	exports.performLightingPass = (vorld, bounds, progressDelegate) => {
		// Need to operate on a slice 1 larger than bounds as per meshing
		// when working on sub-sections

		// Loop over heightmap, add sunlight (15) to top of vorld
		let keys = Object.keys(vorld.heightMap);
		for (let keyIndex = 0, kl = keys.length; keyIndex < kl; keyIndex++) {
			let heightMapEntry = vorld.heightMap[keys[keyIndex]];
			let chunkI = heightMapEntry.chunkI,
				chunkK = heightMapEntry.chunkK;
		
			// Only add sunlight inside bounds (note BFS still searches outside bounds this is necessary for certain cases)
			if (bounds && (chunkI < bounds.iMin || chunkI > bounds.iMax || chunkK < bounds.kMin || chunkK > bounds.kMax)) {
				progressDelegate();
				continue;
			}

			// Question - is this repeated flood fill on neighbouring blocks the fastest way? 
			// For certain configurations might it be better to min -> max -> half -> quarter etc) or is it precisely the same? 
			for (let i = 0, l = vorld.chunkSize; i < l; i++) {
				for (let k = 0; k < l; k++) {
					let x = chunkI * l + i,
						y = heightMapEntry.maxChunkIndex * l + 15,
						z = chunkK * l + k;

					Vorld.addSunlight(vorld, x, y, z);
				}
			}

			if (progressDelegate) {
				progressDelegate();
			}
		}

		// TODO: Loop over light sources and propagate light
	};

	return exports;
})();