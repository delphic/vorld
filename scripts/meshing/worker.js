// Sample Mesher worker 

// Workers creates meshes for a vorld slice 
// posts them back with the chunk indices and progress update

// Sends progress update when no mesh is required
// Sends complete message once vorld slice is fully meshed
const Vorld = require('../world');
const Mesher = require('./mesher');

module.exports = (function(){
	let exports = {};

	// Example Post Data
	/*{
		vorld: { ... }
		bounds: {
			iMin: -6, iMax: 6,
			jMin: 0, jMax: 3,
			kMin: -6, kMax: 6
		},
		atlas: {
			textureArraySize: 9,
			blockToTileIndex: [
				null,
				{ side: 3, top: 3, bottom: 3 }, // stone
				{ side: 2, top: 2, bottom: 2 }, // soil
				{ side: 1, top: 0, bottom: 2 }, // grass
			]
		}
	}*/
	exports.execute = function(data, postMessage) {
		let vorld = data.vorld;
		let bounds = data.bounds;
		let atlas = data.atlas;
	
		let count = 0;
		let totalRange = (bounds.iMax - bounds.iMin + 1) * (bounds.jMax - bounds.jMin + 1) * (bounds.kMax - bounds.kMin + 1);
		let alphaBlocks = [], alphaMeshes = [];
		if (vorld.blockConfig) {
			for (let i = 1, l = vorld.blockConfig.length; i < l; i++) {
				if (vorld.blockConfig[i].useAlpha) {
					alphaBlocks.push(i);
				}
			}
		}
	
		for (let i = bounds.iMin; i <= bounds.iMax; i++) {
			for (let j = bounds.jMin; j <= bounds.jMax; j++) {
				for (let k = bounds.kMin; k <= bounds.kMax; k++) {
					count++;
					let mesh = null, cutoutMesh = null, unlitMesh = null;
					alphaMeshes.length = 0;
					let chunk = Vorld.getChunk(vorld, i, j, k);
					if (chunk) {
						// TODO: If we were to count number of cutout and alpha blocks for the chunk we could
						// save ourselves the createMesh calls for cutoutMesh and alphaMeshes
						mesh = Mesher.createMesh(vorld, chunk, atlas);
						cutoutMesh = Mesher.createMesh(vorld, chunk, atlas, null, true);
						unlitMesh = Mesher.createMesh(vorld, chunk, atlas, null, false, true);
						for (let n = 0; n < alphaBlocks.length; n++) {
							alphaMeshes[n] = Mesher.createMesh(vorld, chunk, atlas, alphaBlocks[n]);
						}
					}
	
					let postedMesh = false;
					if (mesh && mesh.indices.length) {
						postMessage({
							mesh: mesh,
							chunkIndices: chunk.indices,
							progress: count / totalRange
						});
						postedMesh = true;
					}
					if (cutoutMesh && cutoutMesh.indices.length) {
						postMessage({
							mesh: cutoutMesh,
							chunkIndices: chunk.indices,
							progress: count / totalRange,
							cutout: true
						});
						postedMesh = true;
					}
					if (unlitMesh && unlitMesh.indices.length) {
						postMessage({
							mesh: unlitMesh,
							chunkIndices: chunk.indices,
							progress: count / totalRange,
							unlit: true
						});
						postedMesh = true;
					}
					for (let n = 0; n < alphaMeshes.length; n++) {
						if (alphaMeshes[n] && alphaMeshes[n].indices.length) {
							postMessage({
								mesh: alphaMeshes[n],
								chunkIndices: chunk.indices,
								progress: count / totalRange,
								alpha: true
							});
							postedMesh = true;
						}
					}
					
					if (!postedMesh) {
						postMessage({ progress: count / totalRange });
					}
				}
			}
		}
	
		postMessage({ complete: true });
	};

	return exports;
})();