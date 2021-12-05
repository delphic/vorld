const Vorld = require('../core/vorld');

// Maxima finder, analyses the heightmap of generated terrain
module.exports = (function() {
	let exports = {};

	exports.findChunkMaxima = (vorld, chunkLookup) => {
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
			if (chunkLookup) chunkLookup[key] = maxHeight;
		}

		result = result.sort((a, b) => { 
			return b[1] - a[1];
		});

		return result;
	};

	let findPointClosestToXZCenter = (points) => {
		// BUG: This doesn't seem to be working as we'd expect but it's not really important
		let minX, maxX, minZ, maxZ;
		for (let i = 0, l = points.length; i < l; i++) {
			if (minX === undefined || points[i][0] < minX) {
				minX = points[i][0];
			}
			if (maxX === undefined || points[i][0] > maxX) {
				maxX = points[i][0]
			}
			if (minZ === undefined || points[i][2] < minZ) {
				minZ = points[i][2];
			}
			if (maxZ === undefined || points[i][2] > maxZ) {
				maxZ = points[i][2];
			}
		}
		let centerPoint = [ minX +  0.5 * (maxX - minX), minZ + 0.5 * (maxZ - minZ) ];
		
		let closestPoint = null;
		let closestSqrDist = 0;
		for (let i = 0, l = points.length; i < l; i++) {
			let dx = centerPoint[0] - points[i][0];
			let dz = centerPoint[1] - points[i][2];
			let sqrDist = dx*dx+dz*dz;
			if (sqrDist < closestSqrDist || closestPoint == null) {
				closestSqrDist = sqrDist;
				closestPoint = points[i];
			}
		}
		return closestPoint.slice();
	};

	exports.findLocalMaxima = (vorld, limit) => {
		let localMaxima = [];
		// an array of objects which are an ararys of points + a height + center point
		// each of these are a local maxima in the world (i.e. surrounded by lower height points)
		
		let chunkLookup = {};
		let chunkMaxima = exports.findChunkMaxima(vorld, chunkLookup);
		let evaluatedPointIndices = [];
		
		let maximaLookup = {};
		let getPointKey = (point) => {
			return point[0] + "_" + point[2];
		};
		for (let i = 0, l = chunkMaxima.length; i < l; i++) {
			maximaLookup[getPointKey(chunkMaxima[i])] = i;
		}

		for (let i = 0, l = chunkMaxima.length; i < l; i++) {
			if (evaluatedPointIndices[i]) continue;

			if (localMaxima.length >= limit) {
				break;
			}

			// Hacky Speed booster: 
			// Ignoring points where an ajacent chunk has a higher max
			// it is possible there are separate maxima however, they aren't far apart
			// so it's probably fine to treat them as the same.
			let chunkI = Math.floor(chunkMaxima[i][0] / vorld.chunkSize);
			let chunkK = Math.floor(chunkMaxima[i][2] / vorld.chunkSize);
			let keys = [ 
				(chunkI - 1) + "_" + chunkK,
				(chunkI + 1) + "_" + chunkK,
				chunkI + "_" + (chunkK - 1),
				chunkI + "_" + (chunkK + 1) ];
			let foundAdjacentChunkWithHigherY = false;
			for (let j = 0, n = keys.length; j < n; j++) {
				let y = chunkLookup[keys[j]];
				if(y !== undefined && y > chunkMaxima[i][1]) {
					foundAdjacentChunkWithHigherY = true;
					break;
				}
			}

			if (foundAdjacentChunkWithHigherY) {
				// Unlikley this is a local maxima
				// even if it is it will be very close to another
				// so skip it
				evaluatedPointIndices[i] = true;
				continue;
			}

			let foundHigherAdjacentPoint = false;
			let pointsConsidered = {};
			let maximaPoints = [];
			let targetPoints = [ [], [], [], [] ];

			let pointQueue = [ chunkMaxima[i] ];

			evaluatedPointIndices[i] = true;
			pointsConsidered[getPointKey(chunkMaxima[i])] = true;

			while (pointQueue.length > 0) {
				let point = pointQueue.splice(0, 1)[0];
				maximaPoints.push(point);

				// Set target points
				targetPoints[0][1] = targetPoints[1][1] = targetPoints[2][1] = targetPoints[3][1] = point[1];
				targetPoints[0][0] = point[0] - 1;
				targetPoints[1][0] = point[0] + 1;
				targetPoints[2][0] = targetPoints[3][0] = point[0];
				targetPoints[0][2] = targetPoints[1][2] = point[2];
				targetPoints[2][2] = point[2] - 1;
				targetPoints[3][2] = point[2] + 1;

				for (let j = 0; j < 4; j++) {
					let targetPoint = targetPoints[j];
					targetPoint[1] = Vorld.getHighestBlockY(vorld, targetPoint[0], targetPoint[2]);
					let targetPointKey = getPointKey(targetPoint);
					
					if (!pointsConsidered[targetPointKey]) {
						let maximaIndex = maximaLookup[targetPointKey];
						if (maximaIndex !== undefined) {
							evaluatedPointIndices[maximaIndex] = true;
						}
						if (targetPoint[1] > point[1]) {
							// Not Maxima
							foundHigherAdjacentPoint = true;
						} else if (targetPoint[1] == point[1]
							&& !foundHigherAdjacentPoint) {
							pointQueue.push(targetPoint.slice());
							pointsConsidered[targetPointKey] = true;
						}
					}
				}
			}

			if (!foundHigherAdjacentPoint) {
				// Shouldn't be possible for maximaPoints to be empty
				localMaxima.push({ points: maximaPoints, height: maximaPoints[0][1], center: findPointClosestToXZCenter(maximaPoints) });
			}
		}

		// Just want a list of points - much as the other data is interesting
		let result = [];
		for (let i = 0, l = localMaxima.length; i < l; i++) {
			result.push(localMaxima[i].center);
		}

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