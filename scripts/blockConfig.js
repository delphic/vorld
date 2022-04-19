// Block Config is stored as an array on the vorld object, it maps block id to block definitions
// This module provides helper methods for lookup of block definition details from block id.
module.exports = (function(){
	let exports = {};
	
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

	return exports;
})();