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

let Mesher = module.exports = (function(){
	let exports = {};

	let Cardinal = {
		front: 0,
		back: 1,
		top: 2,
		bottom: 3,
		right: 4,
		left: 5
	};

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
		for (i = 0; i < chunk.size; i++) {
			for (j = 0; j < chunk.size; j++) {
				for (k = 0; k < chunk.size; k++) {
					delegate(Chunk.getBlock(chunk, i, j, k), i, j, k); 
				}
			}
		}
	};

	let addQuadToMesh = function(mesh, atlas, block, faceIndex, x, y, z) {
		let tile, offset, n = mesh.vertices.length / 3;
		let vertices, normals, textureCoordinates;
	
		if (faceIndex == Cardinal.top) {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].top;
		} else if (faceIndex == Cardinal.bottom) {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].bottom;
		} else {
			tile = (atlas.textureArraySize - 1) - atlas.blockToTileIndex[block].side;
		}
	
		offset = faceIndex * 12;
		vertices = cubeJson.vertices.slice(offset, offset + 12);

		for (let i = 0; i < 4; i++) {
			vertices[3*i] = vertices[3*i] + x;
			vertices[3*i + 1] = vertices[3*i +1] + y;
			vertices[3*i + 2] = vertices[3*i + 2] + z;
		}
	
		normals = cubeJson.normals.slice(offset, offset + 12);
	
		offset = faceIndex * 8;
		textureCoordinates = cubeJson.textureCoordinates.slice(offset, offset + 8);
	
		tileIndices = [ tile, tile, tile, tile ];
	
		concat(mesh.vertices, vertices);
		concat(mesh.normals, normals);
		concat(mesh.textureCoordinates, textureCoordinates);
		concat(mesh.tileIndices, tileIndices);
		mesh.indices.push(n,n+1,n+2, n,n+2,n+3);
	};

	exports.createMesh = function(vorld, chunk, atlas) {
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
		
		forEachBlock(chunk, function(block, i, j, k) {
			// Exists?
			if (!block) { return; }
	
			// For Each Direction : Is Edge? Add quad to mesh!
			// Front
			if (!Vorld.getBlockByIndex(vorld, i, j, k + 1, chunkI, chunkJ, chunkK)) {
				addQuadToMesh(mesh, atlas, block, Cardinal.front, i, j, k);
			}
			// Back
			if (!Vorld.getBlockByIndex(vorld, i, j, k - 1, chunkI, chunkJ, chunkK)){
				addQuadToMesh(mesh, atlas, block, Cardinal.back, i, j, k);
			}
			// Top
			if (!Vorld.getBlockByIndex(vorld, i, j + 1, k, chunkI, chunkJ, chunkK)){
				addQuadToMesh(mesh, atlas, block, Cardinal.top, i, j, k);
			}
			// Bottom
			if (!Vorld.getBlockByIndex(vorld, i, j - 1, k, chunkI, chunkJ, chunkK)){
				addQuadToMesh(mesh, atlas, block, Cardinal.bottom, i, j, k);
			}
			// Right
			if (!Vorld.getBlockByIndex(vorld, i + 1, j, k, chunkI, chunkJ, chunkK)){
				addQuadToMesh(mesh, atlas, block, Cardinal.right, i, j, k);
			}
			// Left
			if (!Vorld.getBlockByIndex(vorld, i - 1, j, k, chunkI, chunkJ, chunkK)){
				addQuadToMesh(mesh, atlas, block, Cardinal.left, i, j, k);
			}
		});
	
		return mesh;
	};

	return exports;
})();