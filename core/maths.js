module.exports = (function(){
	// Subset of FuryMaths functions required by vorld
	// Ideally would separate maths library for reuse
	let exports = {};

	let approximately = exports.approximately = (a, b, epsilon) => {
		if (!epsilon) epsilon = Number.EPSILON;
		return Math.abs(a - b) < epsilon;
	}; 

	exports.invertQuat = (q) => {
		let q0 = q[0], q1 = q[1], q2 = q[2], q3 = q[3];
		let dot = q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3;
		let invDot = dot ? 1.0 / dot : 0;
		q[0] = -q0 * invDot;
		q[1] = -q1 * invDot;
		q[2] = -q2 * invDot;
		q[3] = q3 * invDot;
		return q; 
	};

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

	exports.transformVecByQuat = (out, a, q) => {
		// benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
		let qx = q[0], qy = q[1], qz = q[2], qw = q[3];
		let x = a[0], y = a[1], z = a[2];
		// var qvec = [qx, qy, qz];
		// var uv = vec3.cross([], qvec, a);
		let uvx = qy * z - qz * y, uvy = qz * x - qx * z, uvz = qx * y - qy * x;
		// var uuv = vec3.cross([], qvec, uv);
		let uuvx = qy * uvz - qz * uvy, uuvy = qz * uvx - qx * uvz, uuvz = qx * uvy - qy * uvx;
		// vec3.scale(uv, uv, 2 * w);
		let w2 = qw * 2;
		uvx *= w2;
		uvy *= w2;
		uvz *= w2;
		// vec3.scale(uuv, uuv, 2);
		uuvx *= 2;
		uuvy *= 2;
		uuvz *= 2;
		// return vec3.add(out, a, vec3.add(out, uv, uuv));
		out[0] = x + uvx + uuvx;
		out[1] = y + uvy + uuvy;
		out[2] = z + uvz + uuvz;
		return out;
	};

	return exports;
})();