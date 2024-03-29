// Voxel Shader
// includes fog, per vertex lighting and AO, optional alpha treshold discard (cutout)

module.exports = (function() {
	let exports = {};

	let concat = (a, b) => {
		for (let i = 0, l = b.length; i < l; i++) {
			a.push(b[i]);
		}
	};

	let toFloatString = (a) => {
		let str = a.toString();
		if (str.indexOf('.') == -1) {
			str += ".0";
		}
		return str;
	};

	let unlitSource = {
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
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = floor(aTileIndex);",

					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",
				"}"].join('\n');
		},
		fs: function() {
			return [
				"#version 300 es",
				"precision highp float;",
				"precision highp sampler2DArray;",

				"in vec2 vTextureCoord;",
				"in vec3 vNormal;",
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

					"fragColor =  mix(vec4(color.rgb, color.a), vec4(uFogColor, 1.0), fogAmount);",
				"}"].join('\n');
		}
	};

	let shaderSource = {
		vs: function() {
			return [
				"#version 300 es",
				"in vec3 aVertexPosition;",
				"in vec2 aTextureCoord;",
				"in vec3 aVertexNormal;",
				"in float aTileIndex;",
				"in float aLightLevel;",

				"uniform mat4 uMVMatrix;",
				"uniform mat4 uPMatrix;",

				"uniform float uAmbientLightMagnitude;",
				"uniform float uDirectionalLightMagnitude;",

				"out vec3 vViewSpacePosition;",

				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = floor(aTileIndex);",

					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",

					// max of torch light and sunlight
					"float light = max(floor(aLightLevel) / 16.0, uDirectionalLightMagnitude * fract(aLightLevel));",
					// Will need to blend these to allow for sunlight colour
					// NOTE: sun light (DirectionalLight) in no longer in fact directional in the shader

					"float aoFactor = 1.0 - 0.25 * 1.333333 * fract(aTileIndex);", // 4/3 converts from 0 -> 0.75 to 0 -> 1, 0.5 reduces the impact
					// "float halfLambert = (uAmbientLightMagnitude + uDirectionalLightMagnitude * max(dot(aVertexNormal, normalize(vec3(-1.0, 2.0, 1.0))), 0.0));",

					"vLightWeight = (light + uAmbientLightMagnitude) * aoFactor;",
				"}"].join('\n');
		},
		fs: function(cutoutThreshold) {
			let shaderArray = [
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

					// Could argue that the mix should be uFogColor, 1.0 rather than color.a for normal alpha but that messes with cutout shaders
					"fragColor =  mix(vec4(vLightWeight * color.rgb, color.a), vec4(uFogColor, color.a), fogAmount);"
			];
			if (cutoutThreshold) {
				// Cutout shader - note putting the if at the end has minimal disruption to the predicted path of the shader
				concat(shaderArray, [ "if (fragColor.a < " + toFloatString(cutoutThreshold) + ") {",
					"discard;",
				"}" ]);
			}
			shaderArray.push("}")
			return shaderArray.join('\n');
		}
	};

	let emissiveSource = {
		vs: function() {
			return [
				"#version 300 es",
				"in vec3 aVertexPosition;",
				"in vec2 aTextureCoord;",
				"in vec3 aVertexNormal;",
				"in float aTileIndex;",
				"in float aLightLevel;",

				"uniform mat4 uMVMatrix;",
				"uniform mat4 uPMatrix;",

				"uniform float uAmbientLightMagnitude;",
				"uniform float uDirectionalLightMagnitude;",

				"out vec3 vViewSpacePosition;",

				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = floor(aTileIndex);",

					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",

					// max of torch light and sunlight
					"float light = max(floor(aLightLevel) / 16.0, uDirectionalLightMagnitude * fract(aLightLevel));",
					// Will need to blend these to allow for sunlight colour
					// NOTE: sun light (DirectionalLight) in no longer in fact directional in the shader

					"float aoFactor = 1.0 - 0.25 * 1.333333 * fract(aTileIndex);", // 4/3 converts from 0 -> 0.75 to 0 -> 1, 0.5 reduces the impact
					// "float halfLambert = (uAmbientLightMagnitude + uDirectionalLightMagnitude * max(dot(aVertexNormal, normalize(vec3(-1.0, 2.0, 1.0))), 0.0));",

					"vLightWeight = (light + uAmbientLightMagnitude) * aoFactor;",
				"}"].join('\n');
		},
		fs: function(cutoutThreshold) {
			let shaderArray = [
				"#version 300 es",
				"precision highp float;",
				"precision highp sampler2DArray;",

				"in vec2 vTextureCoord;",
				"in vec3 vNormal;",
				"in float vLightWeight;",
				"in float vTileIndex;",

				"in vec3 vViewSpacePosition;",

				"uniform sampler2DArray uSampler;",
				"uniform sampler2DArray uEmissiveSampler;",
				"uniform vec3 uFogColor;",
				"uniform float uFogDensity;",

				"out vec4 fragColor;",

				"void main(void) {",
					"float emissive = texture(uEmissiveSampler, vec3(vTextureCoord, vTileIndex)).a;",
					"vec4 color = texture(uSampler, vec3(vTextureCoord, vTileIndex));",

					"#define LOG2 1.442695",
					"float fragDistance = length(vViewSpacePosition);",
					"float fogAmount = 1.0 - exp2( - (1.0 - emissive) * uFogDensity * uFogDensity * fragDistance * fragDistance * LOG2);",
					"fogAmount = clamp(fogAmount, 0.0, 1.0);",

					// Could argue that the mix should be uFogColor, 1.0 rather than color.a for normal alpha but that messes with cutout shaders
					"fragColor =  mix(vec4(max(vLightWeight, emissive) * color.rgb, color.a), vec4(uFogColor, color.a), fogAmount);"
			];
			if (cutoutThreshold) {
				// Cutout shader - note putting the if at the end has minimal disruption to the predicted path of the shader
				concat(shaderArray, [ "if (fragColor.a < " + toFloatString(cutoutThreshold) + ") {",
					"discard;",
				"}" ]);
			}
			shaderArray.push("}")
			return shaderArray.join('\n');
		}
	};

	let dynamicSource = {
		// Shader for lit dynamic objects still using texture array
		// Replaces aLightLevel with uLightLevel + uSunlightLevel
		// which is currently set for the whole mesh based on probe location
		// clearly not suitable for large objects
		vs: function() {
			return [
				"#version 300 es",
				"in vec3 aVertexPosition;",
				"in vec2 aTextureCoord;",
				"in vec3 aVertexNormal;",
				"in float aTileIndex;",

				"uniform mat4 uMVMatrix;",
				"uniform mat4 uPMatrix;",

				"uniform float uAmbientLightMagnitude;",
				"uniform float uDirectionalLightMagnitude;",
				"uniform float uLightLevel;",
				"uniform float uSunlightLevel;",

				"out vec3 vViewSpacePosition;",

				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",
				"out float vTileIndex;",

				"void main(void) {",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
					"vNormal = aVertexNormal;",
					"vTileIndex = floor(aTileIndex);",

					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",

					// max of torch light and sunlight
					"float light = max(uLightLevel / 16.0, uDirectionalLightMagnitude * uSunlightLevel / 16.0);",
					// Will need to blend these to allow for sunlight colour
					// NOTE: sun light (DirectionalLight) in no longer in fact directional in the shader

					"float aoFactor = 1.0 - 0.25 * 1.333333 * fract(aTileIndex);", // 4/3 converts from 0 -> 0.75 to 0 -> 1, 0.5 reduces the impact

					"vLightWeight = (light + uAmbientLightMagnitude) * aoFactor;",
				"}"].join('\n');
		},
		fs: function(cutoutThreshold) {
			let shaderArray = [
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

					// Could argue that the mix should be uFogColor, 1.0 rather than color.a for normal alpha but that messes with cutout shaders
					"fragColor =  mix(vec4(vLightWeight * color.rgb, color.a), vec4(uFogColor, color.a), fogAmount);"
			];
			if (cutoutThreshold) {
				// Cutout shader - note putting the if at the end has minimal disruption to the predicted path of the shader
				concat(shaderArray, [ "if (fragColor.a < " + toFloatString(cutoutThreshold) + ") {",
					"discard;",
				"}" ]);
			}
			shaderArray.push("}")
			return shaderArray.join('\n');
		}
	};

	let dynamicTexturedSource = {
		// Uses the dynamic voxel lighting / fog with simple textured (i.e. for models)
		// combination of dynamic source and fury TexturedUnlit - converted to 300 es
		// Note no vertex baked AO (as no tile index), same limitations as dynamic shader (i.e. there will be uniform lighting across the model)
		vs: function() { 
			return [
				"#version 300 es",

				"in vec3 aVertexPosition;",
				"in vec2 aTextureCoord;",
				"in vec3 aVertexNormal;",
		
				"uniform mat4 uMVMatrix;",
				"uniform mat4 uPMatrix;",

				"uniform float uAmbientLightMagnitude;",
				"uniform float uDirectionalLightMagnitude;",
				"uniform float uLightLevel;",
				"uniform float uSunlightLevel;",
		
				"out vec3 vViewSpacePosition;",
				"out vec2 vTextureCoord;",
				"out vec3 vNormal;",
				"out float vLightWeight;",

				"void main(void) {",
					"vNormal = aVertexNormal;",
					"vViewSpacePosition = (uMVMatrix * vec4(aVertexPosition, 1.0)).xyz;",

					// max of torch light and sunlight
					"float light = max(uLightLevel / 16.0, uDirectionalLightMagnitude * uSunlightLevel / 16.0);",
					// Will need to blend these to allow for sunlight colour
					// NOTE: sun light (DirectionalLight) in no longer in fact directional in the shader

					"vLightWeight = (light + uAmbientLightMagnitude);",
					"gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
					"vTextureCoord = aTextureCoord;",
				"}"
			].join('\n');
		},
		fs:  function(cutoutThreshold) {
			let shaderArray = [
				"#version 300 es",
				"precision highp float;",
				"precision highp sampler2D;",

				"in vec2 vTextureCoord;",
				"in vec3 vNormal;",
				"in float vLightWeight;",
				"in float vTileIndex;",

				"in vec3 vViewSpacePosition;",

				"uniform sampler2D uSampler;",
				"uniform vec4 uColor;",
				"uniform vec3 uFogColor;",
				"uniform float uFogDensity;",

				"out vec4 fragColor;",
		
				"void main(void) {",
					"vec4 color = texture(uSampler, vTextureCoord) * uColor;",

					"#define LOG2 1.442695",
					"float fragDistance = length(vViewSpacePosition);",
					"float fogAmount = 1.0 - exp2( - uFogDensity * uFogDensity * fragDistance * fragDistance * LOG2);",
					"fogAmount = clamp(fogAmount, 0.0, 1.0);",

					// Could argue that the mix should be uFogColor, 1.0 rather than color.a for normal alpha but that messes with cutout shaders
					"fragColor =  mix(vec4(vLightWeight * color.rgb, color.a), vec4(uFogColor, color.a), fogAmount);"
			];
			if (cutoutThreshold) {
				// Cutout shader - note putting the if at the end has minimal disruption to the predicted path of the shader
				concat(shaderArray, [ "if (fragColor.a < " + toFloatString(cutoutThreshold) + ") {",
					"discard;",
				"}" ]);
			}
			shaderArray.push("}")
			return shaderArray.join('\n');
		}
	};

	exports.createUnlit = function() {
		let vsSource = unlitSource.vs();
		let fsSource = unlitSource.fs();

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

	exports.create = function(cutoutThreshold) {
		let vsSource = shaderSource.vs();
		let fsSource = shaderSource.fs(cutoutThreshold);

		let shader = {
			vsSource: vsSource,
			fsSource: fsSource,
				attributeNames: [ "aVertexPosition", "aVertexNormal", "aTextureCoord", "aTileIndex", "aLightLevel" ],
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler", "uFogColor", "uFogDensity", "uAmbientLightMagnitude", "uDirectionalLightMagnitude" ],
				textureUniformNames: [ "uSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.enableAttribute("aTileIndex");
					this.enableAttribute("aLightLevel");
					this.setUniformFloat("uAmbientLightMagnitude", material.ambientMagnitude);
					this.setUniformFloat("uDirectionalLightMagnitude", material.directionalMagnitude)
					this.setUniformFloat3("uFogColor", material.fogColor[0], material.fogColor[1], material.fogColor[2]);
					this.setUniformFloat("uFogDensity", material.fogDensity);
				},
				bindBuffers: function(mesh) {
					this.setAttribute("aVertexPosition", mesh.vertexBuffer);
					this.setAttribute("aTextureCoord", mesh.textureBuffer);
					this.setAttribute("aVertexNormal", mesh.normalBuffer);
					this.setAttribute("aTileIndex", mesh.tileBuffer);
					this.setAttribute("aLightLevel", mesh.lightBuffer);
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
					if (material.ambientMagnitude === undefined) {
						console.warn("No ambientMangitude property specified on material using Voxel shader, setting to 0.5");
						material.ambientMagnitude = 0.5;
					}
					if (material.directionalMagnitude === undefined) {
						console.warn("No directionalMagnitude property specified on material using Voxel shader, setting to 0.5");
						material.directionalMagnitude = 0.5;
					}
				}
		};
		return shader;
	};

	exports.createEmissive = function(cutoutThreshold) {
		let vsSource = emissiveSource.vs();
		let fsSource = emissiveSource.fs(cutoutThreshold);

		let shader = {
			vsSource: vsSource,
			fsSource: fsSource,
				attributeNames: [ "aVertexPosition", "aVertexNormal", "aTextureCoord", "aTileIndex", "aLightLevel" ],
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler", "uEmissiveSampler", "uFogColor", "uFogDensity", "uAmbientLightMagnitude", "uDirectionalLightMagnitude" ],
				textureUniformNames: [ "uSampler", "uEmissiveSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.enableAttribute("aTileIndex");
					this.enableAttribute("aLightLevel");
					this.setUniformFloat("uAmbientLightMagnitude", material.ambientMagnitude);
					this.setUniformFloat("uDirectionalLightMagnitude", material.directionalMagnitude)
					this.setUniformFloat3("uFogColor", material.fogColor[0], material.fogColor[1], material.fogColor[2]);
					this.setUniformFloat("uFogDensity", material.fogDensity);
				},
				bindBuffers: function(mesh) {
					this.setAttribute("aVertexPosition", mesh.vertexBuffer);
					this.setAttribute("aTextureCoord", mesh.textureBuffer);
					this.setAttribute("aVertexNormal", mesh.normalBuffer);
					this.setAttribute("aTileIndex", mesh.tileBuffer);
					this.setAttribute("aLightLevel", mesh.lightBuffer);
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
					if (material.ambientMagnitude === undefined) {
						console.warn("No ambientMangitude property specified on material using Voxel shader, setting to 0.5");
						material.ambientMagnitude = 0.5;
					}
					if (material.directionalMagnitude === undefined) {
						console.warn("No directionalMagnitude property specified on material using Voxel shader, setting to 0.5");
						material.directionalMagnitude = 0.5;
					}
				}
		};
		return shader;
	};

	exports.createDynamic = function(cutoutThreshold) {
		let vsSource = dynamicSource.vs();
		let fsSource = dynamicSource.fs(cutoutThreshold);

		let shader = {
			vsSource: vsSource,
			fsSource: fsSource,
				attributeNames: [ "aVertexPosition", "aVertexNormal", "aTextureCoord", "aTileIndex"  ],
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler", "uFogColor", "uFogDensity", "uAmbientLightMagnitude", "uDirectionalLightMagnitude", "uLightLevel", "uSunlightLevel" ],
				textureUniformNames: [ "uSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindInstance: function(instance) {
					this.setUniformFloat("uLightLevel", instance.lightLevel || 0);
					this.setUniformFloat("uSunlightLevel", instance.sunlightLevel || 0);
				},
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.enableAttribute("aTileIndex");
					this.setUniformFloat("uAmbientLightMagnitude", material.ambientMagnitude);
					this.setUniformFloat("uDirectionalLightMagnitude", material.directionalMagnitude);
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
					if (material.ambientMagnitude === undefined) {
						console.warn("No ambientMangitude property specified on material using Voxel shader, setting to 0.5");
						material.ambientMagnitude = 0.5;
					}
					if (material.directionalMagnitude === undefined) {
						console.warn("No directionalMagnitude property specified on material using Voxel shader, setting to 0.5");
						material.directionalMagnitude = 0.5;
					}
				}
		};
		return shader;
	};

	exports.createDynamicTextured =  function(cutoutThreshold) {
		let vsSource = dynamicTexturedSource.vs();
		let fsSource = dynamicTexturedSource.fs(cutoutThreshold);

		let shader = {
			vsSource: vsSource,
			fsSource: fsSource,
				attributeNames: [ "aVertexPosition", "aVertexNormal", "aTextureCoord" ],
				uniformNames: [ "uMVMatrix", "uPMatrix", "uSampler", "uFogColor", "uFogDensity", "uAmbientLightMagnitude", "uDirectionalLightMagnitude", "uLightLevel", "uSunlightLevel", "uColor" ],
				textureUniformNames: [ "uSampler" ],
				pMatrixUniformName: "uPMatrix",
				mvMatrixUniformName: "uMVMatrix",
				bindInstance: function(instance) {
					this.setUniformFloat("uLightLevel", instance.lightLevel || 0);
					this.setUniformFloat("uSunlightLevel", instance.sunlightLevel || 0);
				},
				bindMaterial: function(material) {
					this.enableAttribute("aVertexPosition");
					this.enableAttribute("aTextureCoord");
					this.enableAttribute("aVertexNormal");
					this.setUniformFloat("uAmbientLightMagnitude", material.ambientMagnitude);
					this.setUniformFloat("uDirectionalLightMagnitude", material.directionalMagnitude);
					this.setUniformFloat3("uFogColor", material.fogColor[0], material.fogColor[1], material.fogColor[2]);
					this.setUniformFloat("uFogDensity", material.fogDensity);
					if (material.color) {
						this.setUniformVector4("uColor", material.color);
					} else {
						this.setUniformFloat4("uColor", 1.0, 1.0, 1.0, 1.0);
					}
				},
				bindBuffers: function(mesh) {
					this.setAttribute("aVertexPosition", mesh.vertexBuffer);
					this.setAttribute("aTextureCoord", mesh.textureBuffer);
					this.setAttribute("aVertexNormal", mesh.normalBuffer);
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
					if (material.ambientMagnitude === undefined) {
						console.warn("No ambientMangitude property specified on material using Voxel shader, setting to 0.5");
						material.ambientMagnitude = 0.5;
					}
					if (material.directionalMagnitude === undefined) {
						console.warn("No directionalMagnitude property specified on material using Voxel shader, setting to 0.5");
						material.directionalMagnitude = 0.5;
					}
				}
		};
		return shader;
	};

	return exports;
})();
