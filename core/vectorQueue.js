let VectorQueue = module.exports = (function(){
	let exports = {};

	exports.create = () => {
		let queue = {};
		queue.length = 0;

		let index = 0;
		let vectors = [];
		let keys = {};
		queue.push = (x, y, z) => {
			let targetIndex = index + queue.length;
			let key = x + "_" + y + "_" + z;
			if (!keys[key]) {
				if (vectors.length <= targetIndex) {
					vectors.push([x, y, z]);
				} else {
					vectors[targetIndex][0] = x;
					vectors[targetIndex][1] = y;
					vectors[targetIndex][2] = z;
				}
				keys[key] = true;
				queue.length += 1;
			}
		};
		queue.pushVector = (vec) =>{
			queue.push(vec[0], vec[1], vec[2]);
		};
		queue.peek = () => {
			return vectors[index];
		};
		queue.pop = () => {
			let vector = vectors[index];
			index += 1;
			queue.length -= 1;
			keys[vector[0] + "_" + vector[1] + "_" + vector[2]] = false;
			return vector;
		};
		queue.reset = () => {
			index = 0;
			queue.length = 0;
			keys = {};
		};

		return queue;
	};

	return exports;
})();