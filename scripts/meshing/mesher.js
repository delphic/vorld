// Chunk Mesher

// Builds mesh for a chunk in format expected by [Fury](https://github.com/delphic/Fury)
// With the addition of a tileIndicies buffer, for texture array lookup.
// Requires vorld slice with chunk and it's adjacent chunks data, 
// as well as an atlas information for a texture array mapping block id to texture index.

// Data is meshed by adding quads for each visible voxel face to a mesh.
// One mesh per cubic 'chunk' of voxels.
// Uses texture coordinates and an atlas to allow for multiple voxel types in  a single texture.
// Has option of outputing texture coordinates as a tile lookup rather than uv mapping.

const Vorld = require('../world');
const BlockConfig = require('../blockConfig');
const Chunk = require('../chunk');
const Maths = require('../maths');
const Cardinal = require('../cardinal');
const Lighting = require('../lighting');
const Primitives = require('../primitives');
const Utils = require('../utils');
const Direction = Cardinal.Direction;

module.exports = (function(){
	let exports = {};

	// Cube mesh data - faces in order of cardinal directions
	let cubeJson = Primitives.createCuboidMeshJson(0, 1, 0, 1, 0, 1);

	let concat = function(a, b) {
		// GC efficient concat
		for (let i = 0, l = b.length; i < l; i++) {
			a.push(b[i]);
		}
	};
	
	// delegate should be a function taking block, i, j, k
	let forEachBlock = function(chunk, delegate) {
		// TODO: Could just do it over a single index here
		for (let k = 0; k < chunk.size; k++) {
			for (let j = 0; j < chunk.size; j++) {
				for (let i = 0; i < chunk.size; i++) {
					delegate(
						Chunk.getBlock(chunk, i, j, k),
						Chunk.getBlockRotation(chunk, i, j, k),
						i, j, k); 
				}
			}
		}
	};

	let getTileIndexFromAtlas = (atlas, block, direction) => {
		let tileId = 0;
		let map = atlas.blockToTileIndex[block];
		switch (direction) {
			case Direction.up:
				tileId = map.top !== undefined ? map.top : map.side;
				break;
			case Direction.down:
				tileId = map.bottom !== undefined ? map.bottom : map.side;
				break;
			case Direction.forward:
				tileId = map.forward !== undefined ? map.forward : map.side;
				break;
			case Direction.back:
				tileId = map.back !== undefined ? map.back : map.side;
				break;
			case Direction.left:
				tileId = map.left !== undefined ? map.left : map.side;
				break;
			case Direction.right:
				tileId = map.right !== undefined ? map.right : map.side; 
				break;
		}
		return (atlas.textureArraySize - 1) - tileId;
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

	let calculateLightLevel = (vorld, vertex, direction, i, j, k, chunkI, chunkJ, chunkK, getLightDelegate) => {
		// For - non-smooth just return adj block light value
		aov[0] = Math.round(2 * (vertex[0] - i - 0.5));
		aov[1] = Math.round(2 * (vertex[1] - j - 0.5));
		aov[2] = Math.round(2 * (vertex[2] - k - 0.5));
		let adj = 0, side0 = 0, side1 = 0, corner = 0;
		switch(direction)
		{
			case Cardinal.Direction.up:
			case Cardinal.Direction.down:
				adj = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k) || 0;
				side0 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k) || 0;
				side1 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k + aov[2]) || 0;
				corner = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) || 0;
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
				adj = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i, j, k + aov[2]) || 0;
				side0 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k + aov[2]) || 0;
				side1 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i, j + aov[1], k + aov[2]) || 0;
				corner = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) || 0;
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
				adj = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k) || 0;
				side0 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j, k + aov[2]) || 0;
				side1 = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k) || 0;
				corner = getLightDelegate(vorld, chunkI, chunkJ, chunkK, i + aov[0], j + aov[1], k + aov[2]) || 0;
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

		let blockDef = BlockConfig.getBlockTypeDefinition(vorld, block);
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
			let light = 0, sunlight = 0;
			if (blockDef && blockDef.light) {
				// Use own light if a light emitting block
				light = Vorld.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j, k);
				sunlight = Vorld.getBlockSunlightByIndex(vorld, chunkI, chunkJ, chunkK, i, j, k);
			} else {
				// else get the adjacent blocks light
				light = calculateLightLevel(vorld, vector, direction, i , j, k, chunkI, chunkJ, chunkK, Lighting.getBlockLightByIndex);
				sunlight = calculateLightLevel(vorld, vector, direction, i , j, k, chunkI, chunkJ, chunkK, Lighting.getBlockSunlightByIndex);
			}
			lightBake.push(light + (sunlight / 16));
			// We could at this meshing stage determine the orientation of the triangles based on AO first then lighting to remove the diagonal
			// bleeding effect, requires us to duplicate the logic in the shader and won't account for changes in lighting level
			// could prioritise whichever light has the potential to be lower but non-zero, as this is where the bleeding is most obvious

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
	
		if (blockDef.rotateTextureCoords) {
			offset = localDirection * 8;
		} else {
			offset = direction * 8;
		}
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

		let blockDef = BlockConfig.getBlockTypeDefinition(vorld, block);
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

			let light = 0, sunlight = 0;
			if (blockDef && blockDef.light) {
				// Use own light if a light emitting block
				light = Lighting.getBlockLightByIndex(vorld, chunkI, chunkJ, chunkK, i, j, k);
				sunlight = Lighting.getBlockSunlightByIndex(vorld, chunkI, chunkJ, chunkK, i, j, k);
			} else {
				// else get the adjacent blocks light
				// NOTE: assumes normal is axis aligned unit vector
				light = calculateLightLevel(vorld, vertex, direction, i , j, k, chunkI, chunkJ, chunkK, Lighting.getBlockLightByIndex);
				sunlight = calculateLightLevel(vorld, vertex, direction, i , j, k, chunkI, chunkJ, chunkK, Lighting.getBlockSunlightByIndex);
			}
			lightBake.push(light + (sunlight / 16));

			normals[index] = normal[0];
			normals[index + 1] = normal[1];
			normals[index + 2] = normal[2];
		}

		for (let index = 0, l = customMesh.indices.length; index < l; index++) {
			indices.push(customMesh.indices[index] + n);
		}

		let textureCoordinates = customMesh.textureCoordinates;
		if (!blockDef.rotateTextureCoords) {
			textureCoordinates = [];
			for (let index = 0, l = vertices.length; index < l; index += 3) {
				normal[0] = normals[index];
				normal[1] = normals[index + 1];
				normal[2] = normals[index + 2];

				vertex[0] = vertices[index];
				vertex[1] = vertices[index + 1];
				vertex[2] = vertices[index + 2];

				// NOTE assumes normalized AA normals
				if (Maths.approximately(Math.abs(normal[0]), 1, 0.001)) {
					// Use z/y coords
					if (normal[0] < 0) {
						textureCoordinates.push(vertex[2] - k);
					} else {
						textureCoordinates.push(1.0 - (vertex[2] - k));
					}
					textureCoordinates.push(vertex[1] - j);
				} else if (Maths.approximately(Math.abs(normal[1]), 1, 0.001)) {
					// Use x/z coords
					textureCoordinates.push(vertex[0] - i);
					textureCoordinates.push(vertex[2] - k);
				} else {
					// Use x/y coords
					if (normal[2] > 0) {
						textureCoordinates.push(vertex[0] - i);
					} else {
						textureCoordinates.push(1.0 - (vertex[0] - i));
					}
					textureCoordinates.push(vertex[1] - j);
				}
			}
		}

		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, textureCoordinates);
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

	exports.createMesh = function(vorld, chunk, atlas, alphaBlockToMesh, meshCutout, meshUnlit) {
		// Vorld can be whole set of data or a slice, however adjacent chunks
		// should be provided in vorld to avoid unnecessary internal faces.
		if (!chunk) {
			return null;
		}

		// TODO: This could probably be improved by creating the typed array source for the buffers rather than JS native arrays?
		let mesh = {
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

			let blockDefinition = BlockConfig.getBlockTypeDefinition(vorld, block);
			let meshInternals = !!blockDefinition.meshInternals;
			let isBlockOpaque = BlockConfig.isBlockTypeOpaque(vorld, block);
			let isBlockAlpha = BlockConfig.isBlockTypeAlpha(vorld, block);
			let isBlockCutout = blockDefinition.useCutout;
			let isBlockUnlit = blockDefinition.useUnlit;

			// TODO: Generalise this material difference into single parameter - and separate alpha material from current alpha meshing rules
			if ((!meshCutout && isBlockCutout) || (meshCutout && !isBlockCutout)) { return; } // cutout blocks get their own mesh
			if ((!meshUnlit && isBlockUnlit) || (meshUnlit && !isBlockUnlit)) { return; } // unlit blocks get their own mesh
			if (!alphaBlockToMesh && isBlockAlpha) { return; } // alpha blocks get their own mesh

			// Custom mesh, just put it in!
			let customMesh = BlockConfig.getBlockTypeMesh(vorld, block);
			if (customMesh) {
				addCustomBlockMeshToMesh(mesh, customMesh, vorld, atlas, block, rotation, i, j, k, chunkI, chunkJ, chunkK);
				return;
			}

			// For Each Direction : Is Edge? Add quad to mesh!
			let adjacentBlock = null;
			let shouldAddQuad = (adjacentBlock) => {
				let isAdjacentBlockOpaque = BlockConfig.isBlockTypeOpaque(vorld, adjacentBlock);
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