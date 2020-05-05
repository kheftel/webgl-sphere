// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
interface IShaderProgram {
	Pmatrix: WebGLUniformLocation;
	Vmatrix: WebGLUniformLocation;
	Mmatrix: WebGLUniformLocation;
	NormalMatrix: WebGLUniformLocation;
	ShaderProgram: WebGLProgram;
}

class Mesh {
	public vertices: number[];
	public normals: number[];
	public uvs: number[];
	public indices: number[];
	public texture: WebGLTexture;
	public vertexBuffer: WebGLBuffer;
	public normalBuffer: WebGLBuffer;
	public uvBuffer: WebGLBuffer;
	public indexBuffer: WebGLBuffer;
	public modelMatrix: Float32Array;
	public normalMatrix: Float32Array;

	public prepBuffers(ctx: WebGLRenderingContext) {
		this.vertexBuffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, this.vertexBuffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this.vertices), ctx.STATIC_DRAW);

		this.normalBuffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, this.normalBuffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this.normals), ctx.STATIC_DRAW);

		this.uvBuffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, this.uvBuffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this.uvs), ctx.STATIC_DRAW);

		this.indexBuffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), ctx.STATIC_DRAW);
	}

	public updateNormalMatrix() {
		Matrix.Invert(this.normalMatrix, this.modelMatrix);
		Matrix.Transpose(this.normalMatrix, this.normalMatrix);
	}

	constructor() {
		this.modelMatrix = Matrix.Create();
		this.normalMatrix = Matrix.Create();
	}
}

class App {
	private _canvas: HTMLCanvasElement;
	private _ctx: WebGLRenderingContext;
	private _vertices: number[];
	private _normals: number[];
	private _uvs: number[];
	private _indices: number[];
	private _shader: IShaderProgram;
	private _textures: WebGLTexture[];

	private _earth: Mesh;

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
		this._ctx = <WebGLRenderingContext>canvas.getContext('webgl');
		this._ctx.viewport(0, 0, canvas.width, canvas.height);

		this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
		this._canvas.setAttribute('height', this._canvas.clientHeight.toString());

		this._config =
		{
			DrawMode: this._ctx.TRIANGLES,
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
		var ctx = this._ctx;

		var radius = 7.0;

		var sphere = new Sphere(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);

		var earth = new Mesh();
		earth.vertices = sphere.getVertices();
		earth.normals = sphere.getNormals();
		earth.uvs = sphere.getUVs();
		earth.indices = sphere.getIndices();
		earth.prepBuffers(ctx);
		earth.texture = this._textures[0];
		Matrix.RotateX(earth.modelMatrix, 3 * Math.PI / 2);
		Matrix.RotateY(earth.modelMatrix, Math.PI);
		earth.updateNormalMatrix();

		var sphere2 = new Sphere(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		var clouds = new Mesh();
		clouds.vertices = sphere2.getVertices();
		clouds.normals = sphere2.getNormals();
		clouds.uvs = sphere2.getUVs();
		clouds.indices = sphere2.getIndices();
		clouds.prepBuffers(ctx);
		clouds.texture = this._textures[1];
		Matrix.RotateX(clouds.modelMatrix, 3 * Math.PI / 2);
		Matrix.RotateY(clouds.modelMatrix, Math.PI);
		Matrix.Translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
		clouds.updateNormalMatrix();

		return {
			meshes: [earth, clouds]
		};
	}

	private _animate(proj_matrix: Float32Array, view_matrix: Float32Array, meshes: Mesh[]) {
		const ctx = this._ctx;
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

			ctx.enable(ctx.DEPTH_TEST);
			ctx.depthFunc(ctx.LEQUAL);
			ctx.clearDepth(1.0);
			ctx.viewport(0.0, 0.0, this._canvas.width, this._canvas.height);
			ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

			ctx.uniformMatrix4fv(this._shader.Pmatrix, false, proj_matrix);
			ctx.uniformMatrix4fv(this._shader.Vmatrix, false, view_matrix);

			for (var i = 0; i < meshes.length; i++) {
				var mesh = meshes[i];

				for (var axis in rotThetas) {
					var theta = rotThetas[axis];
					if (theta > 0.0 || theta < 0.0) {
						(<any>Matrix)[`Rotate${axis}`](mesh.modelMatrix, dt * theta);
					}
				}

				mesh.updateNormalMatrix();
				ctx.uniformMatrix4fv(this._shader.Mmatrix, false, mesh.modelMatrix);
				ctx.uniformMatrix4fv(this._shader.NormalMatrix, false, mesh.normalMatrix);

				var shaderProgram = this._shader.ShaderProgram;
				var position = ctx.getAttribLocation(shaderProgram, "position");
				ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.vertexBuffer);
				ctx.vertexAttribPointer(position, 3, ctx.FLOAT, false, 0, 0);
				ctx.enableVertexAttribArray(position);

				ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.normalBuffer);
				var normal = ctx.getAttribLocation(shaderProgram, "normal");
				ctx.vertexAttribPointer(normal, 3, ctx.FLOAT, false, 0, 0);
				ctx.enableVertexAttribArray(normal);

				ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.uvBuffer);
				var uv = ctx.getAttribLocation(shaderProgram, "uv");
				ctx.vertexAttribPointer(uv, 2, ctx.FLOAT, false, 0, 0);
				ctx.enableVertexAttribArray(uv);

