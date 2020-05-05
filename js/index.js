// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
define(["require", "exports", "./Mesh", "./Sphere", "./Matrix"], function (require, exports, Mesh_1, Sphere_1, Matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var App = /** @class */ (function () {
        function App(canvas) {
            this._qualityData = [
                { sectors: 10, stacks: 5 },
                { sectors: 18, stacks: 9 },
                { sectors: 36, stacks: 18 },
                { sectors: 72, stacks: 36 },
            ];
            this._canvas = canvas;
            this._gl = canvas.getContext('webgl');
            this._gl.viewport(0, 0, canvas.width, canvas.height);
            this._canvas.setAttribute('width', this._canvas.clientWidth.toString());
            this._canvas.setAttribute('height', this._canvas.clientHeight.toString());
            this._config =
                {
                    DrawMode: this._gl.TRIANGLES,
                    Quality: 3,
                    ZoomLevel: -15,
                    Rotation: {
                        X: 0.0000,
                        Y: 0.0001,
                        Z: 0
                    }
                };
            this._textures = [];
        }
        App.prototype._setData = function () {
            var gl = this._gl;
            var radius = 7.0;
            var sphere = new Sphere_1.default(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var earth = new Mesh_1.default();
            earth.vertices = sphere.getVertices();
            earth.normals = sphere.getNormals();
            earth.uvs = sphere.getUVs();
            earth.indices = sphere.getIndices();
            earth.prepBuffers(gl);
            earth.texture = this._textures[0];
            Matrix_1.default.rotateX(earth.modelMatrix, 3 * Math.PI / 2);
            Matrix_1.default.rotateY(earth.modelMatrix, Math.PI);
            earth.updateNormalMatrix();
            var sphere2 = new Sphere_1.default(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var clouds = new Mesh_1.default();
            clouds.vertices = sphere2.getVertices();
            clouds.normals = sphere2.getNormals();
            clouds.uvs = sphere2.getUVs();
            clouds.indices = sphere2.getIndices();
            clouds.prepBuffers(gl);
            clouds.texture = this._textures[1];
            Matrix_1.default.rotateX(clouds.modelMatrix, 3 * Math.PI / 2);
            Matrix_1.default.rotateY(clouds.modelMatrix, Math.PI);
            Matrix_1.default.translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
            clouds.updateNormalMatrix();
            return {
                meshes: [earth, clouds]
            };
        };
        App.prototype._animate = function (proj_matrix, view_matrix, meshes) {
            var _this = this;
            var gl = this._gl;
            var rotThetas = this._config.Rotation;
            var time_old = 0;
            var zoomLevel_old = 0;
            var execAnimation = function (time) {
                var dt = time - time_old;
                time_old = time;
                if (Math.abs(_this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
                    view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + _this._config.ZoomLevel;
                    zoomLevel_old = _this._config.ZoomLevel;
                    console.log(_this._config.ZoomLevel);
                }
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
                gl.clearDepth(1.0);
                gl.viewport(0.0, 0.0, _this._canvas.width, _this._canvas.height);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.uniformMatrix4fv(_this._shader.Pmatrix, false, proj_matrix);
                gl.uniformMatrix4fv(_this._shader.Vmatrix, false, view_matrix);
                for (var i = 0; i < meshes.length; i++) {
                    var mesh = meshes[i];
                    for (var axis in rotThetas) {
                        var theta = rotThetas[axis];
                        if (theta > 0.0 || theta < 0.0) {
                            Matrix_1.default["rotate" + axis](mesh.modelMatrix, dt * theta);
                        }
                    }
                    mesh.updateNormalMatrix();
                    gl.uniformMatrix4fv(_this._shader.Mmatrix, false, mesh.modelMatrix);
                    gl.uniformMatrix4fv(_this._shader.NormalMatrix, false, mesh.normalMatrix);
                    var shaderProgram = _this._shader.ShaderProgram;
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
                    gl.uniform1i(gl.getUniformLocation(_this._shader.ShaderProgram, 'uSampler'), 0);
                    // use mesh's index buffer
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    // draw mesh
                    gl.drawElements(_this._config.DrawMode, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
                }
                window.requestAnimationFrame(execAnimation);
            };
            execAnimation(0);
        };
        App.prototype.Draw = function () {
            var data = this._setData();
            this._shader = App.UseQuarternionShaderProgram(this._gl);
            var proj_matrix = Matrix_1.default.GetProjection(45, this._canvas.width / this._canvas.height, 1, 100);
            var view_matrix = Matrix_1.default.create();
            // var mov_matrix = Matrix.Create();
            // Matrix.RotateX(mov_matrix, 3 * Math.PI / 2);
            // Matrix.RotateY(mov_matrix, Math.PI);
            // var normal_matrix = Matrix.Create();
            // Matrix.Invert(normal_matrix, mov_matrix);
            // Matrix.Transpose(normal_matrix, normal_matrix);
            this._animate(proj_matrix, view_matrix, data.meshes);
        };
        App.prototype.SetDrawMode = function (value) {
            var modeValue = this._gl[value];
            if (modeValue === undefined && typeof modeValue !== 'number')
                throw new Error("Invalid mode value '" + value + "'");
            this._config.DrawMode = modeValue;
        };
        App.prototype.SetQuality = function (value) {
            var intValue = parseInt(value, 10);
            if (isNaN(intValue))
                throw new Error("Quality value must be a number.");
            this._config.Quality = intValue;
            var buffers = this._setData();
            this._shader = App.UseQuarternionShaderProgram(this._gl);
        };
        App.prototype.GetRotation = function (axis) {
            return this._config.Rotation[axis];
        };
        App.prototype.SetRotation = function (axis, value) {
            if (this._config.Rotation[axis] === undefined)
                throw new Error("Invalid axis '" + axis + "'");
            if (isNaN(value) || typeof value !== 'number')
                throw new Error("Rotation value must be a number.");
            this._config.Rotation[axis] = value;
        };
        App.prototype.GetZoom = function () {
            return this._config.ZoomLevel;
        };
        App.prototype.SetZoom = function (value) {
            if (isNaN(value) || typeof value !== 'number')
                throw new Error("Zoom value must be a number.");
            this._config.ZoomLevel = value;
        };
        //
        // Initialize a texture and load an image.
        // When the image finished loading copy it into the texture.
        //
        App.prototype.loadTexture = function (url, index) {
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
                if (App.isPowerOf2(image.width) && App.isPowerOf2(image.height)) {
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
            this._textures[index] = texture;
        };
        App.isPowerOf2 = function (value) {
            return (value & (value - 1)) == 0;
        };
        App.UseQuarternionVertShader = function (gl) {
            var vertCode = "\n\t\t\tattribute vec3 position;\n\t\t\tattribute vec3 normal;\n\t\t\tattribute vec2 uv;\n\n\t\t\tattribute highp vec3 aVertexNormal;\n\t\t\t\n\t\t\tuniform mat4 Pmatrix;\n\t\t\tuniform mat4 Vmatrix;\n\t\t\tuniform mat4 Mmatrix;\n\t\t\tuniform mat4 NormalMatrix;\n\n\t\t\tvarying vec3 vLightWeighting;\n\t\t\t\n\t\t\tuniform vec3 uAmbientColor;\n\t\t\tuniform vec3 uPointLightingLocation;\n\t\t\tuniform vec3 uPointLightingColor;\n\n\t\t\tvarying highp vec2 vTextureCoord;\n\t\t\tvarying highp vec3 vLighting;\n\n\t\t\tvoid main(void) {\n\t\t\t\t// Output tex coord to frag shader.\n\t\t\t\tvTextureCoord = uv;\n\t\t\t\t\n\t\t\t\t// set position of vertex\n\t\t\t\tgl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);\n\t\t\t\tgl_PointSize = 4.0;\n\n\t\t\t\t// Apply lighting effect\n\t\t\t\thighp vec3 ambientLight = vec3(0.3, 0.3, 0.3);\n\t\t\t\thighp vec3 directionalLightColor = vec3(1, 1, 1);\n\t\t\t\thighp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));\n\t\t\t\t// highp vec3 directionalVector = normalize(vec3(0, 0, -1));\n\t\t\t\thighp vec4 transformedNormal = NormalMatrix * vec4(normal, 1.0);\n\t\t\t\thighp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);\n\t\t\t\tvLighting = ambientLight + (directionalLightColor * directional);\t\t\t\t\n\n\t\t\t\t// vec3 lightDirection = normalize(uPointLightingLocation - mvPosition.xyz);\n\t\t\t\t// vec3 transformedNormal = vec3(Vmatrix) * aVertexNormal;\n\t\t\t\t// float directionalLightWeighting = max(dot(transformedNormal, lightDirection), 0.0);\n\t\t\t\t// vLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;\n\t\t\t}";
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
        App.UseVariableFragShader = function (gl) {
            var fragCode = "\n\t\t\tvarying highp vec2 vTextureCoord;\n\t\t\tvarying highp vec3 vLighting;\n\n\t\t\tuniform sampler2D uSampler;\n\n\t\t\tvoid main(void) {\n\t\t\t\thighp vec4 texelColor = texture2D(uSampler, vTextureCoord); //vec4(vColor.rgb, 1.);\n\t\t\t\tgl_FragColor = vec4(texelColor.rgb * vLighting * texelColor.a, texelColor.a);\n\t\t\t}";
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
        App.UseQuarternionShaderProgram = function (gl) {
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
        };
        return App;
    }());
    function showRangeValue(prepend, sliderId, inputId) {
        document.getElementById(inputId).value = prepend + document.getElementById(sliderId).value;
    }
    function startApp() {
        var app = new App(document.getElementById('canvas'));
        app.loadTexture('./img/earth.png', 0);
        app.loadTexture('./img/clouds.png', 1);
        var drawMode = document.getElementById('drawMode');
        drawMode.addEventListener('change', function (e) { return app.SetDrawMode(drawMode.options[drawMode.selectedIndex].value); });
        var quality = document.getElementById('quality');
        quality.addEventListener('change', function (e) { return app.SetQuality(quality.options[quality.selectedIndex].value); });
        var sliderX = document.getElementById('sliderX');
        var sliderY = document.getElementById('sliderY');
        var sliderZ = document.getElementById('sliderZ');
        var sliderZoom = document.getElementById('sliderZoom');
        sliderX.value = app.GetRotation('X').toString();
        sliderY.value = app.GetRotation('Y').toString();
        sliderZ.value = app.GetRotation('Z').toString();
        sliderZoom.value = app.GetZoom().toString();
        sliderX.addEventListener('input', function () { return app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value)); });
        sliderY.addEventListener('input', function () { return app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value)); });
        sliderZ.addEventListener('input', function () { return app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value)); });
        sliderZoom.addEventListener('input', function () { return app.SetZoom(parseFloat(sliderZoom.value)); });
        showRangeValue('X:', 'sliderX', 'sliderInputX');
        showRangeValue('Y:', 'sliderY', 'sliderInputY');
        showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
        showRangeValue('', 'sliderZoom', 'sliderInputZoom');
        app.Draw();
    }
    (function () {
        startApp();
    })();
});
//# sourceMappingURL=index.js.map