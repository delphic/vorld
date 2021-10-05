// Sample Mesher worker 

// Workers creates meshes for a vorld slice 
// posts them back with the chunk indices and progress update

// Sends progress update when no mesh is required
// Sends complete message once vorld slice is fully meshed
let Vorld = require('../core/vorld');
let Mesher = require('./mesher');

onmessage = function(e) {
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

	let vorld = e.data.vorld;
	let bounds = e.data.bounds;
	let atlas = e.data.atlas;

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
				let mesh = null;
				alphaMeshes.length = 0;
				let chunk = Vorld.getChunk(vorld, i, j, k);
				if (chunk) {
					mesh = Mesher.createMesh(vorld, chunk, atlas);
					for (let n = 0; n < alphaBlocks.length; n++) {
						alphaMeshes[n] = Mesher.createMesh(vorld, chunk, atlas, alphaBlocks[n]);
					}
				}

				let postedMesh = false;
				if (mesh && mesh.indices.length) {
					this.postMessage({
						mesh: mesh,
						chunkIndices: chunk.indices,
						progress: count / totalRange
					});
					postedMesh = true;
				}
				for (let n = 0; n < alphaMeshes.length; n++) {
					if (alphaMeshes[n] && alphaMeshes[n].indices.length) {
						this.postMessage({
							mesh: alphaMeshes[n],
							chunkIndices: chunk.indices,
							progress: count / totalRange,
							alpha: true
						});
						postedMesh = true;
					}
				}
				
				if (!postedMesh) {
					this.postMessage({ progress: count / totalRange });
				}
			}
		}
	}

	postMessage({ complete: true });
};