				// set mesh's texture to sampler 0
				ctx.activeTexture(ctx.TEXTURE0);
				ctx.bindTexture(ctx.TEXTURE_2D, mesh.texture);
				ctx.uniform1i(ctx.getUniformLocation(this._shader.ShaderProgram, 'uSampler'), 0);

				// use mesh's index buffer
				ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

				ctx.enable(ctx.BLEND);
				ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);

				// draw mesh
				ctx.drawElements(this._config.DrawMode, mesh.indices.length, ctx.UNSIGNED_SHORT, 0);
			}

			window.requestAnimationFrame(execAnimation);
		}

		execAnimation(0);
	}

	public Draw() {
		var data = this._setData();

		this._shader = App.UseQuarternionShaderProgram(this._ctx);

		var proj_matrix = Matrix.GetProjection(45, this._canvas.width / this._canvas.height, 1, 100);
		var view_matrix = Matrix.Create();
		// var mov_matrix = Matrix.Create();
		// Matrix.RotateX(mov_matrix, 3 * Math.PI / 2);
		// Matrix.RotateY(mov_matrix, Math.PI);
		// var normal_matrix = Matrix.Create();
		// Matrix.Invert(normal_matrix, mov_matrix);
		// Matrix.Transpose(normal_matrix, normal_matrix);

		this._animate(proj_matrix, view_matrix, data.meshes);
	}

	public SetDrawMode(value: string) {
		var modeValue = (<any>this._ctx)[value];
		if (modeValue === undefined && typeof modeValue !== 'number') throw new Error(`Invalid mode value '${value}'`);

		this._config.DrawMode = modeValue;
	}

	public SetQuality(value: string) {
		var intValue = parseInt(value, 10);
		if (isNaN(intValue)) throw new Error(`Quality value must be a number.`);

		this._config.Quality = intValue;

		var buffers = this._setData();
		this._shader = App.UseQuarternionShaderProgram(this._ctx);
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
		var gl = this._ctx;
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

	public static UseQuarternionVertShader(context: WebGLRenderingContext) {
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

		var vertShader = context.createShader(context.VERTEX_SHADER);
		context.shaderSource(vertShader, vertCode);
		context.compileShader(vertShader);

		// See if it compiled successfully

		if (!context.getShaderParameter(vertShader, context.COMPILE_STATUS)) {
			console.error('An error occurred compiling vertex shader: ' + context.getShaderInfoLog(vertShader));
			context.deleteShader(vertShader);
			return null;
		}

		return vertShader;
	}

	public static UseVariableFragShader(context: WebGLRenderingContext) {
		var fragCode = `
			varying highp vec2 vTextureCoord;
			varying highp vec3 vLighting;

			uniform sampler2D uSampler;

			void main(void) {
				highp vec4 texelColor = texture2D(uSampler, vTextureCoord); //vec4(vColor.rgb, 1.);
				gl_FragColor = vec4(texelColor.rgb * vLighting * texelColor.a, texelColor.a);
			}`;

		var fragShader = context.createShader(context.FRAGMENT_SHADER);
		context.shaderSource(fragShader, fragCode);
		context.compileShader(fragShader);

		if (!context.getShaderParameter(fragShader, context.COMPILE_STATUS)) {
			console.error('An error occurred compiling fragment shader: ' + context.getShaderInfoLog(fragShader));
			context.deleteShader(fragShader);
			return null;
		}

		return fragShader;
	}

	public static UseQuarternionShaderProgram(ctx: WebGLRenderingContext): IShaderProgram {
		var vertShader = App.UseQuarternionVertShader(ctx);
		var fragShader = App.UseVariableFragShader(ctx);

		var shaderProgram = ctx.createProgram();
		ctx.attachShader(shaderProgram, vertShader);
		ctx.attachShader(shaderProgram, fragShader);
		ctx.linkProgram(shaderProgram);

		// If creating the shader program failed, alert

		if (!ctx.getProgramParameter(shaderProgram, ctx.LINK_STATUS)) {
			alert('Unable to initialize the shader program: ' + ctx.getProgramInfoLog(shaderProgram));
		}

		var Pmatrix = ctx.getUniformLocation(shaderProgram, "Pmatrix");
		var Vmatrix = ctx.getUniformLocation(shaderProgram, "Vmatrix");
		var Mmatrix = ctx.getUniformLocation(shaderProgram, "Mmatrix");
		var NormalMatrix = ctx.getUniformLocation(shaderProgram, "NormalMatrix");

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

		ctx.useProgram(shaderProgram);

		var ambientColor = ctx.getUniformLocation(shaderProgram, "uAmbientColor");
		var pointLightingLocation = ctx.getUniformLocation(shaderProgram, "uPointLightingLocation");
		var pointLightingColor = ctx.getUniformLocation(shaderProgram, "uPointLightingColor");
		ctx.uniform3f(ambientColor, 0.2, 0.2, 0.2);
		ctx.uniform3f(pointLightingLocation, 0.0, 0.0, -20.0);
		ctx.uniform3f(pointLightingColor, 0.8, 0.8, 0.8);

		return {
			Pmatrix: Pmatrix,
			Vmatrix: Vmatrix,
			Mmatrix: Mmatrix,
			NormalMatrix: NormalMatrix,
			ShaderProgram: shaderProgram
		};
	}
}

