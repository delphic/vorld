let Vorld = require('../core/vorld');

let Lighting = module.exports = (function(){
	let exports = {};

	exports.performLightingPass = (vorld, bounds, progressDelegate) => {
		// Need to operate on a slice 1 larger than bounds as per meshing
		// when working on sub-sections

		// Loop over heightmap, fill with full sunlight (15) in all blocks above yMax
		let keys = Object.keys(vorld.heightMap);
		for (let keyIndex = 0, kl = keys.length; keyIndex < kl; keyIndex++) {
			let heightMapEntry = vorld.heightMap[keys[keyIndex]];
			let chunkI = heightMapEntry.chunkI,
				chunkK = heightMapEntry.chunkK;
			let chunkJ, j;
				
			for (let i = 0, l = vorld.chunkSize; i < l; i++) {
				for (let k = 0; k < l; k++) {
					let maxY = heightMapEntry.maxY[i + l * k]; // highest point
					if (maxY !== undefined) {
						chunkJ = Math.floor(maxY / l);
						j = maxY - chunkJ * l + 1;
					} else {
						chunkJ = heightMapEntry.minChunkIndex;
						j = 0;
					}
					Vorld.fillSunlight(vorld, heightMapEntry, chunkI, chunkJ, chunkK, i, j, k, 15);
				}
			}

			if (progressDelegate) {
				progressDelegate();
			}
		}

		// Need to propagate sunlight for non-opaque blocks beneath yMax with adjacent sunlight 
		for (let keyIndex = 0, kl = keys.length; keyIndex < kl; keyIndex++) {
			let heightMapEntry = vorld.heightMap[keys[keyIndex]];
			let chunkI = heightMapEntry.chunkI,
				chunkK = heightMapEntry.chunkK;
		
			// Only propagate sunlight inside bounds (note BFS still searches outside bounds - TODO: prevent that!)
			if (bounds && (chunkI < bounds.iMin || chunkI > bounds.iMax || chunkK < bounds.kMin || chunkK > bounds.kMax)) {
				progressDelegate();
				continue;
			}

			for (let i = 0, l = vorld.chunkSize; i < l; i++) {
				for (let k = 0; k < l; k++) {
					let offset = 0;
					let x = chunkI * l + i,
						y = heightMapEntry.maxChunkIndex * l + 15,
						z = chunkK * l + k;
					// Assuming continuous again as it's quicker - TODO: Cope with missing chunks
					while (!Vorld.isBlockOpaque(vorld, x, y - offset, z) && Vorld.getBlock(vorld, x, y - offset, z) !== null) {
						// As we've pre-filled our full sunlight beams need to go block by block until we hit a block 
						// (could use our heightMap value here, it's much the same though)
						Vorld.propagateSunlight(vorld, x, y - offset, z);
						offset += 1;
					}

					// TODO: refactor so propagateSunlight checks heightmap rather than light level for if to try to set and push new values
					// this will allow us to just call propagate sunlight from top of world once rather than fill then propogate - in fact this would be a
					// "addSunlight" method as per "addLight" - this would also give us a way to cope with missing chunk although it wouldn't prevent artifacts where
					// solid chunks were on a boundary against a null chunk
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