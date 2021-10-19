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
		let chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (!chunk) {
			chunk = Chunk.create({ size: vorld.chunkSize });
			Vorld.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);
		}
		Chunk.addBlock(chunk, blockI, blockJ, blockK, block, up, forward);
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

		let chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
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
		let chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
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
		let chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
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
		let chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
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

		let chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (!chunk) {
			chunk = Chunk.create({ size: vorld.chunkSize });
			Vorld.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);
		}
		Chunk.addBlock(chunk, blockI, blockJ, blockK, block, up, forward);
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
		return true;
	};

	// Note uses chunk indices
	exports.createSlice = function(vorld, iMin, iMax, jMin, jMax, kMin, kMax) {
		let chunks = {};
		for (let i = iMin; i <= iMax; i++) {
			for (let j = jMin; j <= jMax; j++) {
				for (let k = kMin; k <= kMax; k++) {
					let key = getKey(i, j, k);
					if (vorld.chunks[key]) {
						chunks[key] = vorld.chunks[key];
					}
				}
			}
		}
		// As creating from existing vorld, do not need to use Chunk.create 
		return { chunkSize: vorld.chunkSize, chunks: chunks, blockConfig: vorld.blockConfig };
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

	exports.create = function(parameters) {
		var vorld = {};
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
			var keys = Object.keys(parameters.chunks);
			for (var i = 0, l = keys.length; i < l; i++) {
				vorld.chunks[keys[i]] = Chunk.create(parameters.chunks[keys[i]]);
			}
		}
		return vorld;
	};
	return exports;
})();