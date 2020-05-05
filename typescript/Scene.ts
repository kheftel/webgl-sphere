import Mesh from "./Mesh";
import Sphere from "./Sphere";
import Matrix from "./Matrix";
import IShaderProgram from "./IShaderProgram";
import Quad from "./Quad";

export default class Scene {
    public _canvas: HTMLCanvasElement;
    public _gl: WebGLRenderingContext;
    public _defaultShader: IShaderProgram;
    public _textures: {
        [key: string]: WebGLTexture;
    };
    public _meshes: Mesh[];
    public projectionMatrix: Float32Array;
    public viewMatrix: Float32Array;
    public orthoMatrix: Float32Array;
    public drawMode:number;

    private _time_old: number;
    private _identity: Float32Array;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._gl = <WebGLRenderingContext>canvas.getContext('webgl');
        this._gl.viewport(0, 0, canvas.width, canvas.height);

        this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
        this._canvas.setAttribute('height', this._canvas.clientHeight.toString());

        this.projectionMatrix = Matrix.perspectiveProjection(45, this._canvas.width / this._canvas.height, 1, 100);
        this.viewMatrix = Matrix.create();
        this.orthoMatrix = Matrix.orthoProjection(2, 2, 1000);
        this._identity = Matrix.create();

        this._textures = {};
        this._meshes = [];

        this.drawMode = this._gl.TRIANGLES;

        this._defaultShader = Scene.createShaderProgram(this._gl);
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
            if (Scene.isPowerOf2(image.width) && Scene.isPowerOf2(image.height)) {
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

    public getTexture(key:string) {
        return this._textures[key];
    }

    public static isPowerOf2(value: number) {
        return (value & (value - 1)) == 0;
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

    public static createVertexShader(gl: WebGLRenderingContext) {
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

    public static createFragmentShader(gl: WebGLRenderingContext) {
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

    public static createShaderProgram(gl: WebGLRenderingContext): IShaderProgram {
        var vertShader = Scene.createVertexShader(gl);
        var fragShader = Scene.createFragmentShader(gl);

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

    public createMesh(name:string, add:boolean = true):Mesh {
        var m = new Mesh(name, this._gl);
        m.shader = this._defaultShader;
        if(add)
            this.addMesh(m);
        return m;
    }

    public addMesh(m:Mesh) {
        if(this._meshes.indexOf(m) == -1)
            this._meshes.push(m);
        else
            console.log(`mesh ${m.name} already added to scene`);
    }

    public destroyMesh(m:Mesh) {
        var index = this._meshes.indexOf(m);
        if(index != -1){
            this._meshes.splice(index, 1);
        }
        m.deleteBuffers();
    }

    public destroyAllMeshes() {
        for(var i = 0; i < this._meshes.length; i++) {
            this._meshes[i].deleteBuffers();
        }
        this._meshes = [];
    }

    public drawScene(time: number = 0) {
        var dt = time - this._time_old;
        this._time_old = time;

        var gl = this._gl;

        this._resizeCanvasToDisplaySize();

        gl.clearDepth(1.0);
        gl.viewport(0.0, 0.0, this._canvas.clientWidth, this._canvas.clientHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (var i = 0; i < this._meshes.length; i++) {
            var mesh = this._meshes[i];

            // rendering
            var shader = mesh.shader;
            gl.useProgram(shader.shaderProgram);

            if (!mesh.is2D) {
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
                gl.uniformMatrix4fv(shader.uloc_Projection, false, this.projectionMatrix);
                gl.uniformMatrix4fv(shader.uloc_View, false, this.viewMatrix);
            }
            else {
                gl.disable(gl.DEPTH_TEST);
                gl.uniformMatrix4fv(shader.uloc_Projection, false, this.orthoMatrix);
                gl.uniformMatrix4fv(shader.uloc_View, false, this._identity);
            }

            mesh.beforeDraw();
            mesh.draw(this.drawMode);
        }
    }
}