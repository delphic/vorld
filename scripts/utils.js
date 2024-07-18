let Cardinal = require('./cardinal');
let Maths = require('./maths');

module.exports = (function() {
	let exports = {};

	exports.getChunkKey = function(i, j, k) {
		return i + "_" + j + "_" + k;
	};

	// By convention, it is expected you will deconstruct the result of this Util method
	let adjustChunkIndicesResult = [];
	exports.adjustChunkIndices = function(chunkSize, chunkI, chunkJ, chunkK, blockI, blockJ, blockK) {
		// Assumes you won't go out by more than chunkSize
		if (blockI >= chunkSize) {
			blockI = blockI - chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= chunkSize) {
			blockJ = blockJ - chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= chunkSize) {
			blockK = blockK - chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = chunkSize + blockK;
			chunkK -= 1;
		}

		adjustChunkIndicesResult[0] = chunkI;
		adjustChunkIndicesResult[1] = chunkJ;
		adjustChunkIndicesResult[2] = chunkK;
		adjustChunkIndicesResult[3] = blockI;
		adjustChunkIndicesResult[4] = blockJ;
		adjustChunkIndicesResult[5] = blockK;

		return adjustChunkIndicesResult;
	};

	// By convention, it is expected you will deconstruct the result of this Util method
	let getIndicesResult = [];
	exports.getIndices = function(size, x, y, z) {
		let chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		let blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);

		getIndicesResult[0] = chunkI;
		getIndicesResult[1] = chunkJ;
		getIndicesResult[2] = chunkK;
		getIndicesResult[3] = blockI;
		getIndicesResult[4] = blockJ;
		getIndicesResult[5] = blockK;

		return getIndicesResult;
	};

	exports.transformPointToVorldSpace = (vector, rotation, x, y, z) => {
		if (rotation) {
			Maths.offsetVector(vector, -0.5, -0.5, -0.5);
			Cardinal.transformVector(vector, rotation);
			Maths.offsetVector(vector, 0.5 + x, 0.5 + y, 0.5 + z);
			Maths.snapVector(vector);
		} else {
			Maths.offsetVector(vector, x, y, z);
		}
	}; 

	exports.getTileIdFromDirection = (atlas, block, direction) => {
		let tileId = 0;
		let map = atlas.blockToTileIndex[block];
		switch (direction) {
			case Cardinal.Direction.up:
				tileId = map.top !== undefined ? map.top : map.side;
				break;
			case Cardinal.Direction.down:
				tileId = map.bottom !== undefined ? map.bottom : map.side;
				break;
			case Cardinal.Direction.forward:
				tileId = map.forward !== undefined ? map.forward : map.side;
				break;
			case Cardinal.Direction.back:
				tileId = map.back !== undefined ? map.back : map.side;
				break;
			case Cardinal.Direction.left:
				tileId = map.left !== undefined ? map.left : map.side;
				break;
			case Cardinal.Direction.right:
				tileId = map.right !== undefined ? map.right : map.side; 
				break;
		}
		return tileId;
	};

	// Method to generate rotation look ups for cardinal directions
	exports.calculateCardinalRotationLookupTables = () => {
		// Not entirely sure this'll work - as seems to want to use Fury.Maths
		// but the import is for Vorld maths, which does not re-export the Fury module
		// None the less updating to match Fury v0.1.1 updated utility extensions
		let quat = Maths.quat; 
		
		let createQuat = (cardinalRotations) => {
			let result = quat.create();
			if (cardinalRotations) {
				for (let i = 0, l = cardinalRotations.length; i < l; i++) {
					let rotation = cardinalRotations[i];
					if (rotation[0]) {
						Maths.quat.rotate(result, result, rotation[0] * Math.PI/2, Maths.vec3.X);
					}
					if (rotation[1]) {
						Maths.quat.rotate(result, result, rotation[1] * Math.PI/2, Maths.vec3.Y);
					}
					if (rotation[2]) {
						Maths.quat.rotate(result, result, rotation[2] * Math.PI/2, Maths.vec3.Z);
					}
				}
			}
			return result;
		};
	
		let rotationQuats = [];

		rotationQuats[Cardinal.Rotation.upForward] = createQuat();
		rotationQuats[Cardinal.Rotation.upRight] = createQuat([[0,1,0]]);
		rotationQuats[Cardinal.Rotation.upBack] = createQuat([[0,2,0]]);
		rotationQuats[Cardinal.Rotation.upLeft] = createQuat([[0,3,0]]);
	
		rotationQuats[Cardinal.Rotation.rightForward] = createQuat([[0,0,3]]);
		rotationQuats[Cardinal.Rotation.rightDown] = createQuat([[0,0,3],[1,0,0]]);
		rotationQuats[Cardinal.Rotation.rightBack] = createQuat([[0,0,3],[2,0,0]]);
		rotationQuats[Cardinal.Rotation.rightUp] = createQuat([[0,0,3],[3,0,0]]);
	
		rotationQuats[Cardinal.Rotation.downForward] = createQuat([[0,0,2]]);
		rotationQuats[Cardinal.Rotation.downLeft] = createQuat([[0,0,2],[0,3,0]]);
		rotationQuats[Cardinal.Rotation.downBack] = createQuat([[0,0,2],[0,2,0]]);
		rotationQuats[Cardinal.Rotation.downRight] = createQuat([[0,0,2],[0,1,0]]);
		
		rotationQuats[Cardinal.Rotation.leftForward] = createQuat([[0,0,1]]);
		rotationQuats[Cardinal.Rotation.leftDown] = createQuat([[0,0,1],[1,0,0]]);
		rotationQuats[Cardinal.Rotation.leftBack] = createQuat([[0,0,1],[2,0,0]]);
		rotationQuats[Cardinal.Rotation.leftUp] = createQuat([[0,0,1],[3,0,0]]);
	
		rotationQuats[Cardinal.Rotation.forwardDown] = createQuat([[1,0,0]]);
		rotationQuats[Cardinal.Rotation.forwardRight] = createQuat([[1,0,0],[0,0,1]]);
		rotationQuats[Cardinal.Rotation.forwardUp] = createQuat([[1,0,0],[0,0,2]]);
		rotationQuats[Cardinal.Rotation.forwardLeft] = createQuat([[1,0,0],[0,0,3]]);
	
		rotationQuats[Cardinal.Rotation.backUp] = createQuat([[3,0,0]]);
		rotationQuats[Cardinal.Rotation.backLeft] = createQuat([[3,0,0],[0,0,1]]);
		rotationQuats[Cardinal.Rotation.backDown] = createQuat([[3,0,0],[0,0,2]]);
		rotationQuats[Cardinal.Rotation.backRight] = createQuat([[3,0,0],[0,0,3]]);
	
		let qx = [], qy = [], qz = [], qw = [];
		for (let i = 0, l = rotationQuats.length; i < l; i++) {
			qx[i] = rotationQuats[i][0];
			qy[i] = rotationQuats[i][1];
			qz[i] = rotationQuats[i][2];
			qw[i] = rotationQuats[i][3];
		}
		console.log(qx);
		console.log(qy);
		console.log(qz);
		console.log(qw);
	};

	exports.forVolume = (xMin, xMax, yMin, yMax, zMin, zMax, delegate) => {
		for (let j = 0, n = yMax - yMin; j <= n; j++) {
			for (let k = 0, m = zMax - zMin; k <= m; k++) {
				for (let i = 0, l = xMax - xMin; i <= l; i++) {
					delegate(xMin + i, yMin + j, zMin + k);
				}
			}
		}
	};

	exports.createBlockIdsLookup = (vorld) => {
		let blockIds = {};
		if (vorld.blockConfig) {
			for (let i = 0, l = vorld.blockConfig.length; i < l; i++) {
				blockIds[vorld.blockConfig[i].name] = i;
			}
		}
		return blockIds;
	};

	return exports;
})();
