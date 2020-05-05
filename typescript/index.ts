// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm

import Mesh from "./Mesh";
import Sphere from "./Sphere";
import Matrix from "./Matrix";
import IShaderProgram from "./IShaderProgram";
import Quad from "./Quad";

class App {
	private _canvas: HTMLCanvasElement;
	private _gl: WebGLRenderingContext;
	private _defaultShader: IShaderProgram;
	private _textures: {
		[key: string]: WebGLTexture;
	};

	private _config:
		{
			DrawMode: number;
			Quality: number;
			ZoomLevel: number;

			Rotation:
			{
				[key: string]: number;
				X: number;
				Y: number;
				Z: number;
			}
		};

	private _qualityData =
		[
			{ sectors: 10, stacks: 5 },
			{ sectors: 18, stacks: 9 },
			{ sectors: 36, stacks: 18 },
			{ sectors: 72, stacks: 36 },
		];

	constructor(canvas: HTMLCanvasElement) {
		this._canvas = canvas;
		this._gl = <WebGLRenderingContext>canvas.getContext('webgl');
		this._gl.viewport(0, 0, canvas.width, canvas.height);

		this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
		this._canvas.setAttribute('height', this._canvas.clientHeight.toString());

		this._config =
		{
			DrawMode: this._gl.TRIANGLES,
			Quality: 3,
			ZoomLevel: -15,

			Rotation:
			{
				X: 0.0000,
				Y: 0.0001,
				Z: 0
			}
		};

		this._textures = {};
	}

