const BlockConfig = require('./blockConfig');
const Chunk = require('./chunk');
const World = require('./world');
const Maths = require('./maths');
const Utils = require('./utils');
const VectorQueue = require('./vectorQueue');

module.exports = (function(){
	let exports = {};

	let propagationQueue = VectorQueue.create();
	let removalQueue = VectorQueue.create();

	// Definition Property Helpers
	let getBlockAttenuation = function(vorld, x, y, z) {
		let block = World.getBlock(vorld, x, y, z);
		let def = BlockConfig.getBlockTypeDefinition(vorld, block);
		if (def && def.attenuation) {
			return def.attenuation;
		}
		return 1;
	}

	// There is some naming confusion around 'light' for light level and 'light' for block def emission
	let getBlockTypeLight = function(vorld, pos) {
		let block = World.getBlock(vorld, pos[0], pos[1], pos[2]);
		let def = BlockConfig.getBlockTypeDefinition(vorld, block);
		if (def && def.light) {
			return def.light;
		}
		return 0;
	};

	// Lighting Methods
	let getBlockLight = exports.getBlockLight = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockLight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	let getBlockSunlight = exports.getBlockSunlight = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockSunlight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	exports.getBlockLightByIndex = function(vorld, chunkI, chunkJ, chunkK, blockI, blockJ, blockK) {
		[ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.adjustChunkIndices(vorld.chunkSize, chunkI, chunkJ, chunkK, blockI, blockJ, blockK);

		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockLight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	exports.getBlockSunlightByIndex = function(vorld, chunkI, chunkJ, chunkK, blockI, blockJ, blockK) {
		[ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.adjustChunkIndices(vorld.chunkSize, chunkI, chunkJ, chunkK, blockI, blockJ, blockK);

		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockSunlight(chunk, blockI, blockJ, blockK);
		}
		return 0;
	};

	exports.updateLightForBlock = function(vorld, x, y, z, previousBlock, newBlock) {
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
		if (prevLightLevel > 0 && prevLightLevel > newLight) {
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

	let checkPositionForLightRemovalAndBackfill = function(vorld, adjacentLightLevel, pos, queue, backfillQueue) {
		let lightLevel = getBlockLight(vorld, pos[0], pos[1], pos[2]);
		if (lightLevel) {
			let neighbourLight = getBlockTypeLight(vorld, pos);
			if (lightLevel < adjacentLightLevel) {
				queue.push(pos[0], pos[1], pos[2]);
			}
			if (lightLevel >= adjacentLightLevel || neighbourLight) {
				backfillQueue.push(pos[0], pos[1], pos[2]);
			}
		}
	};

	let removeLight = function(vorld, x, y, z, queue, backfillQueue) {
		queue.push(x, y, z);
		while (queue.length) {
			let pos = queue.pop();
			let [ x, y, z ] = pos;
			let light = getBlockLight(vorld, x, y, z);
			
			pos[0] += 1;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[0] -= 2;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[0] += 1;
			pos[1] += 1;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[1] -= 2;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[1] += 1;
			pos[2] += 1;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[2] -= 2;
			checkPositionForLightRemovalAndBackfill(vorld, light, pos, queue, backfillQueue);

			pos[2] += 1;
			removeLightForBlock(vorld, pos[0], pos[1], pos[2]);

			let lightSource = getBlockTypeLight(vorld, pos);
			if (lightSource) {
				trySetLightForBlock(vorld, x, y, z, lightSource);
			}
		}
		queue.reset();

		if (backfillQueue.length > 0) {
			propagateLight(vorld, backfillQueue);
		}
	};

	exports.removeSunlight = function(vorld, x, y, z) {
		removeSunlight(vorld, x, y, z, removalQueue, propagationQueue);
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

	exports.addSunlight = function(vorld, x, y, z) {
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
				if ((!isSunlight || World.getHighestBlockY(vorld, pos[0] + 1, pos[2]) > pos[1])
					&& trySetLightForBlock(vorld, pos[0] + 1, pos[1], pos[2], light, isSunlight)) {
					queue.push(pos[0] + 1, pos[1], pos[2]);
				}
				if ((!isSunlight || World.getHighestBlockY(vorld, pos[0] - 1, pos[2]) > pos[1])
					&& trySetLightForBlock(vorld, pos[0] - 1, pos[1], pos[2], light, isSunlight)) {
					queue.push(pos[0] - 1, pos[1], pos[2]);
				}
				if ((!isSunlight || World.getHighestBlockY(vorld, pos[0], pos[2] + 1) > pos[1])
					&& trySetLightForBlock(vorld, pos[0], pos[1], pos[2] + 1, light, isSunlight)) {
					queue.push(pos[0], pos[1], pos[2] + 1);
				}
				if ((!isSunlight || World.getHighestBlockY(vorld, pos[0], pos[2] - 1) > pos[1])
					&& trySetLightForBlock(vorld, pos[0], pos[1], pos[2] - 1, light, isSunlight)) {
					queue.push(pos[0], pos[1], pos[2] - 1);
				}
			}
		}
		queue.reset();
	};

	let trySetLightForBlock = function(vorld, x, y, z, light, isSunlight) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);

		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		let currentLight = 0, blockDef = null;
		if (!chunk) {
			if (!isSunlight) {  // This is a problem for sunlight - we do sometimes need to create new chunks if we allow sparse chunks
				chunk = Chunk.create({ size: vorld.chunkSize });
				World.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);	
			}
		} else {
			let block = Chunk.getBlock(chunk, blockI, blockJ, blockK);
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
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			Chunk.setBlockLight(chunk, blockI, blockJ, blockK, 0);
		}
	};

	let removeSunlightForBlock = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = World.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			Chunk.setBlockSunlight(chunk, blockI, blockJ, blockK, 0);
		}
	};

	// Light Probes
	exports.interpolateLight = (vorld, pos) => {
		let x0 = Math.floor(pos[0] - 0.5),
			y0 = Math.floor(pos[1] - 0.5),
			z0 = Math.floor(pos[2] - 0.5);
		let x1 = x0 + 1, y1 = y0 + 1, z1 = z0 + 1;

		// This can probe into blocks where the light level is zero (just probe close to the ground for an example)
		// we actually want the surface light level of that block from this direction, rather than the light value itself
		// This is true for interpolageSunlight too - however this is a reasonable first pass
		return interpolatePoints(
			getBlockLight(vorld, x0, y0, z0),
			getBlockLight(vorld, x1, y0, z0),
			getBlockLight(vorld, x0, y1, z0),
			getBlockLight(vorld, x0, y0, z1),
			getBlockLight(vorld, x1, y1, z0),
			getBlockLight(vorld, x1, y0, z1),
			getBlockLight(vorld, x0, y1, z1),
			getBlockLight(vorld, x1, y1, z1),
			pos);
	};

	exports.interpolateSunlight = (vorld, pos) => {
		let x0 = Math.floor(pos[0] - 0.5),
			y0 = Math.floor(pos[1] - 0.5),
			z0 = Math.floor(pos[2] - 0.5);
		let x1 = x0 + 1, y1 = y0 + 1, z1 = z0 + 1;

		return interpolatePoints(
			getBlockSunlight(vorld, x0, y0, z0),
			getBlockSunlight(vorld, x1, y0, z0),
			getBlockSunlight(vorld, x0, y1, z0),
			getBlockSunlight(vorld, x0, y0, z1),
			getBlockSunlight(vorld, x1, y1, z0),
			getBlockSunlight(vorld, x1, y0, z1),
			getBlockSunlight(vorld, x0, y1, z1),
			getBlockSunlight(vorld, x1, y1, z1),
			pos);
	};

	let interpolatePoints = (x0y0z0, x1y0z0, x0y1z0, x0y0z1, x1y1z0, x1y0z1, x0y1z1, x1y1z1, pos) => {
		let x = pos[0] - 0.5,
			y = pos[1] - 0.5,
			z = pos[2] - 0.5;
		x = x - Math.floor(x);
		y = y - Math.floor(y);
		z = z - Math.floor(z);

		let y0z0 = Maths.lerp(x0y0z0, x1y0z0, x);
		let y0z1 = Maths.lerp(x0y0z1, x1y0z1, x);
		let y1z0 = Maths.lerp(x0y1z0, x1y1z0, x);
		let y1z1 = Maths.lerp(x0y1z1, x1y1z1, x);

		let y0 = Maths.lerp(y0z0,y0z1, z);
		let y1 = Maths.lerp(y1z0,y1z1, z);

		return Maths.lerp(y0, y1, y);
	};

	return exports;
})();