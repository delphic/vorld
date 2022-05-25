// Sample Terrian Generator Worker

// Creates vorld data for a vorld slice
// Using multiple octaves of perlin noise

// Posts progress message after each chunk generated
// Returns generated vorld data with complete message when finished

const TerrainGenerator = require('./terrain');
const ShapingFunctions = require('./shapingFunctions');

module.exports = (function(){
	let exports = {};

	// Example Post Data
	/*{
		seed: "XUVNREAZOZJFPQMSAKEMSDJURTQPWEORHZMD",
		generationRules: {
			baseWavelength: 128,
			octaveWeightings: [0.5, 0.5, 1, 0.1],
			neutralNoise: true,
			thresholds: [ 0.5, 0.8 ],
			blocksByThreshold: [ 0, 2, 1 ],	// 0 = Air, 1 = Stone, 2 = Soil, 3 = Grass 
			verticalTransforms: [{
					conditions: [ "blockValue", "blockAboveValue" ],
					blockAbove: 0,
					block: 2,
					targetBlock: 3,
				}],
			shapingFunction = {
				name: "inverse_y",
				numerator: 100,
				yOffset: 0,
			}
		},
		bounds: {
			iMin: -6, iMax: 6,
			jMin: 0, jMax: 3,
			kMin: -6, kMax: 6
		}
	}*/
	exports.execute = function(data, postMessage) {
		let startTime = Date.now();
		let generationRules = data.generationRules;
		let shapingFunction = generationRules.shapingFunction;
		let bounds = data.bounds;

		let blockDelegate = (value) => {
			for (let i = 0, l = generationRules.thresholds.length; i < l; i++) {
				if (value <= generationRules.thresholds[i]) {
					return generationRules.blocksByThreshold[i];
				}
			}
			return generationRules.blocksByThreshold[generationRules.thresholds.length];
		};
	
		let verticalTransformationDelegate = (block, blockAbove, y) => {
			let vts = generationRules.verticalTransforms;
			for (let i = 0, l = vts.length; i < l; i++) {
				let vt = vts[i]; 
				
				let conditions = vt.conditions;
				let pass = !!conditions.length;
				for (let ci = 0, n = conditions.length; ci < n; ci++) {
					switch (conditions[ci]) {
						case "blockValue":
							pass = pass && block == vt.block; 
							break;
						case "blockAboveValue":
							pass = pass && blockAbove == vt.blockAbove;
							break;
						case "yMax": 
							pass = pass && y <= vt.yMax;
							break;
						case "yMin":
							pass = pass && y >= vt.yMin;
							break;
						case "yRange":
							pass = pass && y >= vt.yMin && y <= vt.yMax;
							break;
						default:
							console.error("Unsupported vertical transform condition " + conditions[ci]);
							pass = false;
							break;
					}
					if (!pass) {
						break;
					}
				}
	
				if (pass) {
					block = vt.targetBlock;
				}
			}
			return block;
		};

		let generator = TerrainGenerator.create({
			seed: data.seed,
			baseWavelength: generationRules.baseWavelength,
			weightings: generationRules.octaveWeightings,
			noiseOffset: generationRules.neutralNoise ? 0 : 0.5,
			minimumBlockThreshold: generationRules.thresholds[0],
			shapingFunction: ShapingFunctions.create(shapingFunction),
			blockDelegate: blockDelegate,
			verticalTransformationDelegate: verticalTransformationDelegate
		});

		let count = 0,
			total = (bounds.iMax - bounds.iMin + 1) *
				(bounds.jMax - bounds.jMin + 1) *
				(bounds.kMax - bounds.kMin + 1);
	
		let vorld = generator.generate(bounds, () => { 
			count++;
			postMessage({ id: data.id, progress: count / total });
		});

		postMessage({ id: data.id, complete: true, vorld: vorld, duration: Date.now() - startTime });
	};

	return exports;
})();