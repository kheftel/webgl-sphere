// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm

import Mesh from "./Mesh";
import Sphere from "./Sphere";
import Matrix from "./Matrix";

interface IShaderProgram {
	Pmatrix: WebGLUniformLocation;
	Vmatrix: WebGLUniformLocation;
	Mmatrix: WebGLUniformLocation;
	NormalMatrix: WebGLUniformLocation;
	ShaderProgram: WebGLProgram;
}

class App {
	private _canvas: HTMLCanvasElement;
	private _gl: WebGLRenderingContext;
	private _shader: IShaderProgram;
	private _textures: WebGLTexture[];

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

		this._textures = [];
	}

	private _setData() {
		var gl = this._gl;

		var radius = 7.0;

		var sphere = new Sphere(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);

		var earth = new Mesh();
		earth.vertices = sphere.getVertices();
		earth.normals = sphere.getNormals();
		earth.uvs = sphere.getUVs();
		earth.indices = sphere.getIndices();
		earth.prepBuffers(gl);
		earth.texture = this._textures[0];
		Matrix.rotateX(earth.modelMatrix, 3 * Math.PI / 2);
		Matrix.rotateY(earth.modelMatrix, Math.PI);
		earth.updateNormalMatrix();

		var sphere2 = new Sphere(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		var clouds = new Mesh();
		clouds.vertices = sphere2.getVertices();
		clouds.normals = sphere2.getNormals();
		clouds.uvs = sphere2.getUVs();
		clouds.indices = sphere2.getIndices();
		clouds.prepBuffers(gl);
		clouds.texture = this._textures[1];
		Matrix.rotateX(clouds.modelMatrix, 3 * Math.PI / 2);
		Matrix.rotateY(clouds.modelMatrix, Math.PI);
		Matrix.translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
		clouds.updateNormalMatrix();

		return {
			meshes: [earth, clouds]
		};
	}

	private _animate(proj_matrix: Float32Array, view_matrix: Float32Array, meshes: Mesh[]) {
		const gl = this._gl;
		const rotThetas = this._config.Rotation;

		let time_old = 0;
		let zoomLevel_old = 0;
		const execAnimation = (time: number) => {
			var dt = time - time_old;
			time_old = time;

			if (Math.abs(this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
				view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + this._config.ZoomLevel;
				zoomLevel_old = this._config.ZoomLevel;
				console.log(this._config.ZoomLevel);
			}

			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clearDepth(1.0);
			gl.viewport(0.0, 0.0, this._canvas.width, this._canvas.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.uniformMatrix4fv(this._shader.Pmatrix, false, proj_matrix);
			gl.uniformMatrix4fv(this._shader.Vmatrix, false, view_matrix);

			for (var i = 0; i < meshes.length; i++) {
				var mesh = meshes[i];

				for (var axis in rotThetas) {
					var theta = rotThetas[axis];
					if (theta > 0.0 || theta < 0.0) {
						(<any>Matrix)[`rotate${axis}`](mesh.modelMatrix, dt * theta);
					}
				}

				mesh.updateNormalMatrix();
				gl.uniformMatrix4fv(this._shader.Mmatrix, false, mesh.modelMatrix);
				gl.uniformMatrix4fv(this._shader.NormalMatrix, false, mesh.normalMatrix);

				var shaderProgram = this._shader.ShaderProgram;
				var position = gl.getAttribLocation(shaderProgram, "position");
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
				gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(position);

				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
				var normal = gl.getAttribLocation(shaderProgram, "normal");
				gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(normal);

				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer);
				var uv = gl.getAttribLocation(shaderProgram, "uv");
				gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(uv);

				// set mesh's texture to sampler 0
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
				gl.uniform1i(gl.getUniformLocation(this._shader.ShaderProgram, 'uSampler'), 0);

				// use mesh's index buffer
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

				// draw mesh
				gl.drawElements(this._config.DrawMode, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
			}

			window.requestAnimationFrame(execAnimation);
		}

		execAnimation(0);
	}

	public Draw() {
		var data = this._setData();

		this._shader = App.UseQuarternionShaderProgram(this._gl);

		var proj_matrix = Matrix.GetProjection(45, this._canvas.width / this._canvas.height, 1, 100);
		var view_matrix = Matrix.create();
		// var mov_matrix = Matrix.Create();
		// Matrix.RotateX(mov_matrix, 3 * Math.PI / 2);
		// Matrix.RotateY(mov_matrix, Math.PI);
		// var normal_matrix = Matrix.Create();
		// Matrix.Invert(normal_matrix, mov_matrix);
		// Matrix.Transpose(normal_matrix, normal_matrix);

		this._animate(proj_matrix, view_matrix, data.meshes);
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

		var buffers = this._setData();
		this._shader = App.UseQuarternionShaderProgram(this._gl);
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
	public loadTexture(url: string, index: number) {
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

		this._textures[index] = texture;
	}

	public static isPowerOf2(value: number) {
		return (value & (value - 1)) == 0;
	}

	public static UseQuarternionVertShader(gl: WebGLRenderingContext) {
		var vertCode = `
			attribute vec3 position;
			attribute vec3 normal;
			attribute vec2 uv;

			attribute highp vec3 aVertexNormal;
			
			uniform mat4 Pmatrix;
			uniform mat4 Vmatrix;
			uniform mat4 Mmatrix;
			uniform mat4 NormalMatrix;

			varying vec3 vLightWeighting;
			
			uniform vec3 uAmbientColor;
			uniform vec3 uPointLightingLocation;
			uniform vec3 uPointLightingColor;

			varying highp vec2 vTextureCoord;
			varying highp vec3 vLighting;

			void main(void) {
				// Output tex coord to frag shader.
				vTextureCoord = uv;
				
				// set position of vertex
				gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
				gl_PointSize = 4.0;

				// Apply lighting effect
				highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
				highp vec3 directionalLightColor = vec3(1, 1, 1);
				highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
				// highp vec3 directionalVector = normalize(vec3(0, 0, -1));
				highp vec4 transformedNormal = NormalMatrix * vec4(normal, 1.0);
				highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
				vLighting = ambientLight + (directionalLightColor * directional);				

				// vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);
				// vec3 transformedNormal = vec3(Vmatrix) * aVertexNormal;
				// float directionalLightWeighting = max(dot(transformedNormal, lightDirection), 0.0);
				// vLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;
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
			varying highp vec2 vTextureCoord;
			varying highp vec3 vLighting;

			uniform sampler2D uSampler;

			void main(void) {
				highp vec4 texelColor = texture2D(uSampler, vTextureCoord); //vec4(vColor.rgb, 1.);
				gl_FragColor = vec4(texelColor.rgb * vLighting * texelColor.a, texelColor.a);
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

		var Pmatrix = gl.getUniformLocation(shaderProgram, "Pmatrix");
		var Vmatrix = gl.getUniformLocation(shaderProgram, "Vmatrix");
		var Mmatrix = gl.getUniformLocation(shaderProgram, "Mmatrix");
		var NormalMatrix = gl.getUniformLocation(shaderProgram, "NormalMatrix");

		// ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
		// var position = ctx.getAttribLocation(shaderProgram, "position");
		// ctx.vertexAttribPointer(position, 3, ctx.FLOAT, false, 0, 0);
		// ctx.enableVertexAttribArray(position);

		// ctx.bindBuffer(ctx.ARRAY_BUFFER, normal_buffer);
		// var normal = ctx.getAttribLocation(shaderProgram, "normal");
		// ctx.vertexAttribPointer(normal, 3, ctx.FLOAT, false, 0, 0);
		// ctx.enableVertexAttribArray(normal);

		// ctx.bindBuffer(ctx.ARRAY_BUFFER, uv_buffer);
		// var uv = ctx.getAttribLocation(shaderProgram, "uv");
		// ctx.vertexAttribPointer(uv, 2, ctx.FLOAT, false, 0, 0);
		// ctx.enableVertexAttribArray(uv);

		gl.useProgram(shaderProgram);

		var ambientColor = gl.getUniformLocation(shaderProgram, "uAmbientColor");
		var pointLightingLocation = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
		var pointLightingColor = gl.getUniformLocation(shaderProgram, "uPointLightingColor");
		gl.uniform3f(ambientColor, 0.2, 0.2, 0.2);
		gl.uniform3f(pointLightingLocation, 0.0, 0.0, -20.0);
		gl.uniform3f(pointLightingColor, 0.8, 0.8, 0.8);

		return {
			Pmatrix: Pmatrix,
			Vmatrix: Vmatrix,
			Mmatrix: Mmatrix,
			NormalMatrix: NormalMatrix,
			ShaderProgram: shaderProgram
		};
	}
}

function showRangeValue(prepend: string, sliderId: string, inputId: string) {
	(<HTMLInputElement>document.getElementById(inputId)).value = prepend + (<HTMLInputElement>document.getElementById(sliderId)).value;
}

function startApp() {
	let app = new App(<HTMLCanvasElement>document.getElementById('canvas'));

	app.loadTexture('./img/earth.png', 0);
	app.loadTexture('./img/clouds.png', 1);

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

	sliderX.addEventListener('input', () => app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value)));
	sliderY.addEventListener('input', () => app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value)));
	sliderZ.addEventListener('input', () => app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value)));
	sliderZoom.addEventListener('input', () => app.SetZoom(parseFloat(sliderZoom.value)));

	showRangeValue('X:', 'sliderX', 'sliderInputX');
	showRangeValue('Y:', 'sliderY', 'sliderInputY');
	showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
	showRangeValue('', 'sliderZoom', 'sliderInputZoom');

	app.Draw();
}

(() => {
	startApp();
})();
