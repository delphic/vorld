const Lighting = require('./lighting');
const World = require('./world');

// Placeholder system for managing updates to an already created vorld (i.e. propogates lighting updates)
// Arguably this overlaps with the responsibilities of VorldHelper in the archipelago project
module.exports = (function(){
	let exports = {};
	
	// TODO: Review use of this in generators - arguably generators should simply setBlocks and light should be propogated afterwards
	exports.addBlock = function(vorld, x, y, z, block, up, forward) {
		let previousBlock = World.getBlock(vorld, x, y, z);
		let previousYMax = World.getHighestBlockY(vorld, x, z);
		World.setBlock(vorld, x, y, z, block, up, forward);

		// Could add events/messages (e.g. maxYChanged, block updated) update object to vorld.events as part of setBlock?
		// Then consume those updates here as part of addBlock or can consume in Worker

		// Update Sunlight
		if (block) {
			Lighting.removeSunlight(vorld, x, y, z);
		} else if (y == previousYMax) {
			Lighting.addSunlight(vorld, x, previousYMax + 1, z); // Potn BUG: what if previousYMax is also the very top of the world? Should do min of max value and prevYMax + 1
		}
		// Update lighting
		Lighting.updateLightForBlock(vorld, x, y, z, previousBlock, block);
		// Q: I think this propogates lighting changes for sunlight as well, could this be doubling up with addSunlight above?
	};

	return exports;
})();