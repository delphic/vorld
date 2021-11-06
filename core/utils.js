let Cardinal = require('./cardinal');
let Maths = require('./maths');

let Utils = module.exports = (function() {
	let exports = {};

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

	// Method to generate rotation look ups for cardinal directions
	exports.calculateCardinalRotationLookupTables = (furyMaths) => {
		let Maths = furyMaths;
		let quat = Maths.quat;
		
		let createQuat = (cardinalRotations) => {
			let result = quat.create();
			if (cardinalRotations) {
				for (let i = 0, l = cardinalRotations.length; i < l; i++) {
					let rotation = cardinalRotations[i];
					if (rotation[0]) {
						Maths.quatRotate(result, result, rotation[0] * Math.PI/2, Maths.vec3X);
					}
					if (rotation[1]) {
						Maths.quatRotate(result, result, rotation[1] * Math.PI/2, Maths.vec3Y);
					}
					if (rotation[2]) {
						Maths.quatRotate(result, result, rotation[2] * Math.PI/2, Maths.vec3Z);
					}
				}
			}
			return result;
		};
	
		rotationQuats = [];

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

	return exports;
})();
