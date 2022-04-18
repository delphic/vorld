const { Random } = require('fury');
const VorldUpdater = require('../updater');

// This Generator currently designed to act upon generated world
module.exports = (function(){
	let exports = {};

	exports.addTree = (vorld, x, y, z, trunkBlockId, leafBlockId) => {
		// Very simple lolipop tree (can experiment with L-systems later)
		let height = Random.roll(4, 6); // TODO: Taller trees should have a larger canopy
		for (let j = 0; j <= height; j++) {
			if (j < height) {
				VorldUpdater.addBlock(vorld, x, y + j, z, trunkBlockId);
				if (j == height - 2) {
					VorldUpdater.addBlock(vorld, x - 1, y + j, z, leafBlockId);
					VorldUpdater.addBlock(vorld, x + 1, y + j, z, leafBlockId);
					VorldUpdater.addBlock(vorld, x, y + j, z - 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x, y + j, z + 1, leafBlockId);
				} else if (j == height - 1) {
					VorldUpdater.addBlock(vorld, x - 1, y + j, z, leafBlockId);
					VorldUpdater.addBlock(vorld, x + 1, y + j, z, leafBlockId);
					VorldUpdater.addBlock(vorld, x - 1, y + j, z - 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x - 1, y + j, z + 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x + 1, y + j, z - 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x + 1, y + j, z + 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x, y + j, z - 1, leafBlockId);
					VorldUpdater.addBlock(vorld, x, y + j, z + 1, leafBlockId);
				}
			} else {
				VorldUpdater.addBlock(vorld, x, y + j, z, leafBlockId);
				VorldUpdater.addBlock(vorld, x - 1, y + j, z, leafBlockId);
				VorldUpdater.addBlock(vorld, x + 1, y + j, z, leafBlockId);
				VorldUpdater.addBlock(vorld, x, y + j, z - 1, leafBlockId);
				VorldUpdater.addBlock(vorld, x, y + j, z + 1, leafBlockId);
			}
		}
	};

	return exports;
})();