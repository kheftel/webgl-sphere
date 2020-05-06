define(["require", "exports", "./Mesh", "./Matrix"], function (require, exports, Mesh_1, Matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Scene = /** @class */ (function () {
        function Scene(canvas) {
            this._canvas = canvas;
            this._gl = canvas.getContext('webgl');
            this._gl.viewport(0, 0, canvas.width, canvas.height);
            this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
            this._canvas.setAttribute('height', this._canvas.clientHeight.toString());
            this.projectionMatrix = Matrix_1.default.perspectiveProjection(45, this._canvas.width / this._canvas.height, 1, 100);
            this.viewMatrix = Matrix_1.default.create();
            this.orthoMatrix = Matrix_1.default.orthoProjection(2, 2, 1000);
            this._identity = Matrix_1.default.create();
            this._textures = {};
            this._meshes = [];
            this.drawMode = this._gl.TRIANGLES;
            this._defaultShader = Scene.createShaderProgram(this._gl);
            this._uniforms = {
                'uloc_ambientLight': [0.3, 0.3, 0.3],
                'uloc_directionalLight': [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)],
                'uloc_directionalLightColor': [1, 1, 1],
            };
        }
        //
        // Initialize a texture and load an image.
        // When the image finished loading copy it into the texture.
        //
        Scene.prototype.loadTexture = function (url, key) {
            var gl = this._gl;
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // Because images have to be download over the internet
            // they might take a moment until they are ready.
            // Until then put a single pixel in the texture so we can
            // use it immediately. When the image has finished downloading
            // we'll update the texture with the contents of the image.
            var level = 0;
            var internalFormat = gl.RGBA;
            var width = 1;
            var height = 1;
            var border = 0;
            var srcFormat = gl.RGBA;
            var srcType = gl.UNSIGNED_BYTE;
            var pixel = new Uint8Array([0, 0, 0, 0]); // transparent black
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
            var image = new Image();
            image.onload = function () {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
                // WebGL1 has different requirements for power of 2 images
                // vs non power of 2 images so check if the image is a
                // power of 2 in both dimensions.
                if (Scene.isPowerOf2(image.width) && Scene.isPowerOf2(image.height)) {
                    // Yes, it's a power of 2. Generate mips.
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else {
                    // No, it's not a power of 2. Turn off mips and set
                    // wrapping to clamp to edge
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
            };
            image.src = url;
            this._textures[key] = texture;
        };
        Scene.prototype.getTexture = function (key) {
            return this._textures[key];
        };
        Scene.isPowerOf2 = function (value) {
            return (value & (value - 1)) == 0;
        };
        /**
         * Resize a canvas to match the size its displayed.
         * @param {HTMLCanvasElement} canvas The canvas to resize.
         * @param {number} [multiplier] amount to multiply by.
         *    Pass in window.devicePixelRatio for native pixels.
         * @return {boolean} true if the canvas was resized.
         * @memberOf module:webgl-utils
         */
        Scene.prototype._resizeCanvasToDisplaySize = function (multiplier) {
            if (multiplier === void 0) { multiplier = 0; }
            var canvas = this._canvas;
            multiplier = multiplier || 1;
            var width = canvas.clientWidth * multiplier | 0;
            var height = canvas.clientHeight * multiplier | 0;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                return true;
            }
            return false;
        };
        Scene.createVertexShader = function (gl) {
            var vertCode = "\n\t\t\tattribute vec3 a_position;\n\t\t\tattribute vec3 a_normal;\n\t\t\tattribute vec2 a_uv;\n\n\t\t\tuniform mat4 u_Projection;\n\t\t\tuniform mat4 u_View;\n\t\t\tuniform mat4 u_Model;\n\t\t\tuniform mat4 u_NormalMatrix;\n\n            uniform vec3 u_fullyLit;\n\t\t\tuniform vec3 u_ambientLight;\n\t\t\tuniform vec3 u_directionalLight;\n\t\t\tuniform vec3 u_directionalLightColor;\n\n\t\t\tvarying highp vec2 v_TextureCoord;\n\t\t\tvarying highp vec3 v_Lighting;\n\n\t\t\tvoid main(void) {\n\t\t\t\t// Output tex coord to frag shader.\n\t\t\t\tv_TextureCoord = a_uv;\n\t\t\t\t\n\t\t\t\t// set position of vertex\n\t\t\t\tgl_Position = u_Projection * u_View * u_Model * vec4(a_position, 1.);\n\t\t\t\tgl_PointSize = 4.0;\n\n\t\t\t\t// Apply lighting effect\n\t\t\t\thighp vec4 transformedNormal = u_NormalMatrix * vec4(a_normal, 1.0);\n\t\t\t\thighp float directional = max(dot(transformedNormal.xyz, u_directionalLight), 0.0);\n\t\t\t\tv_Lighting = max(u_fullyLit, u_ambientLight + (u_directionalLightColor * directional));\n\t\t\t}";
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
        };
        Scene.createFragmentShader = function (gl) {
            var fragCode = "\n\t\t\tvarying highp vec2 v_TextureCoord;\n\t\t\tvarying highp vec3 v_Lighting;\n\n\t\t\tuniform sampler2D u_sampler;\n\n\t\t\tvoid main(void) {\n\t\t\t\thighp vec4 texelColor = texture2D(u_sampler, v_TextureCoord); //vec4(vColor.rgb, 1.);\n\t\t\t\tgl_FragColor = vec4(texelColor.rgb * v_Lighting * texelColor.a, texelColor.a);\n\t\t\t}";
            var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragShader, fragCode);
            gl.compileShader(fragShader);
            if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
                console.error('An error occurred compiling fragment shader: ' + gl.getShaderInfoLog(fragShader));
                gl.deleteShader(fragShader);
                return null;
            }
            return fragShader;
        };
        Scene.createShaderProgram = function (gl) {
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
            // gl.uniform3f(uloc_ambientLight, 0.3, 0.3, 0.3);
            // gl.uniform3f(uloc_directionalLight, 1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3));
            // gl.uniform3f(uloc_directionalLightColor, 1, 1, 1);
            return {
                uloc_Projection: uloc_Projection,
                uloc_View: uloc_View,
                uloc_Model: uloc_Model,
                uloc_Normal: uloc_Noraml,
                uloc_ambientLight: uloc_ambientLight,
                uloc_directionalLight: uloc_directionalLight,
                uloc_directionalLightColor: uloc_directionalLightColor,
                shaderProgram: shaderProgram
            };
        };
        Scene.prototype.createMesh = function (name, add) {
            if (add === void 0) { add = true; }
            var m = new Mesh_1.default(name, this._gl);
            m.shader = this._defaultShader;
            if (add)
                this.addMesh(m);
            return m;
        };
        Scene.prototype.addMesh = function (m) {
            if (this._meshes.indexOf(m) == -1)
                this._meshes.push(m);
            else
                console.log("mesh " + m.name + " already added to scene");
        };
        Scene.prototype.destroyMesh = function (m) {
            var index = this._meshes.indexOf(m);
            if (index != -1) {
                this._meshes.splice(index, 1);
            }
            m.deleteBuffers();
        };
        Scene.prototype.destroyAllMeshes = function () {
            for (var i = 0; i < this._meshes.length; i++) {
                this._meshes[i].deleteBuffers();
            }
            this._meshes = [];
        };
        Scene.prototype.drawScene = function (time) {
            if (time === void 0) { time = 0; }
            var dt = time - this._time_old;
            this._time_old = time;
            var gl = this._gl;
            this._resizeCanvasToDisplaySize();
            gl.clearDepth(1.0);
            gl.viewport(0.0, 0.0, this._canvas.clientWidth, this._canvas.clientHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            var u;
            for (var i = 0; i < this._meshes.length; i++) {
                var mesh = this._meshes[i];
                var shader = mesh.shader;
                u = this._uniforms['uloc_ambientLight'];
                gl.uniform3f(shader.uloc_ambientLight, u[0], u[1], u[2]);
                u = this._uniforms['uloc_directionalLight'];
                gl.uniform3f(shader.uloc_directionalLight, u[0], u[1], u[2]);
                u = this._uniforms['uloc_directionalLightColor'];
                gl.uniform3f(shader.uloc_directionalLightColor, u[0], u[1], u[2]);
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
        };
        return Scene;
    }());
    exports.default = Scene;
});
//# sourceMappingURL=Scene.js.map