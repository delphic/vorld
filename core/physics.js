const { Maths, Mesh, Bounds } = require('../../fury/src/fury');
let Vorld = require('./vorld');
let Utils = require('./utils');

let Physics = module.exports = (function(){
	let exports = {};

	let transformBoxToVorldSpace = (box, vorld, x, y, z) => {
		let rotation = Vorld.getBlockRotation(vorld, x, y, z);
		Utils.transformPointToVorldSpace(box.min, rotation, x, y, z);
		Utils.transformPointToVorldSpace(box.max, rotation, x, y, z);
		// Could probably keep a lookup table of pre-transformed rotation -> bounds and just have to offset them

		if (rotation) {
			// After rotation max and min aren't necessarily larger or smaller than each other!
			let minX = Math.min(box.min[0], box.max[0]);
			let minY = Math.min(box.min[1], box.max[1]);
			let minZ = Math.min(box.min[2], box.max[2]);
			let maxX = Math.max(box.min[0], box.max[0]);
			let maxY = Math.max(box.min[1], box.max[1]);
			let maxZ = Math.max(box.min[2], box.max[2]);
			box.min[0] = minX;
			box.min[1] = minY;
			box.min[2] = minZ;
			box.max[0] = maxX;
			box.max[1] = maxY;
			box.max[2] = maxZ;
		}
		// Update extents/size and center
		box.recalculateExtents();
		return box;
	};

	exports.appendAABBsForBlock = (out, vorld, x, y, z, createBoxDelegate) => {
		// Based block definition and rotation + position, append as many AABB's as relevant
		let block = Vorld.getBlock(vorld, x, y, z);
		if (block) {
			let def = Vorld.getBlockTypeDefinition(vorld, block);
			if (!def || !def.isSolid) {
				return;
			}
			if (!def.mesh) {
				out.push(createBoxDelegate(x, y, z));
			} else if (def.collision) {
				// Collision is an array of bounds provided relative to the voxel origin (when not rotated)
				for (let i = 0, l = def.collision.length; i < l; i++) {
					let box = createBoxDelegate(x, y, z);
					Maths.vec3.copy(box.min, def.collision[i].min);
					Maths.vec3.copy(box.max, def.collision[i].max);

					transformBoxToVorldSpace(box, vorld, x, y, z);
					out.push(box);
				}
			} else {
				let box = createBoxDelegate(x, y, z); 

				// NOTE: Anything with more than one AABB will need them specifying manually 
				// and individually transformed rather than using calculations (e.g. steps)
				Mesh.calculateMinPoint(box.min, def.mesh.vertices);
				Mesh.calculateMaxPoint(box.max, def.mesh.vertices);
				
				transformBoxToVorldSpace(box, vorld, x, y, z);
				out.push(box);
			}
		}
	};

	let voxel = [];
	exports.raycast = (outHitPoint, vorld, origin, direction, distance) => {
		if (distance === undefined || distance === null) {
			distance = 1 / 0; // Infinite! Super Big!
		}

		voxel[0] = Math.floor(origin[0]);
		voxel[1] = Math.floor(origin[1]);
		voxel[2] = Math.floor(origin[2]);
		outHitPoint[0] = origin[0];
		outHitPoint[1] = origin[1];
		outHitPoint[2] = origin[2];

		let signDx = Math.sign(direction[0]), signDy = Math.sign(direction[1]), signDz = Math.sign(direction[2]);
		let s = 0;

		while (s < distance) {
			// what's the distance to the next voxel threshold
			let sx = Math.abs(voxel[0] + 0.5 + 0.5 * signDx - outHitPoint[0]);
			let sy = Math.abs(voxel[1] + 0.5 + 0.5 * signDy - outHitPoint[1]);
			let sz = Math.abs(voxel[2] + 0.5 + 0.5 * signDz - outHitPoint[2]);
			// which threshold will be hit first?
			let tx = Number.POSITIVE_INFINITY;
			let ty = Number.POSITIVE_INFINITY;
			let tz = Number.POSITIVE_INFINITY;
			// 0 / 0 is NaN rather than infinity so check for divide by 0 
			if (direction[0] !== 0) {
				tx = sx / Math.abs(direction[0]);
			}
			if (direction[1] !== 0) {
				ty = sy / Math.abs(direction[1]);
			}
			if (direction[2] !== 0) {
				tz = sz / Math.abs(direction[2]);
			}
			let t = Math.min(tx, ty, tz);

			// Determine new hit point and voxel coordinate
			// TODO: May want to reset/recalculate on moving chunks prevent float precision issues
			if (tx === t) {
				voxel[0] = voxel[0] + signDx;
				outHitPoint[0] += tx * direction[0]; 
				outHitPoint[1] += tx * direction[1];
				outHitPoint[2] += tx * direction[2]; 
				s += sx + Math.abs(tx * direction[1]) + Math.abs(tx * direction[2]);
			} else if (ty === t) {
				voxel[1] = voxel[1] + signDy;
				outHitPoint[0] += ty * direction[0];
				outHitPoint[1] += ty * direction[1];
				outHitPoint[2] += ty * direction[2]; 
				s += sy + Math.abs(ty * direction[0]) + Math.abs(ty * direction[2]);
			} else {
				voxel[2] = voxel[2] + signDz;
				outHitPoint[0] += tz * direction[0];
				outHitPoint[1] += tz * direction[1];
				outHitPoint[2] += tz * direction[2]; 
				s += sz + Math.abs(tz * direction[0]) + Math.abs(tz * direction[1]); 
			}

			// Exceed distance no hits for you!
			if (s > distance) {
				return 0;
			}
			
			// Check for collision
			let block = Vorld.getBlock(vorld, voxel[0], voxel[1], voxel[2]);
			if (block && Vorld.isBlockTypeSolid(vorld, block)) { // TODO: Might want to replace with layers rather than isSolid
				// Might be interesting to check that origin + s * direction = hitPoint (float precision)
				return s;
			} else if (block === null) {
				// No chunk - assume world has ended
				// TODO: skip to next chunk
				// TODO: Return 0 if no chunks remaining rather than first empty
				return 0;
			}
		}
	};

	return exports;
})();