// Maxima finder, analyses the heightmap of generated terrain
module.exports = (function() {
	let exports = {};

	exports.findChunkMaxima = (vorld) => {
		// Hacky jam version: for each chunk get highest point, search full vorld to see if there's an adjcent point higher, if not add to maxima list
		// Will only return one maxima per chunk
		let keys = Object.keys(vorld.heightMap);
		let result = [];
		for (let i = 0, l = keys.length; i < l; i++) {
			let maxIndex = 0;
			let maxHeight = undefined;
				let key = keys[i];
			let heightMap = vorld.heightMap[key].maxY; 
			for (let index = 0, n = heightMap.length; index < n; index++) {
				if (!isNaN(heightMap[index]) && (maxHeight < heightMap[index] || maxHeight == undefined)) {
					maxHeight = heightMap[index];
					maxIndex = index; 
				}
			}
			// We have max height in this chunk -> TODO: search for adjancent height points in other chunks
			let x = vorld.heightMap[key].chunkI * vorld.chunkSize + maxIndex % vorld.chunkSize, 
				z = vorld.heightMap[key].chunkK * vorld.chunkSize + Math.floor(maxIndex / vorld.chunkSize);

			result.push([x, maxHeight, z]);
		}

		result = result.sort((a, b) => { 
			return b[1] - a[1];
		});

		return result;
	};

	// Potential - Area finder version:
	// specify bounds x/z
	// Pseudo Code
	// start at some point within the bounds
	// create terrace object { height: y, points: [] } // add start point
	// BFS adding points of same height
	// if find higher -> prioritise and create new island/terrace object with parent: link to terrace below - add childCount to parent
		// alternative don't prioritise the higher, finish the BFS at this height - this avoids the arches problem 
		// => new lower points when searching higher just go in a new shape
		// however this doesn't mean they're not connected - could query the vorld directly instead?
	// if find lower -> store if inside the bounds 
	// when finished BFS same height if childCount = 0, add to maxima result object
	// go over stored lower points, if have parent add to that, else create a new one.
		// Use same logic as above to analyse

	// Note there may be gaps in heights between parent / child - some will be there legitmately other's will require inserting a new terrace inbetween

	// NOTE: with this psuedo code arches will treat objects same height on either side of the arch as part of the same terrace not different ones
	// NOTE: requires an horizontally adjacent block for terraces to be whole - diagonally adjacent blocks will not be considered

	return exports;
})(); 