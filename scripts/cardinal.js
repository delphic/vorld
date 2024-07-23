let Maths = require('./maths');

module.exports = (function() { 
	let exports = {};

	let Direction = exports.Direction = {
		forward: 0,
		back: 1,
		up: 2,
		down: 3,
		right: 4,
		left: 5
	};

	exports.getDirectionDescription = (direction) => {
		switch(direction) {
			case Direction.forward: return "forward";
			case Direction.back: return "back";
			case Direction.up: return "up";
			case Direction.down: return "down";
			case Direction.right: return "right";
			case Direction.left: return "left";
		}
	};

	// Enum of all cardinal aligned rotations - could do clever maths but this is more readable and probably more performant
	// In the form of YZ local -> global (with x implicit and dependent on handedness), e.g. LeftBack => local up = global left, local forward = global back
	// In order of a given y direction, rotating then rotating clockwise around local y, implicit right direction in comment
	let Rotation = exports.Rotation = {
		// No Rotations, local up = global up
		upForward: 0,		// Right
		upRight: 1,			// Back
		upBack: 2,			// Left
		upLeft: 3,			// Forward
		// One Rotation around Z, local up = global right
		rightForward: 4,	// Down
		rightDown: 5,		// Back
		rightBack: 6,		// Up
		rightUp: 7,			// Forward
		// Two Rotations around Z, local up = global down
		downForward: 8,		// Left
		downLeft: 9,		// Back
		downBack: 10,		// Right
		downRight: 11,		// Forward
		// Three Rotations around Z, local up = global left
		leftForward: 12,	// Up
		leftUp: 13,			// Back
		leftBack: 14,		// Down
		leftDown: 15,		// Forward
		// One Rotation around X, local up = global forward
		forwardDown: 16,	// Right
		forwardRight: 17,	// Up
		forwardUp: 18,		// Left
		forwardLeft: 19,	// Down
		// Three Rotations around X, local up = global back
		backUp: 20,			// Right
		backRight: 21,		// Down
		backDown: 22,		// Left
		backLeft: 23		// Up
	};

	exports.getCardinalRotation = (up, forward) => {
		switch (up) {
			case Direction.up:
				switch (forward) {
					case Direction.forward: return Rotation.upForward;
					case Direction.right: return Rotation.upRight;
					case Direction.back: return Rotation.upBack;
					case Direction.left: return Rotation.upLeft;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.upForward;
				}
			case Direction.right:
				switch (forward) {
					case Direction.forward: return Rotation.rightForward;
					case Direction.down: return Rotation.rightDown;
					case Direction.back: return Rotation.rightBack;
					case Direction.up: return Rotation.rightUp;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.rightForward;
				}
			case Direction.down:
				switch (forward) {
					case Direction.forward: return Rotation.downForward;
					case Direction.left: return Rotation.downLeft;
					case Direction.back: return Rotation.downBack;
					case Direction.right: return Rotation.downRight;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.downForward;
				}
			case Direction.left:
				switch (forward) {
					case Direction.forward: return Rotation.leftForward;
					case Direction.up: return Rotation.leftUp;
					case Direction.back: return Rotation.leftBack;
					case Direction.down: return Rotation.leftDown;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.leftForward;
				}
			case Direction.forward:
				switch (forward) {
					case Direction.down: return Rotation.forwardDown;
					case Direction.right: return Rotation.forwardRight;
					case Direction.up: return Rotation.forwardUp;
					case Direction.left: return Rotation.forwardLeft;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.forwardDown;
				}
			case Direction.back:
				switch (forward) {
					case Direction.up: return Rotation.backUp;
					case Direction.right: return Rotation.backRight;
					case Direction.down: return Rotation.backDown;
					case Direction.left: return Rotation.backLeft;
					default:
						console.warn("Invalid rotation combination, up: " + up + ", forward: " + forward);
						return Rotation.backUp;
				}
			default:
				console.warn("Invalid rotation up: " + up);
				return Rotation.upForward;
		}
	};

	exports.getUpDirection = (rotation) => {
		switch (rotation) {
			case Rotation.upForward:
			case Rotation.upRight:
			case Rotation.upBack:
			case Rotation.upLeft:
				return Direction.up;
			case Rotation.downForward:
			case Rotation.downLeft:
			case Rotation.downBack:
			case Rotation.downRight:
				return Direction.down;
			case Rotation.leftBack:
			case Rotation.leftDown:
			case Rotation.leftForward:
			case Rotation.leftUp:
				return Direction.left;
			case Rotation.rightBack:
			case Rotation.rightDown:
			case Rotation.rightForward:
			case Rotation.rightUp:
				return Direction.right;
			case Rotation.forwardDown:
			case Rotation.forwardLeft:
			case Rotation.forwardRight:
			case Rotation.forwardUp:
				return Direction.forward;
			case Rotation.backDown:
			case Rotation.backLeft:
			case Rotation.backRight:
			case Rotation.backUp:
				return Direction.back;
			default:
				return Direction.up;
		}
	};

	exports.getForwardDirection = (rotation) => {
		switch(rotation) {
			case Rotation.upForward:
			case Rotation.downForward:
			case Rotation.leftForward:
			case Rotation.rightForward:
				return Direction.forward;
			case Rotation.upBack:
			case Rotation.downBack:
			case Rotation.leftBack:
			case Rotation.rightBack:
				return Direction.back;
			case Rotation.upLeft:
			case Rotation.downLeft:
			case Rotation.forwardLeft:
			case Rotation.backLeft:
				return Direction.left;
			case Rotation.upRight:
			case Rotation.downRight:
			case Rotation.forwardRight:
			case Rotation.backRight:
				return Direction.right;
			case Rotation.forwardUp:
			case Rotation.backUp:
			case Rotation.leftUp:
			case Rotation.rightUp:
				return Direction.up;
			case Rotation.forwardDown:
			case Rotation.backDown:
			case Rotation.leftDown:
			case Rotation.rightDown:
				return Direction.down;
			default:
				return Direction.forward;
		}
	};

	exports.getAxis = (axis, rotation) => {
		switch (axis) {
			case 0:
				return exports.getXAxis(rotation);
			case 1:
				return exports.getYAxis(rotation);
			case 2:
				return exports.getZAxis(rotation);
			default:
				return axis;
		}
	};
	
	// Returns the index of the local X axis in global space
	exports.getXAxis = (rotation) => {
		switch(rotation) {
			case Rotation.upForward:
			case Rotation.downForward:
			case Rotation.upBack:
			case Rotation.downBack:
			case Rotation.forwardUp:
			case Rotation.backUp:
			case Rotation.forwardDown:
			case Rotation.backDown:
				return 0;
			case Rotation.leftForward:
			case Rotation.rightForward:
			case Rotation.leftBack:
			case Rotation.rightBack:
			case Rotation.forwardLeft:
			case Rotation.backLeft:
			case Rotation.forwardRight:
			case Rotation.backRight:
				return 1;
			case Rotation.upLeft:
			case Rotation.downLeft:
			case Rotation.upRight:
			case Rotation.downRight:
			case Rotation.leftUp:
			case Rotation.rightUp:
			case Rotation.leftDown:
			case Rotation.rightDown:
				return 2;
			default:
				return 0;
		}
	};

	// Returns the index of the local Y axis in global space
	exports.getYAxis = (rotation) => {
		switch (rotation) {
			case Rotation.upForward:
			case Rotation.upRight:
			case Rotation.upBack:
			case Rotation.upLeft:
			case Rotation.downForward:
			case Rotation.downLeft:
			case Rotation.downBack:
			case Rotation.downRight:
				return 1;
			case Rotation.leftBack:
			case Rotation.leftDown:
			case Rotation.leftForward:
			case Rotation.leftUp:
			case Rotation.rightBack:
			case Rotation.rightDown:
			case Rotation.rightForward:
			case Rotation.rightUp:
				return 0;
			case Rotation.forwardDown:
			case Rotation.forwardLeft:
			case Rotation.forwardRight:
			case Rotation.forwardUp:
			case Rotation.backDown:
			case Rotation.backLeft:
			case Rotation.backRight:
			case Rotation.backUp:
				return 2;
			default:
				return 1;
		}
	};

	// Returns the index of the local Z axis in global space
	exports.getZAxis = (rotation) => {
		switch(rotation) {
			case Rotation.upForward:
			case Rotation.downForward:
			case Rotation.leftForward:
			case Rotation.rightForward:
			case Rotation.upBack:
			case Rotation.downBack:
			case Rotation.leftBack:
			case Rotation.rightBack:
				return 2;
			case Rotation.upLeft:
			case Rotation.downLeft:
			case Rotation.forwardLeft:
			case Rotation.backLeft:
			case Rotation.upRight:
			case Rotation.downRight:
			case Rotation.forwardRight:
			case Rotation.backRight:
				return 0;
			case Rotation.forwardUp:
			case Rotation.backUp:
			case Rotation.leftUp:
			case Rotation.rightUp:
			case Rotation.forwardDown:
			case Rotation.backDown:
			case Rotation.leftDown:
			case Rotation.rightDown:
				return 1;
			default:
				return 2;
		}
	};

	// Covnerts direction to eigenvector
	let getVectorFromDirection = exports.getVectorFromDirection = (out, direction) => {
		out[0] = out[1] = out[2]= 0;
		switch (direction) {
			case Direction.forward:
				out[2] = 1;
				break;
			case Direction.back:
				out[2] = -1;
				break;
			case Direction.up:
				out[1] = 1;
				break;
			case Direction.down:
				out[1] = -1;
				break;
			// Handedness
			case Direction.right:
				out[0] = 1;
				break;
			case Direction.left:
				out[0] = -1;
				break;
		}
	};

	// Converts ~ eigenvector into direction
	let getDirectionFromVector = exports.getDirectionFromVector = (v) => {
		let threshold = 0.001;
		if (!Maths.approximately(v[0], 0, threshold)) {
			// Handedness again!
			if (v[0] > 0) {
				return Direction.right;
			} else {
				return Direction.left;
			}
		}
		if (!Maths.approximately(v[1], 0, threshold)) {
			if (v[1] > 0) {
				return Direction.up;
			} else {
				return Direction.down;
			}
		}
		if (!Maths.approximately(v[2], 0, threshold)) {
			if (v[2] > 0) {
				return Direction.forward;
			} else {
				return Direction.back;
			}
		}
		throw new Error("Could not convert " + v + " to direction");
	};

	// Lookup tables for quaternion elements
	let qx = [0, 0, 0, 0, 0, -0.5, -Math.SQRT1_2, -0.5, 0, Math.SQRT1_2, 1, Math.SQRT1_2, 0, 0.5, Math.SQRT1_2, 0.5, Math.SQRT1_2, 0.5, 0, -0.5, Math.SQRT1_2, -0.5, 0, 0.5];
	let qy = [0, Math.SQRT1_2, 1, Math.SQRT1_2, 0, -0.5, -Math.SQRT1_2, -0.5, 0, 0, 0, 0, 0, -0.5, -Math.SQRT1_2, -0.5, 0, 0.5, Math.SQRT1_2, 0.5, 0, 0.5, Math.SQRT1_2, 0.5];
	let qz = [0, 0, 0, 0, Math.SQRT1_2, 0.5, 0, -0.5, 1, -Math.SQRT1_2, 0, Math.SQRT1_2, Math.SQRT1_2, -0.5, 0, 0.5, 0, 0.5, Math.SQRT1_2, 0.5, 0, -0.5, -Math.SQRT1_2, -0.5];
	let qw = [1, Math.SQRT1_2, 0, -Math.SQRT1_2, -Math.SQRT1_2, -0.5, -0, 0.5, 0, -0, 0, 0, Math.SQRT1_2, -0.5, 0, 0.5, Math.SQRT1_2, 0.5, 0, -0.5, -Math.SQRT1_2, 0.5, -0, -0.5];

	let getQuatFromRotation = exports.getQuatFromRotation = (out, rotation) => {
		out[0] = qx[rotation];
		out[1] = qy[rotation];
		out[2] = qz[rotation];
		out[3] = qw[rotation];
		return out;
	};

	let vec = [0,0,0];
	let quat = [0,0,0,1];

	exports.reverseTransformDirection = (direction, rotation) => {
		// Return the direction if it were rotated by rotation would give the provided direction
		getVectorFromDirection(vec, direction);
		Maths.invertQuat(quat, getQuatFromRotation(quat, rotation));
		Maths.transformVecByQuat(vec, vec, quat);
		return getDirectionFromVector(vec);
	};

	exports.transformVector = (v, rotation) => {
		getQuatFromRotation(quat, rotation);
		Maths.transformVecByQuat(v, v, quat);
	};

	exports.invertDirection = (direction) => {
		return (direction % 2 == 0) ? direction + 1 : direction - 1;
	};

	return exports;
})();