class Matrix {
	public static Create() {
		return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	}

	public static GetProjection(angle: number, a: number, zMin: number, zMax: number) {
		var ang = Math.tan((angle * .5) * Math.PI / 180);
		return new Float32Array([
			0.5 / ang, 0, 0, 0,
			0, 0.5 * a / ang, 0, 0,
			0, 0, -(zMax + zMin) / (zMax - zMin), -1,
			0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
		]);
	}

	public static Clone(a: Float32Array) {
		let out = Matrix.Create();
		out[0] = a[0];
		out[1] = a[1];
		out[2] = a[2];
		out[3] = a[3];
		out[4] = a[4];
		out[5] = a[5];
		out[6] = a[6];
		out[7] = a[7];
		out[8] = a[8];
		out[9] = a[9];
		out[10] = a[10];
		out[11] = a[11];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
		return out;
	}

	public static Copy(out: Float32Array, a: Float32Array) {
		out[0] = a[0];
		out[1] = a[1];
		out[2] = a[2];
		out[3] = a[3];
		out[4] = a[4];
		out[5] = a[5];
		out[6] = a[6];
		out[7] = a[7];
		out[8] = a[8];
		out[9] = a[9];
		out[10] = a[10];
		out[11] = a[11];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
		return out;
	}

	public static Identity(out: Float32Array) {
		out[0] = 1;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
		out[4] = 0;
		out[5] = 1;
		out[6] = 0;
		out[7] = 0;
		out[8] = 0;
		out[9] = 0;
		out[10] = 1;
		out[11] = 0;
		out[12] = 0;
		out[13] = 0;
		out[14] = 0;
		out[15] = 1;
		return out;
	}

