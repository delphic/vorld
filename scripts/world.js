// Vorld - Voxel World
// Data instances store chunks as a map 
// keys in the form i + "_" + j + "_" + k 
// where i, j, k are indices which represent the x, y, z positions of the chunks

// Operations on vorld data are performed using functions stored on the module
// e.g. Vorld.setBlock(vorldToAddTo, x, y, z, block, up, forward);

// Default chunk size defined as 16 so that meshes generated for an 
// entire chunk do not exceed the maximum number of vertices supported.

const BlockConfig = require('./blockConfig');
const Chunk = require('./chunk');
const Utils = require('./utils');

module.exports = (function() {
	let exports = {};

	exports.addChunk = function(vorld, chunk, i, j, k) {
		vorld.chunks[Utils.getChunkKey(i, j, k)] = chunk;
		chunk.indices = [i, j, k];
	};

	exports.getChunk = function(vorld, i, j, k) {
		let key = Utils.getChunkKey(i, j, k);
		if (vorld.chunks[key]) return vorld.chunks[key];
		return null;
	};

	exports.setBlock = function(vorld, x, y, z, block, up, forward) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		setBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward);
	};

	exports.getBlock = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		return getBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
	};

	// Assumes indices are valid
	let getBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK) {
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlock(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK) {
		[ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.adjustChunkIndices(vorld.chunkSize, chunkI, chunkJ, chunkK, blockI, blockJ, blockK);
		return getBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
	};

	exports.getBlockUp = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockUp(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockForward = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockForward(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.getBlockRotation = function(vorld, x, y, z) {
		let [ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.getIndices(vorld.chunkSize, x, y, z);
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockRotation(chunk, blockI, blockJ, blockK);
		}
		return null;
	}

	// Assumes valid indicies
	let setBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward) {
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

	exports.setBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward) {
		[ chunkI, chunkJ, chunkK, blockI, blockJ, blockK ] = Utils.adjustChunkIndices(vorld.chunkSize, chunkI, chunkJ, chunkK, blockI, blockJ, blockK);
		setBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK, block, up, forward);
	};

	// Definition Property Helpers
	exports.isBlockSolid = function(vorld, x, y, z) {
		let block = exports.getBlock(vorld, x, y, z);
		return block && BlockConfig.isBlockTypeSolid(vorld, block);
	};

	exports.isBlockOpaque = function(vorld, x, y, z) {
		let block = exports.getBlock(vorld, x, y, z);
		return block && BlockConfig.isBlockTypeOpaque(vorld, block);
	};

	// Heightmap
	exports.getHighestBlockY = (vorld, x, z) => {
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
					let key = Utils.getChunkKey(i, j, k);
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
			// Except Array representing Block Config - see ./blockConfig.js
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