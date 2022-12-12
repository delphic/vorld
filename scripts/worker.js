const MeshingWorker = require('./meshing/worker');
const LightingWorker = require('./lighting/worker');
const TerrianWorker = require('./generation/worker');

onmessage = function(e) {
	let data = e.data;
	switch (data.jobType) {
		case "terrain":
			TerrianWorker.execute(data, this.postMessage);
			break;
		case "lighting":
			LightingWorker.execute(data, this.postMessage);
			break;
		case "meshing": 
			MeshingWorker.execute(data, this.postMessage);
			break;
		default:
			console.warn("Unsupported job type " + data.jobType);
			postMessage({ id: data.id, complete: true, duration: 0 });
			break;
	}
};