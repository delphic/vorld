module.exports = (function(){
	let exports = {};

	let Name = exports.Name = {
		Gaussian: "gaussian",
		NegativeY: "negative_y",
		InverseY: "inverse_y",
		Expression: "expression",
	};

	let createGaussian = (config) => {
		let a = config.amplitude, sdx = config.sdx, sdz = config.sdz, x0 = 0, z0 = 0;
		return function(x, y, z) {
			let fxy = a * Math.exp(-((((x - x0) * (x - x0)) / (2 * sdx * sdx)) + (((z -z0) * (z - z0)) / (2 * sdz * sdz))));
			return Math.max(0, 1 + (fxy - y) / config.denominator);
		};
	};

	exports.create = function(config) {
		if (config) {
			switch (config.name) {
				case Name.Gaussian:
					return createGaussian(config);
				case Name.NegativeY:
					return (x, y, z) => (config.yOffset - y) / config.yDenominator;
				case Name.InverseY:
					return (x, y, z) => config.numerator / (y + config.yOffset);
				case Name.Expression:
					return eval(config.expression);
				default:
					return (x, y, z) => 0;
			}
		}
		return (x, y, z) => 0;
	};

	return exports;
})();