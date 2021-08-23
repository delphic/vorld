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

				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = aTileIndex;",

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

				"uniform sampler2DArray uSampler;",

				"out vec4 fragColor;",

				"void main(void) {",
					"vec4 color = texture(uSampler, vec3(vTextureCoord, vTileIndex));",

					"fragColor = vec4(vLightWeight * color.rgb, color.a);",
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
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler" ],
				textureUniformNames: [ "uSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.enableAttribute("aTileIndex");
				},
				bindBuffers: function(mesh) {
					this.setAttribute("aVertexPosition", mesh.vertexBuffer);
					this.setAttribute("aTextureCoord", mesh.textureBuffer);
					this.setAttribute("aVertexNormal", mesh.normalBuffer);
					this.setAttribute("aTileIndex", mesh.tileBuffer);
					this.setIndexedAttribute(mesh.indexBuffer);
				}
		};
		return shader;
	};
	return exports;
})();