	public static Transpose(out: Float32Array, a: Float32Array) {
		// If we are transposing ourselves we can skip a few steps but have to cache some values
		if (out === a) {
			let a01 = a[1],
				a02 = a[2],
				a03 = a[3];
			let a12 = a[6],
				a13 = a[7];
			let a23 = a[11];

			out[1] = a[4];
			out[2] = a[8];
			out[3] = a[12];
			out[4] = a01;
			out[6] = a[9];
			out[7] = a[13];
			out[8] = a02;
			out[9] = a12;
			out[11] = a[14];
			out[12] = a03;
			out[13] = a13;
			out[14] = a23;
		} else {
			out[0] = a[0];
			out[1] = a[4];
			out[2] = a[8];
			out[3] = a[12];
			out[4] = a[1];
			out[5] = a[5];
			out[6] = a[9];
			out[7] = a[13];
			out[8] = a[2];
			out[9] = a[6];
			out[10] = a[10];
			out[11] = a[14];
			out[12] = a[3];
			out[13] = a[7];
			out[14] = a[11];
			out[15] = a[15];
		}

		return out;
	}

	public static Invert(out: Float32Array, a: Float32Array) {
		let a00 = a[0],
			a01 = a[1],
			a02 = a[2],
			a03 = a[3];
		let a10 = a[4],
			a11 = a[5],
			a12 = a[6],
			a13 = a[7];
		let a20 = a[8],
			a21 = a[9],
			a22 = a[10],
			a23 = a[11];
		let a30 = a[12],
			a31 = a[13],
			a32 = a[14],
			a33 = a[15];

		let b00 = a00 * a11 - a01 * a10;
		let b01 = a00 * a12 - a02 * a10;
		let b02 = a00 * a13 - a03 * a10;
		let b03 = a01 * a12 - a02 * a11;
		let b04 = a01 * a13 - a03 * a11;
		let b05 = a02 * a13 - a03 * a12;
		let b06 = a20 * a31 - a21 * a30;
		let b07 = a20 * a32 - a22 * a30;
		let b08 = a20 * a33 - a23 * a30;
		let b09 = a21 * a32 - a22 * a31;
		let b10 = a21 * a33 - a23 * a31;
		let b11 = a22 * a33 - a23 * a32;

		// Calculate the determinant
		let det =
			b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

		if (!det) {
			return null;
		}
		det = 1.0 / det;

		out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
		out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
		out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
		out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
		out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
		out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
		out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
		out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
		out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
		out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
		out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
		out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
		out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
		out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
		out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
		out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

		return out;
	}

	public static RotateX(m: Float32Array, angle: number) {
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv1 = m[1], mv5 = m[5], mv9 = m[9];

		m[1] = m[1] * c - m[2] * s;
		m[5] = m[5] * c - m[6] * s;
		m[9] = m[9] * c - m[10] * s;

		m[2] = m[2] * c + mv1 * s;
		m[6] = m[6] * c + mv5 * s;
		m[10] = m[10] * c + mv9 * s;
	}

	public static RotateY(m: Float32Array, angle: number) {
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv0 = m[0], mv4 = m[4], mv8 = m[8];

		m[0] = c * m[0] + s * m[2];
		m[4] = c * m[4] + s * m[6];
		m[8] = c * m[8] + s * m[10];

		m[2] = c * m[2] - s * mv0;
		m[6] = c * m[6] - s * mv4;
		m[10] = c * m[10] - s * mv8;
	}

