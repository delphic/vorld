// Module Root - called "Voxel" as "Vorld" is reserved for the Voxel World structure
module.exports = (function(){
	let exports = {};

	// Analysis
	exports.Analysis = {
		MaximaFinder: require('./analysis/maximaFinder'),
		HeightMap: require('./analysis/heightmapAnalyser')
	};

	// Core
	exports.Cardinal = require('./cardinal');
	exports.Chunk = require('./chunk');
	exports.Maths = require('./maths');
	exports.Physics = require('./physics');
	exports.Primitives = require('./primitives');
	exports.Shader = require('./shader');
	exports.World = require('./world');

	// Workers
	// TODO: Combine into single extensible worker
	exports.Generator = {
		Flora: require('./generation/flora'),
		ShapingFunctions: require('./generation/shapingFunctions'),
		Terrain: require('./generation/terrain')
	};
	exports.Mesher = require('./meshing/mesher');
	exports.Lighter = require('./lighting/lighter');

	// Data Structures
	exports.VectorQueue = require('./vectorQueue');

	return exports;
})();