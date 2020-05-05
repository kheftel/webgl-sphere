import Matrix from "./Matrix";
import IShaderProgram from "./IShaderProgram";

export default class Mesh {
	public gl:WebGLRenderingContext;
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
	public shader: IShaderProgram;
	public isOpaque: Boolean;
	public is2D:boolean;
	public name:string;
	public aloc_position:number;
	public aloc_normal:number;
	public aloc_uv:number;
	public uloc_sampler:WebGLUniformLocation;

	public prepBuffers() {
		var gl = this.gl;
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
		this.aloc_position = gl.getAttribLocation(this.shader.shaderProgram, "a_position");

		this.normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
		this.aloc_normal = gl.getAttribLocation(this.shader.shaderProgram, "a_normal");

		this.uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
		this.aloc_uv = gl.getAttribLocation(this.shader.shaderProgram, "a_uv");

		this.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

		this.uloc_sampler = gl.getUniformLocation(this.shader.shaderProgram, 'u_Sampler');
	}

	public deleteBuffers() {
		var gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.normalBuffer);
		gl.deleteBuffer(this.uvBuffer);
		gl.deleteBuffer(this.indexBuffer);
	}

	public beforeDraw() {
		var gl = this.gl;
		this.updateNormalMatrix();
		gl.uniformMatrix4fv(this.shader.uloc_Model, false, this.modelMatrix);
		gl.uniformMatrix4fv(this.shader.uloc_Normal, false, this.normalMatrix);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.aloc_position, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aloc_position);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(this.aloc_normal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aloc_normal);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.vertexAttribPointer(this.aloc_uv, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aloc_uv);

		// use our texture as sampler 0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.uloc_sampler, 0);

		// use our index buffer
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

		// set blend mode
		if (this.isOpaque) {
			gl.disable(gl.BLEND);
		}
		else {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		}
	}

	public draw(mode:any = null) {
		var gl = this.gl;
		if(mode === null) mode = gl.TRIANGLES;
		gl.drawElements(mode, this.indices.length, gl.UNSIGNED_SHORT, 0);
	}

	public updateNormalMatrix() {
		Matrix.invert(this.normalMatrix, this.modelMatrix);
		Matrix.transpose(this.normalMatrix, this.normalMatrix);
	}

	constructor(name:string, gl:WebGLRenderingContext) {
		this.gl = gl;
		this.name = name;
		this.modelMatrix = Matrix.create();
		this.normalMatrix = Matrix.create();
		this.is2D = false;
	}
}