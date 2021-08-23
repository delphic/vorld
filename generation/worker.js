// Sample Generator Worker

// Creates vorld data for a vorld slice
// Using multiple octaves of perlin noise

// Posts progress message after each chunk generated
// Returns generated vorld data with complete message when finished

let TerrainGenerator = require('./terrain');
let ShapingFunctions = require('./shapingFunction');

onmessage = function(e) {
	// Example Post Data
	/*{
		generationRules: {
			seed: "XUVNREAZOZJFPQMSAKEMSDJURTQPWEORHZMD",
			baseWavelength: 128,
			octaveWeightings: [0.5, 0.5, 1, 0.1],
			neutralNoise: true,
			thresholds: [ 0.5, 0.8 ],
			blocksByThreshold: [ 0, 2, 1 ],	// 0 = Air, 1 = Stone, 2 = Soil, 3 = Grass 
			verticalTransforms: [[ 2, 3 ]],
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
	let generationRules = e.data.generationRules;
	let shapingFunction = generationRules.shapingFunction;
	let bounds = e.data.bounds;

	let blockDelegate = (value) => {
		for (let i = 0, l = generationRules.thresholds.length; i < l; i++) {
			if (value < generationRules.thresholds[i]) {
				return generationRules.blocksByThreshold[i];
			}
		}
		return generationRules.blocksByThreshold[generationRules.thresholds.length];
	};

	let verticalTransformationDelegate = (block, blockAbove, y) => {
		let vts = generationRules.verticalTransforms;
		for (let i = 0, l = vts.length; i < l; i++) {
			if (block == vts[i][0] && !blockAbove) {
				return vts[i][1];
			}
		}
		return block;
	};

	let generator = TerrainGenerator.create({
		seed: generationRules.seed,
		baseWavelength: generationRules.baseWavelength,
		weightings: generationRules.octaveWeightings,
		noiseOffset: generationRules.neutralNoise ? 0 : 0.5,
		mininumBlockThreshold: generationRules.thresholds[0],
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
		this.postMessage({ progress: count / total });
	});

	this.postMessage({ complete: true, vorld: vorld });
};