	private _setData() {
		var gl = this._gl;

		var q = new Quad(2, 2);
		var backdrop = new Mesh('backdrop');
		backdrop.isOpaque = true;
		backdrop.is2D = true;
		backdrop.shader = this._defaultShader;
		backdrop.vertices = q.getVertices();
		backdrop.normals = q.getNormals();
		backdrop.uvs = q.getUVs();
		backdrop.indices = q.getIndices();
		backdrop.texture = this._textures['stars'];
		backdrop.prepBuffers(gl);
		Matrix.scale(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
		Matrix.translate(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
		backdrop.updateNormalMatrix();

		var radius = 7.0;
		var sphere = new Sphere(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);

		var earth = new Mesh('earth');
		earth.isOpaque = true;
		earth.shader = this._defaultShader;
		earth.vertices = sphere.getVertices();
		earth.normals = sphere.getNormals();
		earth.uvs = sphere.getUVs();
		earth.indices = sphere.getIndices();
		earth.prepBuffers(gl);
		earth.texture = this._textures['earth'];
		Matrix.rotateX(earth.modelMatrix, 270 * Math.PI / 180);
		Matrix.rotateY(earth.modelMatrix, 170 * Math.PI / 180);
		earth.updateNormalMatrix();

		var sphere2 = new Sphere(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		var clouds = new Mesh('clouds');
		clouds.isOpaque = false;
		clouds.shader = this._defaultShader;
		clouds.vertices = sphere2.getVertices();
		clouds.normals = sphere2.getNormals();
		clouds.uvs = sphere2.getUVs();
		clouds.indices = sphere2.getIndices();
		clouds.prepBuffers(gl);
		clouds.texture = this._textures['clouds'];
		Matrix.rotateX(clouds.modelMatrix, 270 * Math.PI / 180);
		Matrix.rotateY(clouds.modelMatrix, 170 * Math.PI / 180);
		Matrix.translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
		clouds.updateNormalMatrix();

		return {
			meshes: [backdrop, earth, clouds]
		};
	}

	/**
	 * Resize a canvas to match the size its displayed.
	 * @param {HTMLCanvasElement} canvas The canvas to resize.
	 * @param {number} [multiplier] amount to multiply by.
	 *    Pass in window.devicePixelRatio for native pixels.
	 * @return {boolean} true if the canvas was resized.
	 * @memberOf module:webgl-utils
	 */
	private _resizeCanvasToDisplaySize(multiplier: number = 0) {
		var canvas = this._canvas;
		multiplier = multiplier || 1;
		const width = canvas.clientWidth * multiplier | 0;
		const height = canvas.clientHeight * multiplier | 0;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			return true;
		}
		return false;
	}

	private _animate(proj_matrix: Float32Array, view_matrix: Float32Array, ortho_matrix: Float32Array, meshes: Mesh[]) {
		const gl = this._gl;
		const rotThetas = this._config.Rotation;

		var identity: Float32Array = Matrix.create();

		let time_old = 0;
		let zoomLevel_old = 0;
		const execAnimation = (time: number) => {
			var dt = time - time_old;
			time_old = time;

			this._resizeCanvasToDisplaySize();

			if (Math.abs(this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
				view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + this._config.ZoomLevel;
				zoomLevel_old = this._config.ZoomLevel;
				console.log(this._config.ZoomLevel);
			}

			gl.clearDepth(1.0);
			gl.viewport(0.0, 0.0, this._canvas.clientWidth, this._canvas.clientHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			for (var i = 0; i < meshes.length; i++) {
				var mesh = meshes[i];

				// update mesh
				if (mesh.name != 'backdrop') {
					for (var axis in rotThetas) {
						var theta = rotThetas[axis];
						if (theta > 0.0 || theta < 0.0) {
							(<any>Matrix)[`rotate${axis}`](mesh.modelMatrix, dt * theta);
						}
					}
				}

				// rendering
				var shader = mesh.shader;
				gl.useProgram(shader.shaderProgram);

				if (!mesh.is2D) {
					gl.enable(gl.DEPTH_TEST);
					gl.depthFunc(gl.LEQUAL);
					gl.uniformMatrix4fv(shader.uloc_Projection, false, proj_matrix);
					gl.uniformMatrix4fv(shader.uloc_View, false, view_matrix);
				}
				else {
					gl.disable(gl.DEPTH_TEST);
					gl.uniformMatrix4fv(shader.uloc_Projection, false, ortho_matrix);
					gl.uniformMatrix4fv(shader.uloc_View, false, identity);
				}

				mesh.beforeDraw(gl);
				mesh.draw(gl);
			}

			window.requestAnimationFrame(execAnimation);
		}

		execAnimation(0);
	}

	public Draw() {
		this._defaultShader = App.UseQuarternionShaderProgram(this._gl);

		var data = this._setData();

		var proj_matrix = Matrix.perspectiveProjection(45, this._canvas.width / this._canvas.height, 1, 100);
		var view_matrix = Matrix.create();
		var ortho_matrix = Matrix.orthoProjection(2, 2, 1000);

		this._animate(proj_matrix, view_matrix, ortho_matrix, data.meshes);
	}

	public SetDrawMode(value: string) {
		var modeValue = (<any>this._gl)[value];
		if (modeValue === undefined && typeof modeValue !== 'number') throw new Error(`Invalid mode value '${value}'`);

		this._config.DrawMode = modeValue;
	}

	public SetQuality(value: string) {
		var intValue = parseInt(value, 10);
		if (isNaN(intValue)) throw new Error(`Quality value must be a number.`);

		this._config.Quality = intValue;

		this._setData();
		this._defaultShader = App.UseQuarternionShaderProgram(this._gl);
	}

	public GetRotation(axis: string) {
		return this._config.Rotation[axis];
	}

	public SetRotation(axis: string, value: number) {
		if (this._config.Rotation[axis] === undefined) throw new Error(`Invalid axis '${axis}'`);
		if (isNaN(value) || typeof value !== 'number') throw new Error(`Rotation value must be a number.`);

		this._config.Rotation[axis] = value;
	}

	public GetZoom() {
		return this._config.ZoomLevel;
	}

	public SetZoom(value: number) {
		if (isNaN(value) || typeof value !== 'number') throw new Error(`Zoom value must be a number.`);

		this._config.ZoomLevel = value;
	}

	//
	// Initialize a texture and load an image.
	// When the image finished loading copy it into the texture.
	//
	public loadTexture(url: string, key: string) {
		var gl = this._gl;
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Because images have to be download over the internet
		// they might take a moment until they are ready.
		// Until then put a single pixel in the texture so we can
		// use it immediately. When the image has finished downloading
		// we'll update the texture with the contents of the image.
		const level = 0;
		const internalFormat = gl.RGBA;
		const width = 1;
		const height = 1;
		const border = 0;
		const srcFormat = gl.RGBA;
		const srcType = gl.UNSIGNED_BYTE;
		const pixel = new Uint8Array([0, 0, 0, 0]);  // transparent black
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
			width, height, border, srcFormat, srcType,
			pixel);

		const image = new Image();
		image.onload = function () {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				srcFormat, srcType, image);

			// WebGL1 has different requirements for power of 2 images
			// vs non power of 2 images so check if the image is a
			// power of 2 in both dimensions.
			if (App.isPowerOf2(image.width) && App.isPowerOf2(image.height)) {
				// Yes, it's a power of 2. Generate mips.
				gl.generateMipmap(gl.TEXTURE_2D);
			} else {
				// No, it's not a power of 2. Turn off mips and set
				// wrapping to clamp to edge
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}
		};
		image.src = url;

		this._textures[key] = texture;
	}

	public static isPowerOf2(value: number) {
		return (value & (value - 1)) == 0;
	}

	public static UseQuarternionVertShader(gl: WebGLRenderingContext) {
		var vertCode = `
			attribute vec3 a_position;
			attribute vec3 a_normal;
			attribute vec2 a_uv;

			uniform mat4 u_Projection;
			uniform mat4 u_View;
			uniform mat4 u_Model;
			uniform mat4 u_NormalMatrix;

			uniform vec3 u_ambientLight;
			uniform vec3 u_directionalLight;
			uniform vec3 u_directionalLightColor;

			varying highp vec2 v_TextureCoord;
			varying highp vec3 v_Lighting;

			void main(void) {
				// Output tex coord to frag shader.
				v_TextureCoord = a_uv;
				
				// set position of vertex
				gl_Position = u_Projection * u_View * u_Model * vec4(a_position, 1.);
				gl_PointSize = 4.0;

				// Apply lighting effect
				// highp vec3 u_ambientLight = vec3(0.3, 0.3, 0.3);
				// highp vec3 u_directionalLightColor = vec3(1, 1, 1);
				// highp vec3 u_directionalLight = normalize(vec3(0.85, 0.8, 0.75));
				highp vec4 transformedNormal = u_NormalMatrix * vec4(a_normal, 1.0);
				highp float directional = max(dot(transformedNormal.xyz, u_directionalLight), 0.0);
				v_Lighting = u_ambientLight + (u_directionalLightColor * directional);				
			}`;

		var vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, vertCode);
		gl.compileShader(vertShader);

		// See if it compiled successfully

		if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
			console.error('An error occurred compiling vertex shader: ' + gl.getShaderInfoLog(vertShader));
			gl.deleteShader(vertShader);
			return null;
		}

		return vertShader;
	}

