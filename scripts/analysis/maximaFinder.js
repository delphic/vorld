const Vorld = require('../world');

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

	// Duplicate of find local maxima except that the maxima are excluded if there is no path 
	// to a block at 0 with adjacent water, also maxima that are water are excluded
	// Only ensures traversability with generation configs with water filling air blocks below 0
	// Known edge case: connecting to enclosed water in the middle of an otherwise unscalable island
	exports.findTraversableLocalMaxima = (vorld, waterBlockId, limit) => {
		let localMaxima = [];
		// an array of objects which are an ararys of points + a height + center point
		// each of these are a local maxima in the world (i.e. surrounded by lower height points)
		let waterMaxHeight = 0;

		let chunkLookup = {};
		let chunkMaxima = exports.findChunkMaxima(vorld, chunkLookup);
		let evaluatedPointIndices = [];
		let traversibilityCache = {};
		
		let maximaLookup = {};
		let getPointKey = (point) => {
			return point[0] + "_" + point[2];
		};
		for (let i = 0, l = chunkMaxima.length; i < l; i++) {
			maximaLookup[getPointKey(chunkMaxima[i])] = i;
		}

		for (let i = 0, l = chunkMaxima.length; i < l; i++) {
			if (evaluatedPointIndices[i]) continue;

			let currentMaximaPointKey = getPointKey(chunkMaxima[i]);

			if (traversibilityCache[currentMaximaPointKey] === false) {
				// Already encountered when searching another maxima which was not traversible
				// Don't bother to search - unless that is you want to track untraversible maxima too
				// for points of interest
				continue;
			}

			if (localMaxima.length >= limit) {
				break;
			}
			
			if (chunkMaxima[i][1] == 0
				&& Vorld.getBlock(vorld, chunkMaxima[i][0], chunkMaxima[i][1], chunkMaxima[i][2]) == waterBlockId) {
				// Not interested in 'maxima' that are water blocks
				continue;
			}

			// Hacky Speed booster: 
			// Ignoring points where an ajacent chunk has a higher max
			// it is possible there are separate maxima however, they aren't far apart
			// so it's probably fine to treat them as the same.
			/*
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
			}*/

			let foundPathToWater = false;
			let foundHigherAdjacentPoint = false;
			let pointsConsidered = {};
			let maximaPoints = [];
			let targetPoints = [ [], [], [], [] ];

			// Two queues to differentiate between searching
			// traversability and searching out the extents of this maxima
			let maximaPointQueue = [ chunkMaxima[i] ];
			let pointQueue = [];
			let maximaHeight = chunkMaxima[i][1];

			let encounteredMaxima = [];
			// Keys of maxima that were traversible to from current
			// evaluated maxima point but were not directly connected

			evaluatedPointIndices[i] = true;
			pointsConsidered[currentMaximaPointKey] = true;

			let isKnownTraversible = traversibilityCache[currentMaximaPointKey];

			while (maximaPointQueue.length > 0 || pointQueue.length > 0) {
				let point;
				let isPointOnCurrentMaxima;
				if (maximaPointQueue.length > 0) {
					// Prioritise maxima points to fully explore that space before
					// performing traversability search
					isPointOnCurrentMaxima = true; 
					point = maximaPointQueue.splice(0, 1)[0];
					maximaPoints.push(point);
				} else {
					isPointOnCurrentMaxima = false;
					point = pointQueue.splice(0, 1)[0];
				}

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
							if (isPointOnCurrentMaxima) {
								evaluatedPointIndices[maximaIndex] = true;
							} else {
								encounteredMaxima.push(targetPointKey);
							}
						}
						if (targetPoint[1] > point[1]) {
							if (isPointOnCurrentMaxima) {
								// This is not a local maxima
								foundHigherAdjacentPoint = true;
							} else if (!foundHigherAdjacentPoint && targetPoint[1] == point[1])  {
								if (!isKnownTraversible) {
									pointQueue.push(targetPoint.slice());
								}
								pointsConsidered[targetPointKey] = true;
							}
						} else if (targetPoint[1] == point[1] && !foundHigherAdjacentPoint) {
							// Check for water
							if (targetPoint[1] == waterMaxHeight 
								&& Vorld.getBlock(vorld, targetPoint[0], targetPoint[1], targetPoint[2]) == waterBlockId) {
								// Found path to water, don't need to search downwards anymore!
								foundPathToWater = true;
							} else {
								if (isPointOnCurrentMaxima) {
									maximaPointQueue.push(targetPoint.slice());
								} else if (!isKnownTraversible) {
									pointQueue.push(targetPoint.slice());
								}
								pointsConsidered[targetPointKey] = true;
							}
						} else if (!foundPathToWater && !foundHigherAdjacentPoint
							&& targetPoint[1] == point[1] - 1 
							&& targetPoint[1] >= waterMaxHeight
							&& Vorld.getBlock(vorld, targetPoint[0], targetPoint[1], targetPoint[2]) != waterBlockId) {
							// If point is lower one add to queue to search for water 
							if (!isKnownTraversible) {
								pointQueue.push(targetPoint.slice());
							}
							pointsConsidered[targetPointKey] = true;
						}
					}
				}
			}

			let isTraversible = isKnownTraversible || foundPathToWater;
			// Cache the traversibility of encountered maxima
			for (let j = 0, n = encounteredMaxima.length; j < n; j++) {
				traversibilityCache[encounteredMaxima[j]] = isTraversible;
			}

			if (!foundHigherAdjacentPoint && isTraversible) {
				// Shouldn't be possible for maximaPoints to be empty
				localMaxima.push({ points: maximaPoints, height: maximaHeight, center: findPointClosestToXZCenter(maximaPoints) });
			}
		}

		// Just want a list of points - much as the other data is interesting
		let result = [];
		for (let i = 0, l = localMaxima.length; i < l; i++) {
			result.push(localMaxima[i].center);
		}

		return result;
	};
	
	return exports;
})(); 