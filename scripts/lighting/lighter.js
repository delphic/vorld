const Lighting = require('../lighting');

module.exports = (function(){
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
		
			// NOTE: Even though we're only copying back bounds we need to run for the adjacent chunks heightmap areas
			// too as they may be required to propogate light into overhangs

			// Question - is this repeated flood fill on neighbouring blocks the fastest way? 
			// For certain configurations might it be better to min -> max -> half -> quarter etc) or is it precisely the same? 
			let l = vorld.chunkSize;
			for (let k = 0; k < l; k++) {
				for (let i = 0; i < l; i++) {
					let x = chunkI * l + i,
						y = heightMapEntry.maxChunkIndex * l + 15,
						z = chunkK * l + k;

					Lighting.addSunlight(vorld, x, y, z);
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