	public static UseVariableFragShader(gl: WebGLRenderingContext) {
		var fragCode = `
			varying highp vec2 v_TextureCoord;
			varying highp vec3 v_Lighting;

			uniform sampler2D u_Sampler;

			void main(void) {
				highp vec4 texelColor = texture2D(u_Sampler, v_TextureCoord); //vec4(vColor.rgb, 1.);
				gl_FragColor = vec4(texelColor.rgb * v_Lighting * texelColor.a, texelColor.a);
			}`;

		var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, fragCode);
		gl.compileShader(fragShader);

		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			console.error('An error occurred compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
			gl.deleteShader(fragShader);
			return null;
		}

		return fragShader;
	}

	public static UseQuarternionShaderProgram(gl: WebGLRenderingContext): IShaderProgram {
		var vertShader = App.UseQuarternionVertShader(gl);
		var fragShader = App.UseVariableFragShader(gl);

		var shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertShader);
		gl.attachShader(shaderProgram, fragShader);
		gl.linkProgram(shaderProgram);

		// If creating the shader program failed, alert

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		}

		var uloc_Projection = gl.getUniformLocation(shaderProgram, "u_Projection");
		var uloc_View = gl.getUniformLocation(shaderProgram, "u_View");
		var uloc_Model = gl.getUniformLocation(shaderProgram, "u_Model");
		var uloc_Noraml = gl.getUniformLocation(shaderProgram, "u_NormalMatrix");

		gl.useProgram(shaderProgram);

		var uloc_ambientLight = gl.getUniformLocation(shaderProgram, "u_ambientLight");
		var uloc_directionalLight = gl.getUniformLocation(shaderProgram, "u_directionalLight");
		var uloc_directionalLightColor = gl.getUniformLocation(shaderProgram, "u_directionalLightColor");
		gl.uniform3f(uloc_ambientLight, 0.3, 0.3, 0.3);
		gl.uniform3f(uloc_directionalLight, 1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3));
		gl.uniform3f(uloc_directionalLightColor, 1, 1, 1);

		return {
			uloc_Projection: uloc_Projection,
			uloc_View: uloc_View,
			uloc_Model: uloc_Model,
			uloc_Normal: uloc_Noraml,
			shaderProgram: shaderProgram
		};
	}
}

