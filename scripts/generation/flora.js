const { Random } = require('fury');
const Vorld = require('../world');

module.exports = (function(){
	let exports = {};

	exports.addTree = (vorld, x, y, z, trunkBlockId, leafBlockId) => {
		// Very simple lolipop tree (can experiment with L-systems later)
		let height = Random.roll(4, 6); // TODO: Taller trees should have a larger canopy
		for (let j = 0; j <= height; j++) {
			if (j < height) {
				Vorld.addBlock(vorld, x, y + j, z, trunkBlockId);
				if (j == height - 2) {
					Vorld.addBlock(vorld, x - 1, y + j, z, leafBlockId);
					Vorld.addBlock(vorld, x + 1, y + j, z, leafBlockId);
					Vorld.addBlock(vorld, x, y + j, z - 1, leafBlockId);
					Vorld.addBlock(vorld, x, y + j, z + 1, leafBlockId);
				} else if (j == height - 1) {
					Vorld.addBlock(vorld, x - 1, y + j, z, leafBlockId);
					Vorld.addBlock(vorld, x + 1, y + j, z, leafBlockId);
					Vorld.addBlock(vorld, x - 1, y + j, z - 1, leafBlockId);
					Vorld.addBlock(vorld, x - 1, y + j, z + 1, leafBlockId);
					Vorld.addBlock(vorld, x + 1, y + j, z - 1, leafBlockId);
					Vorld.addBlock(vorld, x + 1, y + j, z + 1, leafBlockId);
					Vorld.addBlock(vorld, x, y + j, z - 1, leafBlockId);
					Vorld.addBlock(vorld, x, y + j, z + 1, leafBlockId);
				}
			} else {
				Vorld.addBlock(vorld, x, y + j, z, leafBlockId);
				Vorld.addBlock(vorld, x - 1, y + j, z, leafBlockId);
				Vorld.addBlock(vorld, x + 1, y + j, z, leafBlockId);
				Vorld.addBlock(vorld, x, y + j, z - 1, leafBlockId);
				Vorld.addBlock(vorld, x, y + j, z + 1, leafBlockId);
			}
		}
	};

	return exports;
})();