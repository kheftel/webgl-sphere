export default interface IShaderProgram {
	uloc_Projection: WebGLUniformLocation;
	uloc_View: WebGLUniformLocation;
	uloc_Model: WebGLUniformLocation;
	uloc_Normal: WebGLUniformLocation;
	shaderProgram: WebGLProgram;
}