function showRangeValue(prepend: string, sliderId: string, inputId: string) {
	(<HTMLInputElement>document.getElementById(inputId)).value = prepend + (<HTMLInputElement>document.getElementById(sliderId)).value;
}

function startApp() {
	let app = new App(<HTMLCanvasElement>document.getElementById('canvas'));

	app.loadTexture('./img/stars.png', 'stars');
	app.loadTexture('./img/earth.png', 'earth');
	app.loadTexture('./img/clouds.png', 'clouds');

	let drawMode = <HTMLSelectElement>document.getElementById('drawMode');
	drawMode.addEventListener('change', (e) => app.SetDrawMode((<HTMLOptionElement>drawMode.options[drawMode.selectedIndex]).value));

	let quality = <HTMLSelectElement>document.getElementById('quality');
	quality.addEventListener('change', (e) => app.SetQuality((<HTMLOptionElement>quality.options[quality.selectedIndex]).value));

	let sliderX = <HTMLInputElement>document.getElementById('sliderX');
	let sliderY = <HTMLInputElement>document.getElementById('sliderY');
	let sliderZ = <HTMLInputElement>document.getElementById('sliderZ');
	let sliderZoom = <HTMLInputElement>document.getElementById('sliderZoom');

	sliderX.value = app.GetRotation('X').toString();
	sliderY.value = app.GetRotation('Y').toString();
	sliderZ.value = app.GetRotation('Z').toString();
	sliderZoom.value = app.GetZoom().toString();

	sliderX.addEventListener('input', () => {
		app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value));
		showRangeValue('X:', 'sliderX', 'sliderInputX');
	});
	sliderY.addEventListener('input', () => {
		app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value))
		showRangeValue('Y:', 'sliderY', 'sliderInputY');
	});
	sliderZ.addEventListener('input', () => {
		app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value))
		showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
	});
	sliderZoom.addEventListener('input', () => {
		app.SetZoom(parseFloat(sliderZoom.value));
		showRangeValue('', 'sliderZoom', 'sliderInputZoom');
	});

	showRangeValue('X:', 'sliderX', 'sliderInputX');
	showRangeValue('Y:', 'sliderY', 'sliderInputY');
	showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
	showRangeValue('', 'sliderZoom', 'sliderInputZoom');

	app.Draw();
}

(() => {
	startApp();
})();
