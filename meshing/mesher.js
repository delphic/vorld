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

	let addQuadToMesh = function(mesh, atlas, block, rotation, direction, x, y, z) {
		let tile, offset, n = mesh.vertices.length / 3;
		let vertices, normals, textureCoordinates;

		let localDirection = Cardinal.reverseTransformDirection(direction, rotation);

		tile = getTileIndexFromAtlas(atlas, block, localDirection);

		offset = localDirection * 12;
		vertices = cubeJson.vertices.slice(offset, offset + 12);

		let vector = [];
		for (let i = 0; i < 4; i++) {
			vector[0] = vertices[3*i];
			vector[1] = vertices[3*i + 1];
			vector[2] = vertices[3*i + 2];
			
			Utils.transformPointToVorldSpace(vector, rotation, x, y, z);

			vertices[3*i] = vector[0];
			vertices[3*i + 1] = vector[1];
			vertices[3*i + 2] = vector[2];
		}
	
		normals = cubeJson.normals.slice(offset, offset + 12);
		if (rotation) {
			for (let i = 0; i < 4; i++) {
				vector[0] = normals[3*i];
				vector[1] = normals[3*i + 1];
				vector[2] = normals[3*i + 2];

				Cardinal.transformVector(vector, rotation);
				Maths.snapVector(vector);

				normals[3*i] = vector[0];
				normals[3*i + 1] = vector[1];
				normals[3*i + 2] = vector[2];
			}
		}
	
		offset = localDirection * 8;
		textureCoordinates = cubeJson.textureCoordinates.slice(offset, offset + 8);

		let tileIndices = [ tile, tile, tile, tile ];
	
		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, textureCoordinates);
		concat(mesh.tileIndices, tileIndices);
		mesh.indices.push(n,n+1,n+2, n,n+2,n+3);
	};

	let addCustomBlockMeshToMesh = (mesh, customMesh, atlas, block, rotation, x, y, z) => {

		// Rotate and offset vertices
		// For each normal determine direction and create appropriate tile index
		// concat into mesh
		let n = mesh.vertices.length / 3;
		let vertices = [], normals = [], tileIndices = [], indices = [];
		
		let vector = [];
		for (let i = 0, l = customMesh.vertices.length; i < l; i += 3) {
			vector[0] = customMesh.vertices[i];
			vector[1] = customMesh.vertices[i + 1];
			vector[2] = customMesh.vertices[i + 2];
			
			if (rotation) {
				Maths.offsetVector(vector, -0.5, -0.5, -0.5);
				Cardinal.transformVector(vector, rotation);
				Maths.offsetVector(vector, 0.5 + x, 0.5 + y, 0.5 + z);
				Maths.snapVector(vector);
			} else {
				Maths.offsetVector(vector, x, y, z);
			}

			vertices[i] = vector[0];
			vertices[i + 1] = vector[1];
			vertices[i + 2] = vector[2];
		}

		for (let i = 0, l = customMesh.normals.length; i < l; i += 3) {
			vector[0] = customMesh.normals[i];
			vector[1] = customMesh.normals[i + 1];
			vector[2] = customMesh.normals[i + 2];

			let direction = Cardinal.getDirectionFromVector(vector);
			let tileIndex = getTileIndexFromAtlas(atlas, block, direction);
			tileIndices.push(tileIndex);

			if (rotation) {
				Cardinal.transformVector(vector, rotation);
				Maths.snapVector(vector);
			}

			normals[i] = vector[0];
			normals[i + 1] = vector[1];
			normals[i + 2] = vector[2];
		}

		for (let i = 0, l = customMesh.indices.length; i < l; i++) {
			indices.push(customMesh.indices[i] + n);
		}

		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, customMesh.textureCoordinates);
		concat(mesh.tileIndices, tileIndices);
		concat(mesh.indices, indices);
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
			indices: []
		};

		let chunkI = chunk.indices[0],
			chunkJ = chunk.indices[1],
			chunkK = chunk.indices[2];
		
		forEachBlock(chunk, function(block, rotation, i, j, k) {
			// Exists?
			if (!block) { return; }
			if (alphaBlockToMesh && block != alphaBlockToMesh) { return; }

			let isBlockOpaque = Vorld.isBlockTypeOpaque(vorld, block);
			let isBlockAlpha = Vorld.isBlockTypeAlpha(vorld, block); // Use better time
			if (!alphaBlockToMesh && isBlockAlpha) { return; } // alpha blocks get their own mesh

			// Custom mesh, just put it in!
			let customMesh = Vorld.getBlockTypeMesh(vorld, block);
			if (customMesh) {
				addCustomBlockMeshToMesh(mesh, customMesh, atlas, block, rotation, i, j, k);
				return;
			}

			// For Each Direction : Is Edge? Add quad to mesh!
			let adjacentBlock = null;
			let shouldAddQuad = (adjacentBlock) => {
				let isAdjacentBlockOpaque = Vorld.isBlockTypeOpaque(vorld, adjacentBlock);
				return !adjacentBlock 
					|| (isBlockOpaque && !isAdjacentBlockOpaque)
					|| (!isBlockOpaque && !isAdjacentBlockOpaque && block != adjacentBlock);
			};

			// Front
			adjacentBlock = Vorld.getBlockByIndex(vorld, i, j, k + 1, chunkI, chunkJ, chunkK);
			if (shouldAddQuad(adjacentBlock)) {
				addQuadToMesh(mesh, atlas, block, rotation, Direction.forward, i, j, k);
			}
			// Back
			adjacentBlock = Vorld.getBlockByIndex(vorld, i, j, k - 1, chunkI, chunkJ, chunkK);
			if (shouldAddQuad(adjacentBlock)){
				addQuadToMesh(mesh, atlas, block, rotation, Direction.back, i, j, k);
			}
			// Top
			adjacentBlock = Vorld.getBlockByIndex(vorld, i, j + 1, k, chunkI, chunkJ, chunkK);
			if (shouldAddQuad(adjacentBlock)){
				addQuadToMesh(mesh, atlas, block, rotation, Direction.up, i, j, k);
				if (alphaBlockToMesh) {
					// NOTE: This only works on one internal interface because when there's only
					// one face it's not a concave mesh, but it would be if we did all internal faces
					// would need next chunks air blocks to generate the interface to keep ordering happy
					addQuadToMesh(mesh, atlas, block, rotation, Direction.down, i, j + 1, k);
				}
			}
			// Bottom
			adjacentBlock = Vorld.getBlockByIndex(vorld, i, j - 1, k, chunkI, chunkJ, chunkK);
			if (shouldAddQuad(adjacentBlock)){
				addQuadToMesh(mesh, atlas, block, rotation, Direction.down, i, j, k);
			}
			// Right
			adjacentBlock = Vorld.getBlockByIndex(vorld, i + 1, j, k, chunkI, chunkJ, chunkK)
			if (shouldAddQuad(adjacentBlock)){
				addQuadToMesh(mesh, atlas, block, rotation, Direction.right, i, j, k);
			}
			// Left
			adjacentBlock = Vorld.getBlockByIndex(vorld, i - 1, j, k, chunkI, chunkJ, chunkK);
			if (shouldAddQuad(adjacentBlock)){
				addQuadToMesh(mesh, atlas, block, rotation, Direction.left, i, j, k);
			}
		});
	
		return mesh;
	};

	return exports;
})();