let VoxelShader = module.exports = (function() {
	let exports = {};

	let shaderSource = {
		vs: function() {
			return [
				"#version 300 es",
				"in vec3 aVertexPosition;",
				"in vec2 aTextureCoord;",
				"in vec3 aVertexNormal;",
				"in float aTileIndex;",

				"uniform mat4 uMVMatrix;",
				"uniform mat4 uPMatrix;",

				"out vec3 vViewSpacePosition;",

				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = aTileIndex;",

					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",

					"vLightWeight = 0.5 + 0.5 * max(dot(aVertexNormal, normalize(vec3(-1.0, 2.0, 1.0))), 0.0);",
				"}"].join('\n');
		},
		fs: function() {
			return [
				"#version 300 es",
				"precision highp float;",
				"precision highp sampler2DArray;",

				"in vec2 vTextureCoord;",
				"in vec3 vNormal;",
				"in float vLightWeight;",
				"in float vTileIndex;",

				"in vec3 vViewSpacePosition;",

				"uniform sampler2DArray uSampler;",
				"uniform vec3 uFogColor;",
				"uniform float uFogDensity;",

				"out vec4 fragColor;",

				"void main(void) {",
					"vec4 color = texture(uSampler, vec3(vTextureCoord, vTileIndex));",

					"#define LOG2 1.442695",
					"float fragDistance = length(vViewSpacePosition);",
					"float fogAmount = 1.0 - exp2( - uFogDensity * uFogDensity * fragDistance * fragDistance * LOG2);",
					"fogAmount = clamp(fogAmount, 0.0, 1.0);",

					"fragColor =  mix(vec4(vLightWeight * color.rgb, color.a), vec4(uFogColor, 1.0), fogAmount);",
				"}"].join('\n');
			}
	};

	exports.create = function() {
		let vsSource = shaderSource.vs();
		let fsSource = shaderSource.fs();

		let shader = {
			vsSource: vsSource,
			fsSource: fsSource,
				attributeNames: [ "aVertexPosition", "aVertexNormal", "aTextureCoord", "aTileIndex" ],
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler", "uFogColor", "uFogDensity" ],
				textureUniformNames: [ "uSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.enableAttribute("aTileIndex");
					this.setUniformFloat3("uFogColor", material.fogColor[0], material.fogColor[1], material.fogColor[2]);
					this.setUniformFloat("uFogDensity", material.fogDensity);
				},
				bindBuffers: function(mesh) {
					this.setAttribute("aVertexPosition", mesh.vertexBuffer);
					this.setAttribute("aTextureCoord", mesh.textureBuffer);
					this.setAttribute("aVertexNormal", mesh.normalBuffer);
					this.setAttribute("aTileIndex", mesh.tileBuffer);
					this.setIndexedAttribute(mesh.indexBuffer);
				},
				validateMaterial: function(material) {
					if (!material.fogColor) {
						console.error("No fogColor property specified on material using Voxel shader");
					} else if (material.fogColor.length < 3) {
						console.error("fogColor property on material using Voxel shader must be a vec3");
					}
					if (material.fogDensity === undefined) {
						console.error("No fogDensity poperty specified on material using Voxel shader");
					}
				}
		};
		return shader;
	};
	return exports;
})();
