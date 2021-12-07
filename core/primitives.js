module.exports = (function(){
	let exports = {};

	// Cubuid mesh data - faces in order of cardinal directions
	exports.createCuboidMeshJson = (xMin, xMax, yMin, yMax, zMin, zMax) => {
		// Note no UV offset - mapped directly to world position
		return {
			vertices: [
				// forward
				xMin, yMin, zMax,
				xMax, yMin, zMax,
				xMax, yMax, zMax,
				xMin, yMax, zMax,
				// back
				xMin, yMin, zMin,
				xMin, yMax, zMin,
				xMax, yMax, zMin,
				xMax, yMin, zMin,
				// up
				xMin, yMax, zMin,
				xMin, yMax, zMax,
				xMax, yMax, zMax,
				xMax, yMax, zMin,
				// down
				xMin, yMin, zMin,
				xMax, yMin, zMin,
				xMax, yMin, zMax,
				xMin, yMin, zMax,
				// right
				xMax, yMin, zMin,
				xMax, yMax, zMin,
				xMax, yMax, zMax,
				xMax, yMin, zMax,
				// left
				xMin, yMin, zMin,
				xMin, yMin, zMax,
				xMin, yMax, zMax,
				xMin, yMax, zMin ],
			normals: [
				// forward
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				0.0, 0.0, 1.0,
				// back
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				0.0, 0.0, -1.0,
				// up
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				0.0, 1.0, 0.0,
				// down
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				0.0, -1.0, 0.0,
				// right
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0, 0.0,
				// left
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0,
				-1.0, 0.0, 0.0],
			textureCoordinates: [
				// forward
				xMin, yMin,
				xMax, yMin,
				xMax, yMax,
				xMin, yMax,
				// back
				xMax, yMin,
				xMax, yMax,
				xMin, yMax,
				xMin, yMin,
				// up
				xMin, zMin,
				xMin, zMax,
				xMax, zMax,
				xMax, zMin,
				// down
				xMax, zMin,
				xMin, zMin,
				xMin, zMax,
				xMax, zMax,
				// right
				zMax, yMin,
				zMax, yMax,
				zMin, yMax,
				zMin, yMin,
				// left
				zMin, yMin,
				zMax, yMin,
				zMax, yMax,
				zMin, yMax ],
			indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23 ]
		};
	};

	// Creates a (0,0) -> (1,1) Quad that is either x/y, x/z or z/y, with value of the axis to 'lock' provided
	exports.createQuadMeshJson = (axis, value, normal) => {
		let json =  null;
		if (axis == 0) {
			json = {
				vertices: [
					value, 0.0, 0.0,
					value, 0.0, 1.0,
					value, 1.0, 1.0,
					value, 1.0, 0.0 ],
				normals: [
					normal, 0.0, 0.0, 
					normal, 0.0, 0.0,
					normal, 0.0, 0.0,
					normal, 0.0, 0.0 ],
				textureCoordinates: [
					0.0, 0.0,
					1.0, 0.0,
					1.0, 1.0,
					0.0, 1.0 ]
			};
		} else if (axis == 2) {
			json = {
				vertices: [
					0.0, 0.0, value,
					1.0, 0.0, value,
					1.0, 1.0, value,
					0.0, 1.0, value ],
				normals: [
					0.0, 0.0, normal, 
					0.0, 0.0, normal,
					0.0, 0.0, normal,
					0.0, 0.0, normal ],
				textureCoordinates: [
					0.0, 0.0,
					1.0, 0.0,
					1.0, 1.0,
					0.0, 1.0 ]
			};
		} else {
			json = {
				vertices: [
					0.0, value, 0.0,
					1.0, value, 0.0,
					1.0, value, 1.0,
					0.0, value, 1.0 ],
				normals: [
					0.0, normal, 0.0, 
					0.0, normal, 0.0,
					0.0, normal, 0.0,
					0.0, normal, 0.0 ],
				textureCoordinates: [
					0.0, 0.0,
					1.0, 0.0,
					1.0, 1.0,
					0.0, 1.0 ]
			};
		}
		
		if (normal > 0) {
			json.indices = [ 0, 1, 2, 0, 2, 3 ];
		} else {
			json.indices = [ 0, 2, 1, 0, 3, 2 ];
		}
		return json;
	};

	return exports;
})();