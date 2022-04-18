// Vector Queue
module.exports = (function(){
	let exports = {};

	// Could remove the need for a string key if on initialising the queue
	// we set a maximum search distance, we can then make first values - maximum 
	// search distance our origin, put positions into this coordinate space (all positive)
	// and generate key as x + z * 2 * search distance + y * (2 * search distance) ^ 2
	// would want to test performance, building the string is probably faster but allocates garbage

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
			queue.length -= 1;
			//index += 1;
			//keys[vector[0] + "_" + vector[1] + "_" + vector[2]] = false;
			
			// This is probably slower, especially with the delete
			// however we're getting out of memory exceptions sometimes...
			vectors.splice(0, 1);
			delete keys[vector[0] + "_" + vector[1] + "_" + vector[2]];
			
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