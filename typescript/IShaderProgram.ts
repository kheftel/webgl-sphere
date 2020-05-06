export default interface IShaderProgram {
	uloc_Projection: WebGLUniformLocation;
	uloc_View: WebGLUniformLocation;
	uloc_Model: WebGLUniformLocation;
	uloc_Normal: WebGLUniformLocation;
	uloc_ambientLight: WebGLUniformLocation;
	uloc_directionalLight: WebGLUniformLocation;
	uloc_directionalLightColor: WebGLUniformLocation;

	shaderProgram: WebGLProgram;
}