	public static RotateZ(m: Float32Array, angle: number) {
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv0 = m[0], mv4 = m[4], mv8 = m[8];

		m[0] = c * m[0] - s * m[1];
		m[4] = c * m[4] - s * m[5];
		m[8] = c * m[8] - s * m[9];
		m[1] = c * m[1] + s * mv0;
		m[5] = c * m[5] + s * mv4;
		m[9] = c * m[9] + s * mv8;
	}

	public static Translate(out: Float32Array, a: Float32Array, v: number[]) {
		let x = v[0],
			y = v[1],
			z = v[2];
		let a00, a01, a02, a03;
		let a10, a11, a12, a13;
		let a20, a21, a22, a23;

		if (a === out) {
			out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
			out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
			out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
			out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
		} else {
			a00 = a[0];
			a01 = a[1];
			a02 = a[2];
			a03 = a[3];
			a10 = a[4];
			a11 = a[5];
			a12 = a[6];
			a13 = a[7];
			a20 = a[8];
			a21 = a[9];
			a22 = a[10];
			a23 = a[11];

			out[0] = a00;
			out[1] = a01;
			out[2] = a02;
			out[3] = a03;
			out[4] = a10;
			out[5] = a11;
			out[6] = a12;
			out[7] = a13;
			out[8] = a20;
			out[9] = a21;
			out[10] = a22;
			out[11] = a23;

			out[12] = a00 * x + a10 * y + a20 * z + a[12];
			out[13] = a01 * x + a11 * y + a21 * z + a[13];
			out[14] = a02 * x + a12 * y + a22 * z + a[14];
			out[15] = a03 * x + a13 * y + a23 * z + a[15];
		}

		return out;
	};

	public static Multiply(out: Float32Array, a: Float32Array, b: Float32Array) {
		let a00 = a[0],
			a01 = a[1],
			a02 = a[2],
			a03 = a[3];
		let a10 = a[4],
			a11 = a[5],
			a12 = a[6],
			a13 = a[7];
		let a20 = a[8],
			a21 = a[9],
			a22 = a[10],
			a23 = a[11];
		let a30 = a[12],
			a31 = a[13],
			a32 = a[14],
			a33 = a[15];

		// Cache only the current line of the second matrix
		let b0 = b[0],
			b1 = b[1],
			b2 = b[2],
			b3 = b[3];
		out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[4];
		b1 = b[5];
		b2 = b[6];
		b3 = b[7];
		out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[8];
		b1 = b[9];
		b2 = b[10];
		b3 = b[11];
		out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[12];
		b1 = b[13];
		b2 = b[14];
		b3 = b[15];
		out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
		return out;
	}

}

class Sphere {
	public Points: { x: number; y: number; z: number }[];
	public Normals: { x: number, y: number, z: number }[];
	public TextureCoords: { u: number, v: number }[];
	public TriangleIndices: number[];

	private _radius: number;
	private _sectorCount: number;
	private _stackCount: number;

	constructor(radius = 1, sectors = 36, stacks = 18) {
		this._radius = radius;
		this._sectorCount = sectors;
		this._stackCount = stacks;
		this._calculateGeometry();
	}

	public getVertices() {
		return <number[]><any>this.Points.reduce((a, b, i) => i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : (<any>a).concat([b.x, b.y, b.z]));
	}

	public getNormals() {
		return <number[]><any>this.Normals.reduce((a, b, i) => i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : (<any>a).concat([b.x, b.y, b.z]));
	}

	public getUVs() {
		return <number[]><any>this.TextureCoords.reduce((a, b, i) => i === 1 ? [a.u, a.v, b.u, b.v] : (<any>a).concat([b.u, b.v]));
	}

	public getIndices() {
		return this.TriangleIndices;
	}

