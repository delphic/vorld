// Based upon https://gist.github.com/banksean/304522 modified to CommonJS pattern
//
// Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.

let PerlinNoise = module.exports = (function() {
	let grad3 = [
		[1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
		[1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
		[0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
	];
	
	let dot = (v, x, y, z) => {
		return v[0] * x + v[1] * y + v[2] * z;
	};
	let lerp = (a, b, t) => {
		return (1-t) * a + t * b;
	};
	let fade = (t) => {
		return t * t * t * (t * (t * 6 - 15) + 10);
	};

	let prototype = {
		// 3D Perlin Noise
		noise: function(x, y, z) {
			// Find unit grid cell containing point
			let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
			// Get relative xyz coordinates of point within that cell
			x = x - X; y = y - Y; z = z - Z;
			// Wrap the integer cells at 255 (smaller integer period can be introduced here)
			X = X & 255; Y = Y & 255; Z = Z & 255;
	
			// Calculate a set of eight hased gradient indicies
			// and look up in gradient array (gradP is grad3[perm[value] % 12])
			let g000 = this.gradP[X + this.perm[Y + this.perm[Z]]];
			let g001 = this.gradP[X + this.perm[Y + this.perm[Z + 1]]];
			let g010 = this.gradP[X + this.perm[Y + 1 + this.perm[Z]]];
			let g011 = this.gradP[X + this.perm[Y + 1 + this.perm[Z + 1]]];
			let g100 = this.gradP[X + 1 + this.perm[Y + this.perm[Z]]]
			let g101 = this.gradP[X + 1 + this.perm[Y + this.perm[Z + 1]]];
			let g110 = this.gradP[X + 1 + this.perm[Y + 1 + this.perm[Z]]];
			let g111 = this.gradP[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]];

			// Calculate noise contributions from each of the eight corners
			let n000 = dot(g000, x, y, z);
			let n001 = dot(g001, x, y, z - 1);
			let n010 = dot(g010, x, y - 1, z);
			let n011 = dot(g011, x, y - 1, z - 1);
			let n100 = dot(g100, x - 1, y, z);
			let n101 = dot(g101, x - 1, y, z - 1);
			let n110 = dot(g110, x - 1, y - 1, z);
			let n111 = dot(g111, x - 1, y - 1, z - 1);

			// Compute the fade curve value for x, y, z
			let u = fade(x);
			let v = fade(y);
			let w = fade(z);

			// Interpolate along the x contributions from each of the corners
			let nx00 = lerp(n000, n100, u);
			let nx01 = lerp(n001, n101, u);
			let nx10 = lerp(n010, n110, u);
			let nx11 = lerp(n011, n111, u);
			// Interpolate the four results along y
			let nxy0 = lerp(nx00, nx10, v);
			let nxy1 = lerp(nx01, nx11, v);
			// Interpolate the two last results along z;
			let nxyz = lerp(nxy0, nxy1, w);

			return nxyz;
		}
	};

	exports.create = (random) => {
		if (!random) random = Math.random;
		let perlin = Object.create(prototype);
		let p = [];
		for (let i = 0; i < 256; i++) {
			p[i] = Math.floor(random() * 256);
		}
		perlin.perm = [];
		perlin.gradP = [];
		// To remove the need for index wrapping, double the permutation table length
		for (let i = 0; i < 256; i++) {
			let pv = p[i & 255];
			perlin.perm[i] = perlin.perm[i + 256] = pv;
			// Precompute gradient permutations
			perlin.gradP[i] = perlin.gradP[i + 256] = grad3[pv % 12];
		}

		return perlin;
	};

	return exports;
})();