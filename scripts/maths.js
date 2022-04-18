const { Maths }= require('fury');

module.exports = (function(){
	let exports = {};

	let approximately = exports.approximately = Maths.approximately;
	
	exports.invertQuat = Maths.quat.invert;
	exports.transformVecByQuat = Maths.vec3.transformQuat;

	exports.offsetVector = (v, x, y, z) => {
		v[0] += x;
		v[1] += y;
		v[2] += z;
		return v;
	};

	exports.snapVector = (v) => {
		let threshold = 0.001;
		if (approximately(v[0], Math.round(v[0]), threshold)) {
			v[0] = Math.round(v[0]);
		}
		if (approximately(v[1], Math.round(v[1]), threshold)) {
			v[1] = Math.round(v[1]);
		}
		if (approximately(v[2], Math.round(v[2]), threshold)) {
			v[2] = Math.round(v[2]);
		}
		return v;
	};

	return exports;
})();