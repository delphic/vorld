const Lighting = require('./lighting');
const World = require('./world');

// Placeholder system for managing updates to an already created vorld (i.e. propogates lighting updates)
// Arguably this overlaps with the responsibilities of VorldHelper in the archipelago project
module.exports = (function(){
	let exports = {};
	
	// TODO: Review use of this in generators - arguably generators should simply setBlocks and light should be propogated afterwards
	// That would require some kind of "just nuke and regenerate lighting for this chunk" - would be nice if the propogate light methods
	// could tell you if they'd crossed the border into other chunks, so that data could be used for remeshing 
	// although it should be noted, updating lighting of blocks on the border is enough to require remeshing
	exports.addBlock = function(vorld, x, y, z, block, up, forward) {
		let previousBlock = World.getBlock(vorld, x, y, z);
		let previousYMax = World.getHighestBlockY(vorld, x, z);
		World.setBlock(vorld, x, y, z, block, up, forward);

		// Could add events/messages (e.g. maxYChanged, block updated) update object to vorld.events as part of setBlock?
		// Then consume those updates here as part of addBlock or can consume in Worker

		// Update Sunlight
		if (block) {
			let chunkYMax = Math.floor(y / vorld.chunkSize) * vorld.chunkSize + 15;
			if (previousBlock !== null) {
				Lighting.removeSunlight(vorld, x, y, z);
			} 
			
			let fillNewChunk = previousBlock === null; // Added new chunk 
			if (chunkYMax == y && World.getBlock(vorld, x, y + 1, z) === null) {
				// At top of existing chunk and there isn't one above 
				// so to light the top of the added block create a chunk above
				World.setBlock(vorld, x, y+1, z, 0);
				chunkYMax += 16;
				fillNewChunk = true;
				// BUG: There is also lighting artifact when adding at the limits of the 
				// chunk on the x/z axes or the bottom of a chunk, ideally all chunks with 
				// any set blocks would have all adjacent including diagonally and double
				// diagonally adjacent chunks created and filled with sunlight appropriately
				// However current state is workable with for current requirements. 
			} 

			let chunkXMin = Math.floor(x / vorld.chunkSize) * vorld.chunkSize;
			let chunkZMin = Math.floor(z / vorld.chunkSize) * vorld.chunkSize;
			if (fillNewChunk){
				// add sunlight across top of chunk if heightmap allows
				for (let i = 0; i < vorld.chunkSize; i++) {
					for (let k = 0; k < vorld.chunkSize; k++) {
						let sx = chunkXMin + i, sz = chunkZMin + k;
						let highestBlockY = World.getHighestBlockY(vorld, sx, sz); 
						if (highestBlockY === undefined || highestBlockY < chunkYMax && (sx != x || chunkYMax != y || sz != z)) {
							Lighting.addSunlight(vorld, sx, chunkYMax, sz);
						}
					}
				}
			}


		} else if (y == previousYMax) {
			Lighting.addSunlight(vorld, x, previousYMax + 1, z); // Potn BUG: what if previousYMax is also the very top of the world? Should do min of max value and prevYMax + 1
		}
		// Update lighting
		Lighting.updateLightForBlock(vorld, x, y, z, previousBlock, block);
	};

	return exports;
})();