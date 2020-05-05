import Matrix from "./Matrix";

export default class Mesh {
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

	public prepBuffers(gl: WebGLRenderingContext) {
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

		this.normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);

		this.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
	}

	public updateNormalMatrix() {
		Matrix.invert(this.normalMatrix, this.modelMatrix);
		Matrix.transpose(this.normalMatrix, this.normalMatrix);
	}

	constructor() {
		this.modelMatrix = Matrix.create();
		this.normalMatrix = Matrix.create();
	}
}