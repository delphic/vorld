// Chunk Mesher

// Builds mesh for a chunk in format expected by [Fury](https://github.com/delphic/Fury)
// With the addition of a tileIndicies buffer, for texture array lookup.
// Requires vorld slice with chunk and it's adjacent chunks data, 
// as well as an atlas information for a texture array mapping block id to texture index.

// Data is meshed by adding quads for each visible voxel face to a mesh.
// One mesh per cubic 'chunk' of voxels.
// Uses texture coordinates and an atlas to allow for multiple voxel types in  a single texture.
// Has option of outputing texture coordinates as a tile lookup rather than uv mapping.

let Vorld = require('../core/vorld');
let Chunk = require('../core/chunk');
let Maths = require('../core/maths');
let Cardinal = require('../core/cardinal');
let Utils = require('../core/utils');
let Direction = Cardinal.Direction;

let Mesher = module.exports = (function(){
	let exports = {};

	// Cube mesh data - faces in order of cardinal directions
	let cubeJson = {
		vertices: [ 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0 ],
		normals: [ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0],
		textureCoordinates: [ 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0 ],
		indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23 ]
	};

	let concat = function(a, b) {
		// GC efficient concat
		for (let i = 0, l = b.length; i < l; i++) {
			a.push(b[i]);
		}
	};
	
	// delegate should be a function taking block, i, j, k
	let forEachBlock = function(chunk, delegate) {
		for (let i = 0; i < chunk.size; i++) {
			for (let j = 0; j < chunk.size; j++) {
				for (let k = 0; k < chunk.size; k++) {
					delegate(
						Chunk.getBlock(chunk, i, j, k),
						Chunk.getBlockRotation(chunk, i, j, k),
						i, j, k); 
				}
			}
		}
	};

	let getTileIndexFromAtlas = (atlas, block, direction) => {
		if (direction == Direction.up) {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].top;
		} else if (direction == Direction.down) {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].bottom;
		} else {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].side;
		}
		return tile;
	};

	let aov = [];
	let calculateAOLevel = (vorld, vertex, direction, i, j, k, chunkI, chunkJ, chunkK) => {
		// Calculate AO level for vertex in chunk space
		// See - https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/
		// Although we remap from 0-3 to 0.75 -> 0 (i.e. amount of light reduction)
		// NOTE: Has artifacts on unequal corner values, depending on orientation of triangles in the quad (i.e. anisotropy)
		// It is not very noticable for sutble levels of AO however
		// NOTE 2: this method was only really designed to work on vertices on the grid points, 
		// and as such has artifacts when used on custom mesh vertices that could be anywhere in the cube
		// however it looks better than *no* AO 
		// TODO: Adapt calculation to work to interpolate the AO level as appropriate for off grid vertices.
		// NOTE 3: Does not take account of custom mesh vertices due to it's isBlockOpaque approach
		// however it would probably be preferable to work on a full dynamic voxel lighting technique than adjust
		// this method both calculate AO for custom meshes and due to their effect
		aov[0] = Math.round(2 * (vertex[0] - i - 0.5));
		aov[1] = Math.round(2 * (vertex[1] - j - 0.5));
		aov[2] = Math.round(2 * (vertex[2] - k - 0.5));
		let side0 = 0, side1 = 0, corner = 0;
		let x = chunkI * vorld.chunkSize + i, y = chunkJ * vorld.chunkSize + j, z = chunkK * vorld.chunkSize + k;
		switch(direction)
		{
			case Cardinal.Direction.up:
			case Cardinal.Direction.down:
				side0 = Vorld.isBlockOpaque(vorld, x + aov[0], y + aov[1], z) ? 1 : 0;
				side1 = Vorld.isBlockOpaque(vorld, x, y + aov[1], z + aov[2]) ? 1 : 0;
				break;
			case Cardinal.Direction.forward:
			case Cardinal.Direction.back:
				side0 = Vorld.isBlockOpaque(vorld, x + aov[0], y, z + aov[2]) ? 1 : 0;
				side1 = Vorld.isBlockOpaque(vorld, x, y + aov[1], z + aov[2]) ? 1 : 0;
				break;
			case Cardinal.Direction.left:
			case Cardinal.Direction.right:
				side0 = Vorld.isBlockOpaque(vorld, x + aov[0], y, z + aov[2]) ? 1 : 0;
				side1 = Vorld.isBlockOpaque(vorld, x + aov[0], y + aov[1], z) ? 1 : 0;
				break;
		}
		if (side0 && side1) {
			return 0.75; // Maximum darkness
		} else {
			corner = Vorld.isBlockOpaque(vorld, x + aov[0], y + aov[1], z + aov[2]) ? 1 : 0;
			return 0.25 * (side0 + side1 + corner);
		}
	};

	let calculateLightLevel = (vorld, vertex, direction, i, j, k, chunkI, chunkJ, chunkK) => {
		// For - non-smooth just return adj block light value
		aov[0] = Math.round(2 * (vertex[0] - i - 0.5));
		aov[1] = Math.round(2 * (vertex[1] - j - 0.5));
		aov[2] = Math.round(2 * (vertex[2] - k - 0.5));
		let adj = 0, side0 = 0, side1 = 0, corner = 0;
		switch(direction)
		{
			case Cardinal.Direction.up:
			case Cardinal.Direction.down:
				adj = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k) | 0;
				side0 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k) | 0;
				side1 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k + aov[2]) | 0;
				corner = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) | 0;
				if (!side0 && !side1 && corner > 0) {
					// If no light at side0 and side1 they may be opaque in which case we should ignore any light value from corner
					let x = chunkI * vorld.chunkSize + i, y = chunkJ * vorld.chunkSize + j, z = chunkK * vorld.chunkSize + k;
					if (Vorld.isBlockOpaque(vorld, x + aov[0], y + aov[1], z) 
						&& Vorld.isBlockOpaque(vorld, x, y + aov[1], z + aov[2])) {
						corner = 0;
					}
				}
				break;
			case Cardinal.Direction.forward:
			case Cardinal.Direction.back:
				adj = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j, k + aov[2]) | 0;
				side0 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k + aov[2]) | 0;
				side1 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k + aov[2]) | 0;
				corner = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) | 0;
				if (!side0 && !side1 && corner > 0) {
					// If no light at side0 and side1 they may be opaque in which case we should ignore any light value from corner
					let x = chunkI * vorld.chunkSize + i, y = chunkJ * vorld.chunkSize + j, z = chunkK * vorld.chunkSize + k;
					if (Vorld.isBlockOpaque(vorld, x + aov[0], y, z + aov[2]) 
						&& Vorld.isBlockOpaque(vorld, x, y + aov[1], z + aov[2])) {
						corner = 0;
					}
				}
				break;
			case Cardinal.Direction.left:
			case Cardinal.Direction.right:
				adj = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k) | 0;
				side0 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k + aov[2]) | 0;
				side1 = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k) | 0;
				corner = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) | 0;
				if (!side0 && !side1 && corner > 0) {
					// If no light at side0 and side1 they may be opaque in which case we should ignore any light value from corner
					let x = chunkI * vorld.chunkSize + i, y = chunkJ * vorld.chunkSize + j, z = chunkK * vorld.chunkSize + k;
					if (Vorld.isBlockOpaque(vorld, x + aov[0], y , z+ aov[2]) 
						&& Vorld.isBlockOpaque(vorld, x + aov[0], y + aov[1], z )) {
						corner = 0;
					}
				}
				break;
		}

		return Math.max(adj, side0, side1, corner);
	}

	let addQuadToMesh = function(mesh, vorld, atlas, block, rotation, direction, i, j, k, chunkI, chunkJ, chunkK, offsetMagnitude) {
		let tile, offset, n = mesh.vertices.length / 3;
		let vertices, normals, textureCoordinates;

		let localDirection = Cardinal.reverseTransformDirection(direction, rotation);

		let blockDef = Vorld.getBlockTypeDefinition(vorld, block);
		tile = getTileIndexFromAtlas(atlas, block, localDirection);

		offset = localDirection * 12;
		vertices = cubeJson.vertices.slice(offset, offset + 12);
		
		let lightBake = [];

		let tileIndices = [ tile, tile, tile, tile ];
		let vector = [];
		for (let index = 0; index < 4; index++) {
			vector[0] = vertices[3*index];
			vector[1] = vertices[3*index + 1];
			vector[2] = vertices[3*index + 2];
			
			Utils.transformPointToVorldSpace(vector, rotation, i, j, k);

			// NOTE: lighting and AO as done with placement direction not normal converted to direction,
			// back faces take the light level from behind them this however has quite a nice effect on
			// leaves / cutout block making them more readable, as if they are catching the light / imples 
			// they aren't flat so am  leaving this here rather than moving the calculation to normals
			tileIndices[index] += calculateAOLevel(vorld, vector, direction, i, j, k, chunkI, chunkJ, chunkK);
			let light = 0;
			if (blockDef && blockDef.light) {
				// Use own light if a light emitting block
				light = blockDef.light;
			} else {
				// else get the adjacent blocks light
				light = calculateLightLevel(vorld, vector, direction, i , j, k, chunkI, chunkJ, chunkK);
			}
			lightBake.push(light / 15);

			if (offsetMagnitude) {
				Cardinal.getVectorFromDirection(offsetVector, direction);
				vector[0] += offsetVector[0] * offsetMagnitude;
				vector[1] += offsetVector[1] * offsetMagnitude;
				vector[2] += offsetVector[2] * offsetMagnitude;
			}

			vertices[3*index] = vector[0];
			vertices[3*index + 1] = vector[1];
			vertices[3*index + 2] = vector[2];
		}
	
		normals = cubeJson.normals.slice(offset, offset + 12);
		if (rotation) {
			for (let index = 0; index < 4; index++) {
				vector[0] = normals[3*index];
				vector[1] = normals[3*index + 1];
				vector[2] = normals[3*index + 2];

				Cardinal.transformVector(vector, rotation);
				Maths.snapVector(vector);

				normals[3*index] = vector[0];
				normals[3*index + 1] = vector[1];
				normals[3*index + 2] = vector[2];
			}
		}
	
		offset = localDirection * 8;
		textureCoordinates = cubeJson.textureCoordinates.slice(offset, offset + 8);

		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, textureCoordinates);
		concat(mesh.tileIndices, tileIndices);
		concat(mesh.lightBake, lightBake);
		mesh.indices.push(n,n+1,n+2, n,n+2,n+3);
	};

	let addCustomBlockMeshToMesh = (mesh, customMesh, vorld, atlas, block, rotation, i, j, k, chunkI, chunkJ, chunkK) => {
		// Rotate and offset vertices
		// For each normal determine direction and create appropriate tile index
		// concat into mesh
		let n = mesh.vertices.length / 3;
		let vertices = [], normals = [], tileIndices = [], indices = [];

		let blockDef = Vorld.getBlockTypeDefinition(vorld, block);
		let lightBake = [];

		let vertex = [], normal = [];
		for (let index = 0, l = customMesh.vertices.length; index < l; index += 3) {
			vertex[0] = customMesh.vertices[index];
			vertex[1] = customMesh.vertices[index + 1];
			vertex[2] = customMesh.vertices[index + 2];
			
			if (rotation) {
				Maths.offsetVector(vertex, -0.5, -0.5, -0.5);
				Cardinal.transformVector(vertex, rotation);
				Maths.offsetVector(vertex, 0.5 + i, 0.5 + j, 0.5 + k);
				Maths.snapVector(vertex);
			} else {
				Maths.offsetVector(vertex, i, j, k);
			}

			vertices[index] = vertex[0];
			vertices[index + 1] = vertex[1];
			vertices[index + 2] = vertex[2];
		}

		for (let index = 0, l = customMesh.normals.length; index < l; index += 3) {
			normal[0] = customMesh.normals[index];
			normal[1] = customMesh.normals[index + 1];
			normal[2] = customMesh.normals[index + 2];

			vertex[0] = vertices[index];
			vertex[1] = vertices[index + 1];
			vertex[2] = vertices[index + 2];

			let direction = Cardinal.getDirectionFromVector(normal);
			let tileIndex = getTileIndexFromAtlas(atlas, block, direction);

			if (rotation) {
				Cardinal.transformVector(normal, rotation);
				Maths.snapVector(normal);
			}

			// Update direction to rotated normal
			direction = Cardinal.getDirectionFromVector(normal);

			// Calculate AO and pack into tileIndex 
			tileIndex += calculateAOLevel(vorld, vertex, direction, i, j, k, chunkI, chunkJ, chunkK);
			tileIndices.push(tileIndex);

			let light = 0;
			if (blockDef && blockDef.light) {
				// Use own light if a light emitting block
				light = blockDef.light;
			} else {
				// else get the adjacent blocks light
				// light = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i + normal[0], j + normal[1], k + normal[2]);
				// NOTE: assumes normal is axis aligned unit vector
				// TODO: Should both this and AOLevel above calculate from transformed normal instead?
				light = calculateLightLevel(vorld, vertex, direction, i , j, k, chunkI, chunkJ, chunkK);
			}
			lightBake.push(light / 15);

			normals[index] = normal[0];
			normals[index + 1] = normal[1];
			normals[index + 2] = normal[2];
		}

		for (let index = 0, l = customMesh.indices.length; index < l; index++) {
			indices.push(customMesh.indices[index] + n);
		}

		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, customMesh.textureCoordinates);
		concat(mesh.tileIndices, tileIndices);
		concat(mesh.lightBake, lightBake);
		concat(mesh.indices, indices);
	};

	let offsetVector = [];
	let getAdjacentCoordinates = (out, direction, i, j, k) => {
		Cardinal.getVectorFromDirection(out, direction);
		out[0] += i;
		out[1] += j;
		out[2] += k;
	};

	exports.createMesh = function(vorld, chunk, atlas, alphaBlockToMesh) {
		// Vorld can be whole set of data or a slice, however adjacent chunks
		// should be provide to avoid unnecessary internal faces.
		if (!chunk) {
			return null;
		}

		var mesh = {
			vertices: [],
			normals: [],
			textureCoordinates: [],
			tileIndices: [],
			lightBake: [],
			indices: [],
			customAttributes: [
				{ name: "tileBuffer", source: "tileIndices", size: 1 },
				{ name: "lightBuffer", source: "lightBake", size: 1 }
			]
		};

		let chunkI = chunk.indices[0],
			chunkJ = chunk.indices[1],
			chunkK = chunk.indices[2];

		let coord = [0, 0, 0];
		
		forEachBlock(chunk, function(block, rotation, i, j, k) {
			// Exists?
			if (!block) { return; }
			if (alphaBlockToMesh && block != alphaBlockToMesh) { return; }

			let meshInternals = !!Vorld.getBlockTypeDefinition(vorld, block).meshInternals;
			let isBlockOpaque = Vorld.isBlockTypeOpaque(vorld, block);
			let isBlockAlpha = Vorld.isBlockTypeAlpha(vorld, block); // Use better time
			if (!alphaBlockToMesh && isBlockAlpha) { return; } // alpha blocks get their own mesh

			// Custom mesh, just put it in!
			let customMesh = Vorld.getBlockTypeMesh(vorld, block);
			if (customMesh) {
				addCustomBlockMeshToMesh(mesh, customMesh, vorld, atlas, block, rotation, i, j, k, chunkI, chunkJ, chunkK);
				return;
			}

			// For Each Direction : Is Edge? Add quad to mesh!
			let adjacentBlock = null;
			let shouldAddQuad = (adjacentBlock) => {
				let isAdjacentBlockOpaque = Vorld.isBlockTypeOpaque(vorld, adjacentBlock);
				return !adjacentBlock 
					|| (isBlockOpaque && !isAdjacentBlockOpaque)
					|| (!isBlockOpaque && !isAdjacentBlockOpaque && (block != adjacentBlock || meshInternals));
			};

			for (let dir = 0; dir < 6; dir++) {
				getAdjacentCoordinates(coord, dir, i, j, k);
				adjacentBlock = Vorld.getBlockByIndex(vorld, coord[0], coord[1], coord[2], chunkI, chunkJ, chunkK);
				if (shouldAddQuad(adjacentBlock)) {
					addQuadToMesh(mesh, vorld, atlas, block, rotation, dir, i, j, k, chunkI, chunkJ, chunkK);
					// Mesh back face for underside of alpha meshes (i.e. water) and meshInternals against air
					if ((meshInternals && block != adjacentBlock) || (dir == Direction.up && alphaBlockToMesh)) {
						// NOTE: This only works for alphaBlockToMesh on one internal interface because when there's only
						// one face it's not a concave mesh, but it would be if we did all internal faces
						// would need next chunks air blocks to generate the interface to keep ordering happy
						addQuadToMesh(mesh, vorld, atlas, block, rotation, Cardinal.invertDirection(dir), coord[0], coord[1], coord[2], chunkI, chunkJ, chunkK, 0.01);
					}
				} else if (meshInternals) {
					// Mesh back face of borders with other blocks if meshInternal is true
					addQuadToMesh(mesh, vorld, atlas, block, rotation, Cardinal.invertDirection(dir), coord[0], coord[1], coord[2], chunkI, chunkJ, chunkK, 0.01);
				}
			}
		});
	
		return mesh;
	};

	return exports;
})();