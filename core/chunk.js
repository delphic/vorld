// Vorld Chunk 
// Data instances store block ids (integers) in a single array
// Module provides methods to add and get blocks using indices
// All indicies are positive, i.e. 0,0,0 is on the corner of the chunk

// Default chunk size defined as 16 so that meshes generated for an 
// entire chunk do not exceed the maximum number of vertices supported.

let Chunk = module.exports = (function() {
	let exports = {};
	
	exports.addBlock = function(chunk, i, j, k, block) {
		chunk.blocks[i + chunk.size * j + chunk.size * chunk.size * k] = block;
	};
	
	exports.getBlock = function(chunk, i, j, k) {
		if (i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return chunk.blocks[i + chunk.size * j + chunk.size * chunk.size * k];
	};

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
		return chunk;
	};

	return exports;
})();