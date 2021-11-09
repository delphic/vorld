// Vorld - Voxel World
// Data instances store chunks as a map 
// keys in the form i + "_" + j + "_" + k 
// where i, j, k are indices which represent the x, y, z positions of the chunks

// Operations on vorld data are performed using functions stored on the module
// e.g. Vorld.addBlock(vorldToAddTo, x, y, z, block);

// Default chunk size defined as 16 so that meshes generated for an 
// entire chunk do not exceed the maximum number of vertices supported.

let Chunk = require('./chunk');
let Cardinal = require('./cardinal');

let Vorld = module.exports = (function() {
	let exports = {};

	exports.Cardinal = Cardinal;

	let getKey = function(i, j, k) {
		return i + "_" + j + "_" + k;
	};

	exports.addChunk = function(vorld, chunk, i, j, k) {
		vorld.chunks[getKey(i, j, k)] = chunk;
		chunk.indices = [i, j, k];
	};

	exports.getChunk = function(vorld, i, j, k) {
		let key = getKey(i, j, k);
		if (vorld.chunks[key]) return vorld.chunks[key];
		return null;
	};

	exports.addBlock = function(vorld, x, y, z, block, up, forward) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		
		let previousBlock = exports.getBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
		let previousYMax = getHighestBlockY(vorld, x, z);
		exports.setBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward);
		// Update Sunlight
		if (block) {
			if (previousYMax !== undefined) {
				if (previousYMax < y) {
					removeSunlight(vorld, x, y, z, removalQueue, propagationQueue);
				}
			} else {
				removeSunlight(vorld, x, y, z, removalQueue, propagationQueue);
			}
		} else if (y == previousYMax) {
			addSunlight(vorld, x, previousYMax + 1, z); // Potn BUG: what if previousYMax is also the very top of the world? Should do min of max value and prevYMax + 1
		}
		updateLightForBlock(vorld, x, y, z, previousBlock, block);
	};

	exports.getBlock = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		return exports.getBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
	};

	exports.getBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK) {
		// Assumes you won't go out by more than chunkSize
		if (blockI >= vorld.chunkSize) {
			blockI = blockI - vorld.chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = vorld.chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= vorld.chunkSize) {
			blockJ = blockJ - vorld.chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = vorld.chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= vorld.chunkSize) {
			blockK = blockK - vorld.chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = vorld.chunkSize + blockK;
			chunkK -= 1;
		}

		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlock(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockUp = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockUp(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockForward = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockForward(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockRotation = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockRotation(chunk, blockI, blockJ, blockK);
		}
		return null;
	}

	exports.setBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward) {
		// Assumes you won't go out by more than chunkSize
		if (blockI >= vorld.chunkSize) {
			blockI = blockI - vorld.chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = vorld.chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= vorld.chunkSize) {
			blockJ = blockJ - vorld.chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = vorld.chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= vorld.chunkSize) {
			blockK = blockK - vorld.chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = vorld.chunkSize + blockK;
			chunkK -= 1;
		}

		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (!chunk) {
			chunk = Chunk.create({ size: vorld.chunkSize });
			exports.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);
		}

		// NOTE: we don't propagate light changes in set functions
		Chunk.addBlock(chunk, blockI, blockJ, blockK, block, up, forward);
		// However we do set heightmap (which is then used for sky light)
		updateHeightMap(vorld, chunkI, chunkJ, chunkK, blockI, blockJ, blockK, block);
	};

	exports.isBlockSolid = function(vorld, x, y, z) {
		let block = exports.getBlock(vorld, x, y, z);
		return block && exports.isBlockTypeSolid(vorld, block);
	};

	exports.isBlockOpaque = function(vorld, x, y, z) {
		let block = exports.getBlock(vorld, x, y, z);
		return block && exports.isBlockTypeOpaque(vorld, block);
	};

	// Block Config methods (arguably should move to BlockConfig module)
	exports.getBlockTypeDefinition = function(vorld, block) {
		if (vorld.blockConfig && vorld.blockConfig[block]) {
			return vorld.blockConfig[block];
		}
		return null;
	};

	exports.isBlockTypeSolid = function(vorld, block) {
		if (vorld.blockConfig && vorld.blockConfig[block]) {
			return vorld.blockConfig[block].isSolid;
		}
		return !!block;
	};

	exports.isBlockTypeOpaque = function(vorld, block) {
		if (vorld.blockConfig && vorld.blockConfig[block]) {
			return vorld.blockConfig[block].isOpaque;
		}
		return !!block;
	};

	exports.isBlockTypeAlpha = function(vorld, block) {
		if (vorld.blockConfig && vorld.blockConfig[block]) {
			return vorld.blockConfig[block].useAlpha;
		}
		return !!block;
	};

	exports.getBlockTypeMesh = function(vorld, block) {
		if (vorld.blockConfig && vorld.blockConfig[block]) {
			return vorld.blockConfig[block].mesh;
		}
		return null;
	};

	// Lighting
	let getBlockLight = exports.getBlockLight = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockLight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	let getBlockSunlight = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockSunlight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	let getBlockAttenuation = function(vorld, x, y, z) {
		let block = exports.getBlock(vorld, x, y, z);
		let def = exports.getBlockTypeDefinition(vorld, block);
		if (def && def.attenuation) {
			return def.attenuation;
		}
		return 1;
	}

	// HACK: It's incorrect that this returns the max of sunlight and light when getBlockLight and getBlockSunlight are separate
	// this is this way right now because it means we didn't have to change the mesher
	exports.getBlockLightByIndex = function(vorld, chunkI, chunkJ, chunkK, blockI, blockJ, blockK) {
		if (blockI >= vorld.chunkSize) {
			blockI = blockI - vorld.chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = vorld.chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= vorld.chunkSize) {
			blockJ = blockJ - vorld.chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = vorld.chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= vorld.chunkSize) {
			blockK = blockK - vorld.chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = vorld.chunkSize + blockK;
			chunkK -= 1;
		}
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			let light = Chunk.getBlockLight(chunk, blockI, blockJ, blockK);
			let sunlight = Chunk.getBlockSunlight(chunk, blockI, blockJ, blockK);
			return Math.max(light, sunlight); // TODO: If we want different colours we'll have to separate these
		}
		return 0;
	};

	let VectorQueue = require('./vectorQueue');
	let propagationQueue = VectorQueue.create();
	let removalQueue = VectorQueue.create();

	let updateLightForBlock = function(vorld, x, y, z, previousBlock, newBlock) {
		let prevLightLevel = getBlockLight(vorld, x, y, z);
		let prevBlockDef = vorld.blockConfig ? vorld.blockConfig[previousBlock] : null; 
		let newBlockDef = vorld.blockConfig ? vorld.blockConfig[newBlock] : null;
		let newLight = newBlockDef && newBlockDef.light ? newBlockDef.light : 0; 
		if ((!prevBlockDef || !prevBlockDef.light) 
			&& newBlockDef && newLight == 0 && !newBlockDef.isOpaque) {
			let attenuation = newBlockDef.attenuation || 1;
			newLight = prevLightLevel - (attenuation - 1);
			// Note - is overzealous for cases where prev attenuation > 1
		}
		if (prevLightLevel > newLight) {
			removeLight(vorld, x, y, z, removalQueue, propagationQueue);
		}

		if (newBlockDef && newBlockDef.light) {
			addLight(vorld, x, y, z, newBlockDef.light);
		} else if (!newBlock || (newBlockDef && !newBlockDef.isOpaque)) {
			buildAdjacentLightQueue(propagationQueue, vorld, x, y, z);
			if (propagationQueue.length) {
				propagateLight(vorld, propagationQueue);
			}
			buildAdjacentSunlightQueue(propagationQueue, vorld, x, y, z);
			if (propagationQueue.length) {
				propagateLight(vorld, propagationQueue, true);
			}
			// TODO: Handle empty adjacent chunks for sunlight
			// requires going *up* to the top of the chunk and propagating down 
			// if there's no adjacent chunk *and* maxY for that x/z is less than y
			// (or is undefined)
		}
	};

	let buildAdjacentLightQueue = function(queue, vorld, x, y, z) {
		if (getBlockLight(vorld, x + 1, y, z)) {
			queue.push(x + 1, y, z);
		}
		if (getBlockLight(vorld, x - 1, y, z)) {
			queue.push(x - 1, y, z);
		}
		if (getBlockLight(vorld, x, y + 1, z)) {
			queue.push(x, y + 1, z);
		}
		if (getBlockLight(vorld, x, y - 1, z)) {
			queue.push(x, y - 1, z);
		}
		if (getBlockLight(vorld, x, y, z + 1)) {
			queue.push(x, y, z + 1);
		}
		if (getBlockLight(vorld, x, y, z - 1)) {
			queue.push(x, y, z - 1);
		}
	};

	let buildAdjacentSunlightQueue = function(queue, vorld, x, y, z) {
		if (getBlockSunlight(vorld, x + 1, y, z)) {
			queue.push(x + 1, y, z);
		}
		if (getBlockSunlight(vorld, x - 1, y, z)) {
			queue.push(x - 1, y, z);
		}
		if (getBlockSunlight(vorld, x, y + 1, z)) {
			queue.push(x, y + 1, z);
		}
		if (getBlockSunlight(vorld, x, y - 1, z)) {
			queue.push(x, y - 1, z);
		}
		if (getBlockSunlight(vorld, x, y, z + 1)) {
			queue.push(x, y, z + 1);
		}
		if (getBlockSunlight(vorld, x, y, z - 1)) {
			queue.push(x, y, z - 1);
		}
	};

	let addLight = function(vorld, x, y, z, light) {
		let queue = propagationQueue;
		if (light > 0 && trySetLightForBlock(vorld, x, y, z, light)) {
			queue.push(x, y, z);
			propagateLight(vorld, queue)
		}
	};

	let removeLight = function(vorld, x, y, z, queue, backfillQueue) {
		queue.push(x, y, z);
		while (queue.length) {
			let pos = queue.pop();
			let neighbourLight = 0;
			let light = getBlockLight(vorld, pos[0], pos[1], pos[2]);
			
			neighbourLight = getBlockLight(vorld, pos[0] + 1, pos[1], pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0] + 1, pos[1], pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0] + 1, pos[1], pos[2]);
			}
			neighbourLight = getBlockLight(vorld, pos[0] - 1, pos[1], pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0] - 1, pos[1], pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0] - 1, pos[1], pos[2]);
			}
			neighbourLight = getBlockLight(vorld, pos[0], pos[1] + 1, pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1] + 1, pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1] + 1, pos[2]);
			}
			neighbourLight = getBlockLight(vorld, pos[0], pos[1] - 1, pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1] - 1, pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1] - 1, pos[2]);
			}
			neighbourLight = getBlockLight(vorld, pos[0], pos[1], pos[2] + 1);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1], pos[2] + 1);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1], pos[2] + 1);
			}
			neighbourLight = getBlockLight(vorld, pos[0], pos[1], pos[2] - 1);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1], pos[2] - 1);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1], pos[2] - 1);
			}

			removeLightForBlock(vorld, pos[0], pos[1], pos[2]);
		}
		queue.reset();

		if (backfillQueue.length > 0) {
			propagateLight(vorld, backfillQueue);
		}
	};

	let removeSunlight = function(vorld, x, y, z, queue, backfillQueue) {
		queue.push(x, y, z);
		while (queue.length) {
			let pos = queue.pop();
			let neighbourLight = 0;
			let light = getBlockSunlight(vorld, pos[0], pos[1], pos[2]);
			
			neighbourLight = getBlockSunlight(vorld, pos[0] + 1, pos[1], pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0] + 1, pos[1], pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0] + 1, pos[1], pos[2]);
			}
			neighbourLight = getBlockSunlight(vorld, pos[0] - 1, pos[1], pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0] - 1, pos[1], pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0] - 1, pos[1], pos[2]);
			}
			neighbourLight = getBlockSunlight(vorld, pos[0], pos[1] + 1, pos[2]);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1] + 1, pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1] + 1, pos[2]);
			}
			neighbourLight = getBlockSunlight(vorld, pos[0], pos[1] - 1, pos[2]);
			if (neighbourLight && (neighbourLight < light || (neighbourLight == light && light == 15))) {
				queue.push(pos[0], pos[1] - 1, pos[2]);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1] - 1, pos[2]);
			}
			neighbourLight = getBlockSunlight(vorld, pos[0], pos[1], pos[2] + 1);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1], pos[2] + 1);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1], pos[2] + 1);
			}
			neighbourLight = getBlockSunlight(vorld, pos[0], pos[1], pos[2] - 1);
			if (neighbourLight && neighbourLight < light) {
				queue.push(pos[0], pos[1], pos[2] - 1);
			} else if (neighbourLight) {
				backfillQueue.push(pos[0], pos[1], pos[2] - 1);
			}

			removeSunlightForBlock(vorld, pos[0], pos[1], pos[2]);
		}
		queue.reset();

		if (backfillQueue.length > 0) {
			propagateLight(vorld, backfillQueue, true);
		}
	};

	let addSunlight = exports.addSunlight = function(vorld, x, y, z) {
		trySetLightForBlock(vorld, x, y, z, 15, true);
		let queue = propagationQueue;
		queue.push(x, y, z);
		propagateLight(vorld, queue, true);
	};

	let propagateLight = function(vorld, queue, isSunlight) {
		// This is sunlight bool is kinda ugly, maybe we should just have two separate similar functions
		// Potential optimisations
		// * Check adjacency when filling sunlight horizontally, < 14 to prevent repeated fills into the space
		// * Use heap instead of queue (prioritise blocks with highest sunlight to set)
		//   the insert cost may outweigh the reduction in propogation
		while (queue.length) {
			let pos = queue.pop();
			let attenuation = getBlockAttenuation(vorld, pos[0], pos[1], pos[2]);
			let light = !isSunlight ? getBlockLight(vorld, pos[0], pos[1], pos[2]) : getBlockSunlight(vorld, pos[0], pos[1], pos[2]);
			light -= attenuation;

			// Sunlight doesn't attenuate as it goes down
			let downLight = light;
			if (isSunlight && attenuation == 1 && light + attenuation == 15) {
				downLight = 15;
			}

			// TODO: Get directional opacity vector, values 0 or 1 - transform by rotation and each axis as appropriate before propogating light
			// Consider - we could probably store propogation direction histories in our queue - and then simulate bounces better than just flood fill

			// Note: Only pushes when new light for block is greater than old value
			if (light > 0) { 
				if (trySetLightForBlock(vorld, pos[0], pos[1] + 1, pos[2], light, isSunlight)) {
					queue.push(pos[0], pos[1] + 1, pos[2]);
				}
				if (trySetLightForBlock(vorld, pos[0], pos[1] - 1, pos[2], downLight, isSunlight)) {
					queue.push(pos[0], pos[1] - 1, pos[2]);
				}
				// For Sunlight - don't consider horizontally adjacent blocks which will be filled with sunlight
				// at some point (although they may not have been yet) 
				if ((!isSunlight || getHighestBlockY(vorld, pos[0] + 1, pos[2]) > pos[1])
					&& trySetLightForBlock(vorld, pos[0] + 1, pos[1], pos[2], light, isSunlight)) {
					queue.push(pos[0] + 1, pos[1], pos[2]);
				}
				if ((!isSunlight || getHighestBlockY(vorld, pos[0] - 1, pos[2]) > pos[1])
					&& trySetLightForBlock(vorld, pos[0] - 1, pos[1], pos[2], light, isSunlight)) {
					queue.push(pos[0] - 1, pos[1], pos[2]);
				}
				if ((!isSunlight || getHighestBlockY(vorld, pos[0], pos[2] + 1) > pos[1])
					&& trySetLightForBlock(vorld, pos[0], pos[1], pos[2] + 1, light, isSunlight)) {
					queue.push(pos[0], pos[1], pos[2] + 1);
				}
				if ((!isSunlight || getHighestBlockY(vorld, pos[0], pos[2] - 1) > pos[1])
					&& trySetLightForBlock(vorld, pos[0], pos[1], pos[2] - 1, light, isSunlight)) {
					queue.push(pos[0], pos[1], pos[2] - 1);
				}
			}
		}
		queue.reset();
	};

	let trySetLightForBlock = function(vorld, x, y, z, light, isSunlight) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);

		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		let currentLight = 0, blockDef = null;
		if (!chunk) {
			if (!isSunlight) {  // This is a problem for sunlight - we do sometimes need to create new chunks if we allow sparse chunks
				chunk = Chunk.create({ size: vorld.chunkSize });
				exports.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);	
			}
		} else {
			block = Chunk.getBlock(chunk, blockI, blockJ, blockK);
			if (block && vorld.blockConfig) {
				blockDef = vorld.blockConfig[block]; 
			}
			currentLight = !isSunlight 
				? Chunk.getBlockLight(chunk, blockI, blockJ, blockK)
				: Chunk.getBlockSunlight(chunk, blockI, blockJ, blockK);
		}
		if (chunk) {
			if ((!blockDef || !blockDef.isOpaque) && (!currentLight || light > currentLight)) {
				// TODO: Pass through modifers rather than just !isOpaque
				if (!isSunlight) {
					Chunk.setBlockLight(chunk, blockI, blockJ, blockK, light);
				} else {
					Chunk.setBlockSunlight(chunk, blockI, blockJ, blockK, light);
				}
				return true;
			}
		}
		return false;
	};

	let removeLightForBlock = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
			
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			Chunk.setBlockLight(chunk, blockI, blockJ, blockK, 0);
		}
	};

	let removeSunlightForBlock = function(vorld, x, y, z) {
		let size = vorld.chunkSize;
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
			
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			Chunk.setBlockSunlight(chunk, blockI, blockJ, blockK, 0);
		}
	};

	// Heightmap
	let getHighestBlockY = (vorld, x, z) => {
		let chunkI = Math.floor(x / vorld.chunkSize),
		chunkK = Math.floor(z / vorld.chunkSize);
		let chunkKey = chunkI + "_" + chunkK;

		let heightMapEntry = vorld.heightMap[chunkKey];
		if (heightMapEntry) {
			let i = x - chunkI * vorld.chunkSize,
				k = z - chunkK * vorld.chunkSize;
			let key = i + k * vorld.chunkSize;
			let value = vorld.heightMap[chunkKey].maxY[key];
			if (value !== undefined) {
				return value;
			}
		}
		return undefined;
	};

	let updateHeightMap = (vorld, chunkI, chunkJ, chunkK, i, j, k, block) => {
		let chunkKey = chunkI + "_" + chunkK;
		let heightMapEntry = vorld.heightMap[chunkKey]; 
		if (!heightMapEntry) {
			// TODO: Heightmap.create method
			heightMapEntry = {
				minChunkIndex: chunkJ,
				maxChunkIndex: chunkJ,
				maxY: [],
				chunkI: chunkI,
				chunkK: chunkK
			};
			vorld.heightMap[chunkKey] = heightMapEntry;
		} else {
			if (heightMapEntry.minChunkIndex > chunkJ) {
				heightMapEntry.minChunkIndex = chunkJ;
			}
			if (heightMapEntry.maxChunkIndex < chunkJ) {
				heightMapEntry.maxChunkIndex = chunkJ;
			}
		}

		let index = i + k * vorld.chunkSize;
		let y = chunkJ * vorld.chunkSize + j;
		let yMax = heightMapEntry.maxY[index];
		if (block) {
			if (yMax === undefined || yMax < y) {
				heightMapEntry.maxY[index] = y;
			}
		} else if (yMax === y) { 
			// NOTE: leaves heightMapEntry undefined until block is placed
			// scan down, till you find a block or exceed chunk range
			// TODO: Test this with worlds that don't have blocks at the bottom!
			// TODO: Test this with worlds that have sparse chunks on y axis
			let foundBlock = false;
			let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
			while (!foundBlock && chunkJ >= heightMapEntry.minChunkIndex) {
				if (chunk) {
					while (j >= 0) {
						if (Chunk.getBlock(chunk, i, j, k)) {
							heightMapEntry.maxY[index] =  chunkJ * vorld.chunkSize + j;
							foundBlock = true;
							break;
						}
						j -= 1;
					}
				}
				if (!foundBlock) {
					chunkJ -= 1;
					j = (j + vorld.chunkSize) % vorld.chunkSize;
					chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
				}
			}
		}
	};

	// Utils
	exports.forEachChunk = function(vorld, delegate) {
		let chunks = vorld.chunks;
		let keys = Object.keys(chunks);
		for (let i = 0, l = keys.length; i < l; i++) {
			delegate(chunks[keys[i]]);
		}
	};

	exports.tryMerge = function(a, b) {
		if (a.chunkSize != b.chunkSize) {
			return false;
		}

		let keys = Object.keys(b.chunks);
		for (let i = 0, l = keys.length; i < l; i++) {
			a.chunks[keys[i]] = b.chunks[keys[i]];
		}

		let heightMapKeys = Object.keys(b.heightMap);
		for (let i = 0, l = heightMapKeys.length; i < l; i++) {
			// TODO: Test - I think right now we already merge in full y stacks? which makes this not happen
			// It might be preferable to always merge in full y stacks not require this logic 
			// NOTE: Method does not propagate lighting changes - sets dirty flag if it might be required
			if (!a.heightMap[heightMapKeys[i]]) {
				a.heightMap[heightMapKeys[i]] = b.heightMap[heightMapKeys[i]];
			} else {
				let aEntry = a.heightMap[heightMapKeys[i]];
				let bEntry = b.heightMap[heightMapKeys[i]];
				aEntry.minChunkIndex = Math.min(bEntry.minChunkIndex);
				aEntry.maxChunkIndex = Math.max(bEntry.maxChunkIndex);
				aEntry.dirty = !!aEntry.dirty;

				// Check and update max Y values
				for (let index = 0, n = Math.max(aEntry.maxY.length, bEntry.maxY.length); index < n; index++) {
					let aYMax = aEntry.maxY[index], bYMax = bEntry.maxY[index];
					if ((bYMax !== undefined) && (aYMax == undefined || bYMax > aYMax)) {
						aEntry.maxY[index] = bYMax;
					}
					aEntry.dirty &= aYMax != bYMax;
				}
			}
		}
		return true;
	};

	// Note uses chunk indices
	exports.createSlice = function(vorld, iMin, iMax, jMin, jMax, kMin, kMax) {
		let chunks = {};
		let heightMap = {};
		for (let i = iMin; i <= iMax; i++) {
			for (let k = kMin; k <= kMax; k++) {
				for (let j = jMin; j <= jMax; j++) {
					let key = getKey(i, j, k);
					if (vorld.chunks[key]) {
						chunks[key] = vorld.chunks[key];
					}
				}
				let key = i + "_" + k;
				if (vorld.heightMap[key]) {
					heightMap[key] = vorld.heightMap[key];
				}
			}
		}
		
		// As creating from existing vorld, do not need to use Chunk.create 
		return { chunkSize: vorld.chunkSize, chunks: chunks, blockConfig: vorld.blockConfig, heightMap: heightMap };
	};

	exports.createSliceFromBounds = function(vorld, bounds) {
		let size = vorld.chunkSize;
		let iMin = Math.floor(bounds.xMin / size), iMax = Math.floor(bounds.xMax / size),
			jMin = Math.floor(bounds.yMin / size), jMax = Math.floor(bounds.yMax / size),
			kMin = Math.floor(bounds.zMin / size), kMax = Math.floor(bounds.zMax / size);
		return exports.createSlice(vorld, iMin, iMax, jMin, jMax, kMin, kMax);
	};

	exports.clear = function(vorld) {
		vorld.chunks = {};
	}

	// Constructor
	exports.create = function(parameters) {
		let vorld = {};
		if (parameters && parameters.chunkSize) {
			vorld.chunkSize = parameters.chunkSize;
		} else {
			vorld.chunkSize = 16;
		}
		if (parameters && parameters.blockConfig) {
			vorld.blockConfig = parameters.blockConfig;
			// Expect array indexed on block type with { isOpaque: bool, isSolid: bool }
		}
		vorld.chunks = {};
		if (parameters && parameters.chunks) {
			let keys = Object.keys(parameters.chunks);
			for (let i = 0, l = keys.length; i < l; i++) {
				vorld.chunks[keys[i]] = Chunk.create(parameters.chunks[keys[i]]);
			}
		}
		vorld.heightMap = {}; // map of yMax for a given x_z chunk key
		if (parameters && parameters.heightMap) {
			let keys = Object.keys(parameters.heightMap);
			for (let i = 0, l = keys.length; i < l; i++) {
				vorld.heightMap[keys[i]] = parameters.heightMap[keys[i]];
			}
		}
		return vorld;
	};
	return exports;
})();