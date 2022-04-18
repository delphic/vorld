// Vorld Chunk 
// Data instances store block ids (integers) in a single array
// Module provides methods to add and get blocks using indices
// All indicies are positive, i.e. 0,0,0 is on the corner of the chunk

// Default chunk size defined as 16 so that meshes generated for an 
// entire chunk do not exceed the maximum number of vertices supported.
let Cardinal = require('./cardinal');

module.exports = (function() {
	let exports = {};

	// Whilst we're not preallocating the entire array if we were to key as
	// i + chunk.size * k + chunk.size * chunk.size + j
	// our sparse arrays would have more empty space and probably take less memory
	// due to the fact there will be a significant number of chunks where there
	// are continuous rows of horizontal planes rows at the top than there are
	// x/y vertical planes on the z+ side.
	
	exports.addBlock = function(chunk, i, j, k, block, up, forward) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		chunk.blocks[index] = block;
		if (up === undefined) up = Cardinal.Direction.up;
		if (forward === undefined) forward = Cardinal.Direction.forward;
		if (Math.floor(up/2) === Math.floor(forward/2)) {
			forward = (Math.floor(up/2) + 1) % 3 * 2; // If up and forward are on the same axis convert forward to next axis
			if (up % 2 == 0) {
				forward += 1; // We want up == forward => forward == down
			} 
		}
		chunk.blockRotations[index] = Cardinal.getCardinalRotation(up, forward);
	};

	exports.setBlockLight = function(chunk, i, j, k, light) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (chunk.blockLighting[index]) {
			let v = chunk.blockLighting[index];
			let sunLight = v - Math.floor(v);
			chunk.blockLighting[index] = light + sunLight;
		} else {
			chunk.blockLighting[index] = light;
		}
	}

	exports.setBlockSunlight = function(chunk, i, j, k, sunlight) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (chunk.blockLighting[index]) {
			chunk.blockLighting[index] = Math.floor(chunk.blockLighting[index]) + sunlight / 16;
		} else {
			chunk.blockLighting[index] = sunlight / 16;
		}
	};
	
	exports.getBlock = function(chunk, i, j, k) {
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return chunk.blocks[i + chunk.size * j + chunk.size * chunk.size * k];
	};

	exports.getBlockUp = function(chunk, i, j, k) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return Cardinal.getUpDirection(chunk.blockRotations[index]);
	};

	exports.getBlockForward = function(chunk, i, j, k) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return Cardinal.getForwardDirection(chunk.blockRotations[index]);
	};

	exports.getBlockRotation = function(chunk, i, j, k) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return chunk.blockRotations[index];
	}

	exports.getBlockLight = function(chunk, i, j, k) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		// Currently expect values 0 to 15
		return Math.floor(chunk.blockLighting[index] || 0);
	};

	exports.getBlockSunlight = function(chunk, i, j, k) {
		let index = i + chunk.size * j + chunk.size * chunk.size * k;
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		// Currently expect values 0 to 15
		let v = chunk.blockLighting[index];
		if (v) {
			return Math.round((v - Math.floor(v)) * 16);
		}
		return 0;
	}

	exports.create = function(parameters) {
		let chunk = {};
		if (parameters && parameters.size) {
			chunk.size = parameters.size;
		} else {
			chunk.size = 16;
		}
		if (parameters && parameters.blocks) {
			chunk.blocks = parameters.blocks;
		} else {
			chunk.blocks = [];
		}
		if (parameters && parameters.blockRotations) {
			chunk.blockRotations = parameters.blockRotations;
		} else {
			chunk.blockRotations = [];
		}
		if (parameters && parameters.blockLighting) {
			chunk.blockLighting = parameters.blockLighting;
		} else {
			chunk.blockLighting = [];
		}
		return chunk;
	};

	return exports;
})();