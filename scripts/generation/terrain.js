// Voxel Terrain Generator

// Creates voxel data using multiple octaves of noise where the octave integer is k
// you sample at x(2^k) and y(2^k) where 2^k is wavelength and 1/(2^k) is frequency.
// Each octave has a weighting for determining combination with others.

// Generated value is further multiplied by a shaping function as a way to ensure air / ground distinction

// Note generates from higher y to lower, in order to facilitate transformation of top tiles 

let { Random } = require('fury');
let Perlin = require('../noise/perlin');
let Vorld = require('../world');

// Note directly adding to chunks and chunks to vorld to minimise maths
module.exports = (function() {
	let exports = {};
	let prototype = {
		generateChunk: function(vorld, chunkI, chunkJ, chunkK) {
			let size = vorld.chunkSize;
			let maxNoiseValue = 0.5 + this.noiseOffset;
			for (let k = 0; k < size; k++) {
				for (let j = size - 1; j >= 0; j--) {
					for (let i = 0; i < size; i++) {
						let value = 0;
						let x = i + size * chunkI,
							y = j + size * chunkJ,
							z = k + size * chunkK;
						
						let shapingFactor = this.shapingFunction(x, y, z);

						if (maxNoiseValue * shapingFactor > this.minimumBlockThreshold) {
							if (this.octaves.length) {
								for (let o = 0; o < this.octaves.length; o++) {
									let wavelength = Math.pow(2, o);
									let noiseValue = this.octaves[o].noise(
										wavelength * x / this.baseWavelength,
										wavelength * y / this.baseWavelength,
										wavelength * z / this.baseWavelength);
									value += this.weightings[o] * (this.noiseOffset + noiseValue);
								}
								value /= this.totalWeight;
							} else {
								value = this.defaultBlockValue;
							}
						}

						// This does trigger often... (ironically after we removed it but didn't clear cache)
						// if (value > maxNoiseValue) {
						// 	console.error("Maximum expected noise value: " + maxNoiseValue + " calculated noise value: " + value);
						// }

						value *= shapingFactor;
						let block = this.blockDelegate(value);

						if (this.verticalTransformationDelegate) {
							let blockAbove = Vorld.getBlockByIndex(vorld, i, j + 1, k, chunkI, chunkJ, chunkK);
							block = this.verticalTransformationDelegate(block, blockAbove, y);
						}

						Vorld.setBlockByIndex(vorld, i, j, k, chunkI, chunkJ, chunkK, block);
					}
				}
			}
			return Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
		},
		generate: function(bounds, progressDelegate) {
			let vorld = Vorld.create({ seed: this.seed });
			let iMin = bounds.iMin, iMax = bounds.iMax,
				jMin = bounds.jMin, jMax = bounds.jMax,
				kMin = bounds.kMin, kMax = bounds.kMax;

			for (let i = iMin; i <= iMax; i++) {
				for (let k = kMin; k <= kMax; k++) {
					for (let j = jMax; j >= jMin; j--) {
						this.generateChunk(vorld, i, j, k);
						if (progressDelegate) {
							progressDelegate();
						}
					}
				}
			}
			return vorld;
		}
	};

	exports.create = function(config) {
		let generator = Object.create(prototype);

		generator.seed = config.seed;
		generator.baseWavelength = config.baseWavelength;
		generator.weightings = config.weightings;
		generator.totalWeight = 0;
		generator.octaves = [];
		Random.setSeed(generator.seed);
		for (let o = 0; o < generator.weightings.length; o++) {
			generator.octaves.push(Perlin.create(Random.value));
			generator.totalWeight += generator.weightings[o];
		}
		generator.shapingFunction = config.shapingFunction;
		generator.blockDelegate = config.blockDelegate;
		generator.verticalTransformationDelegate = config.verticalTransformationDelegate;
		generator.minimumBlockThreshold = config.minimumBlockThreshold;
		generator.noiseOffset = config.noiseOffset;
		generator.defaultBlockValue = config.defaultBlockValue || 0;

		return generator;
	};

	return exports;
})();