	private _calculateGeometry() {
		this.Points = [];
		this.Normals = [];
		this.TextureCoords = [];
		this.TriangleIndices = [];

		///////////////////////////////////////////////////////////////////////////////
		// build vertices of sphere with smooth shading using parametric equation
		// x = r * cos(u) * cos(v)
		// y = r * cos(u) * sin(v)
		// z = r * sin(u)
		// where u: stack(latitude) angle (-90 <= u <= 90)
		//       v: sector(longitude) angle (0 <= v <= 360)
		///////////////////////////////////////////////////////////////////////////////

		var radius = this._radius;
		var sectorCount = this._sectorCount;
		var stackCount = this._stackCount;

		var x, y, z, xy;                              // vertex position
		var nx, ny, nz, lengthInv = 1.0 / radius;    // normal
		var s, t;                                     // texCoord

		var sectorStep = 2 * Math.PI / sectorCount;
		var stackStep = Math.PI / stackCount;
		var sectorAngle, stackAngle;

		for (var i = 0; i <= stackCount; ++i) {
			stackAngle = Math.PI / 2 - i * stackStep;        // starting from pi/2 to -pi/2
			xy = radius * Math.cos(stackAngle);             // r * cos(u)
			z = radius * Math.sin(stackAngle);              // r * sin(u)

			// add (sectorCount+1) vertices per stack
			// the first and last vertices have same position and normal, but different tex coords
			for (var j = 0; j <= sectorCount; ++j) {
				sectorAngle = j * sectorStep;           // starting from 0 to 2pi

				// vertex position
				x = xy * Math.cos(sectorAngle);             // r * cos(u) * cos(v)
				y = xy * Math.sin(sectorAngle);             // r * cos(u) * sin(v)
				this._addVertex(x, y, z);

				// normalized vertex normal
				nx = x * lengthInv;
				ny = y * lengthInv;
				nz = z * lengthInv;
				this._addNormal(nx, ny, nz);

				// vertex tex coord between [0, 1]
				s = j / sectorCount;
				t = i / stackCount;
				this._addTextureCoord(s, t);
			}
		}

		// indices
		//  k1--k1+1
		//  |  / |
		//  | /  |
		//  k2--k2+1
		var k1, k2;
		for (i = 0; i < stackCount; ++i) {
			k1 = i * (sectorCount + 1);     // beginning of current stack
			k2 = k1 + sectorCount + 1;      // beginning of next stack

			for (j = 0; j < sectorCount; ++j, ++k1, ++k2) {
				// 2 triangles per sector excluding 1st and last stacks
				if (i != 0) {
					this._addFace(k1, k2, k1 + 1);   // k1---k2---k1+1
				}

				if (i != (stackCount - 1)) {
					this._addFace(k1 + 1, k2, k2 + 1); // k1+1---k2---k2+1
				}

				// // vertical lines for all stacks
				// lineIndices.push_back(k1);
				// lineIndices.push_back(k2);
				// if (i != 0)  // horizontal lines except 1st stack
				// {
				// 	lineIndices.push_back(k1);
				// 	lineIndices.push_back(k1 + 1);
				// }
			}
		}
	}

	private _addVertex(x: number, y: number, z: number) {
		// var length = Math.sqrt(x * x + y * y + z * z);
		// x /= length;
		// y /= length;
		// z /= length;
		this.Points.push({
			x: x,
			y: y,
			z: z,
		});
	}

	private _addNormal(x: number, y: number, z: number) {
		// var length = Math.sqrt(x * x + y * y + z * z);
		// x /= length;
		// y /= length;
		// z /= length;
		this.Normals.push({
			x: x,
			y: y,
			z: z,
		});
	}

	private _addTextureCoord(u: number, v: number) {
		this.TextureCoords.push({
			u: u,
			v: v,
		});
	}

	private _addFace(x: number, y: number, z: number) {
		this.TriangleIndices.push(x);
		this.TriangleIndices.push(y);
		this.TriangleIndices.push(z);
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
