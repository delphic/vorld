module.exports = (function(){
	let exports = {};

	// Analysis
	exports.Analysis = {
		MaximaFinder: require('./analysis/maximaFinder'),
		HeightMap: require('./analysis/heightmapAnalyser')
	};

	// Core
	exports.BlockConfig = require('./blockConfig');
	exports.Cardinal = require('./cardinal');
	exports.Chunk = require('./chunk');
	exports.Lighting = require('./lighting');
	exports.Maths = require('./maths');
	exports.Physics = require('./physics');
	exports.Primitives = require('./primitives');
	exports.Shader = require('./shader');
	exports.Updater = require('./updater');
	exports.Utils = require('./utils');
	exports.World = require('./world');

	// Workers
	exports.Generator = {
		Flora: require('./generation/flora'),
		ShapingFunctions: require('./generation/shapingFunctions'),
		Terrain: require('./generation/terrain')
	};
	exports.Mesher = require('./meshing/mesher');
	exports.Lighter = require('./lighting/lighter');
	exports.MeshingWorker =require('./meshing/worker');
	exports.LightingWorker = require('./lighting/worker');
	exports.TerrianWorker = require('./generation/worker');

	// Data Structures
	exports.VectorQueue = require('./vectorQueue');

	return exports;
})();