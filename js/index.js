// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
define(["require", "exports", "./Mesh", "./Sphere", "./Matrix", "./Quad"], function (require, exports, Mesh_1, Sphere_1, Matrix_1, Quad_1) {
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
            this._textures = {};
        }
        App.prototype._setData = function () {
            var gl = this._gl;
            var q = new Quad_1.default(2, 2);
            var backdrop = new Mesh_1.default('backdrop');
            backdrop.isOpaque = true;
            backdrop.is2D = true;
            backdrop.shader = this._defaultShader;
            backdrop.vertices = q.getVertices();
            backdrop.normals = q.getNormals();
            backdrop.uvs = q.getUVs();
            backdrop.indices = q.getIndices();
            backdrop.texture = this._textures['stars'];
            backdrop.prepBuffers(gl);
            Matrix_1.default.scale(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
            Matrix_1.default.translate(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
            backdrop.updateNormalMatrix();
            var radius = 7.0;
            var sphere = new Sphere_1.default(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var earth = new Mesh_1.default('earth');
            earth.isOpaque = true;
            earth.shader = this._defaultShader;
            earth.vertices = sphere.getVertices();
            earth.normals = sphere.getNormals();
            earth.uvs = sphere.getUVs();
            earth.indices = sphere.getIndices();
            earth.prepBuffers(gl);
            earth.texture = this._textures['earth'];
            Matrix_1.default.rotateX(earth.modelMatrix, 270 * Math.PI / 180);
            Matrix_1.default.rotateY(earth.modelMatrix, 170 * Math.PI / 180);
            earth.updateNormalMatrix();
            var sphere2 = new Sphere_1.default(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var clouds = new Mesh_1.default('clouds');
            clouds.isOpaque = false;
            clouds.shader = this._defaultShader;
            clouds.vertices = sphere2.getVertices();
            clouds.normals = sphere2.getNormals();
            clouds.uvs = sphere2.getUVs();
            clouds.indices = sphere2.getIndices();
            clouds.prepBuffers(gl);
            clouds.texture = this._textures['clouds'];
            Matrix_1.default.rotateX(clouds.modelMatrix, 270 * Math.PI / 180);
            Matrix_1.default.rotateY(clouds.modelMatrix, 170 * Math.PI / 180);
            Matrix_1.default.translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
            clouds.updateNormalMatrix();
            return {
                meshes: [backdrop, earth, clouds]
            };
        };
        /**
         * Resize a canvas to match the size its displayed.
         * @param {HTMLCanvasElement} canvas The canvas to resize.
         * @param {number} [multiplier] amount to multiply by.
         *    Pass in window.devicePixelRatio for native pixels.
         * @return {boolean} true if the canvas was resized.
         * @memberOf module:webgl-utils
         */
        App.prototype._resizeCanvasToDisplaySize = function (multiplier) {
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
        App.prototype._animate = function (proj_matrix, view_matrix, ortho_matrix, meshes) {
            var _this = this;
            var gl = this._gl;
            var rotThetas = this._config.Rotation;
            var identity = Matrix_1.default.create();
            var time_old = 0;
            var zoomLevel_old = 0;
            var execAnimation = function (time) {
                var dt = time - time_old;
                time_old = time;
                _this._resizeCanvasToDisplaySize();
                if (Math.abs(_this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
                    view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + _this._config.ZoomLevel;
                    zoomLevel_old = _this._config.ZoomLevel;
                    console.log(_this._config.ZoomLevel);
                }
                gl.clearDepth(1.0);
                gl.viewport(0.0, 0.0, _this._canvas.clientWidth, _this._canvas.clientHeight);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                for (var i = 0; i < meshes.length; i++) {
                    var mesh = meshes[i];
                    // update mesh
                    if (mesh.name != 'backdrop') {
                        for (var axis in rotThetas) {
                            var theta = rotThetas[axis];
                            if (theta > 0.0 || theta < 0.0) {
                                Matrix_1.default["rotate" + axis](mesh.modelMatrix, dt * theta);
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
            };
            execAnimation(0);
        };
        App.prototype.Draw = function () {
            this._defaultShader = App.UseQuarternionShaderProgram(this._gl);
            var data = this._setData();
            var proj_matrix = Matrix_1.default.perspectiveProjection(45, this._canvas.width / this._canvas.height, 1, 100);
            var view_matrix = Matrix_1.default.create();
            var ortho_matrix = Matrix_1.default.orthoProjection(2, 2, 1000);
            this._animate(proj_matrix, view_matrix, ortho_matrix, data.meshes);
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
            this._setData();
            this._defaultShader = App.UseQuarternionShaderProgram(this._gl);
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
        App.prototype.loadTexture = function (url, key) {
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
            this._textures[key] = texture;
        };
        App.isPowerOf2 = function (value) {
            return (value & (value - 1)) == 0;
        };
        App.UseQuarternionVertShader = function (gl) {
            var vertCode = "\n\t\t\tattribute vec3 a_position;\n\t\t\tattribute vec3 a_normal;\n\t\t\tattribute vec2 a_uv;\n\n\t\t\tuniform mat4 u_Projection;\n\t\t\tuniform mat4 u_View;\n\t\t\tuniform mat4 u_Model;\n\t\t\tuniform mat4 u_NormalMatrix;\n\n\t\t\tuniform vec3 u_ambientLight;\n\t\t\tuniform vec3 u_directionalLight;\n\t\t\tuniform vec3 u_directionalLightColor;\n\n\t\t\tvarying highp vec2 v_TextureCoord;\n\t\t\tvarying highp vec3 v_Lighting;\n\n\t\t\tvoid main(void) {\n\t\t\t\t// Output tex coord to frag shader.\n\t\t\t\tv_TextureCoord = a_uv;\n\t\t\t\t\n\t\t\t\t// set position of vertex\n\t\t\t\tgl_Position = u_Projection * u_View * u_Model * vec4(a_position, 1.);\n\t\t\t\tgl_PointSize = 4.0;\n\n\t\t\t\t// Apply lighting effect\n\t\t\t\t// highp vec3 u_ambientLight = vec3(0.3, 0.3, 0.3);\n\t\t\t\t// highp vec3 u_directionalLightColor = vec3(1, 1, 1);\n\t\t\t\t// highp vec3 u_directionalLight = normalize(vec3(0.85, 0.8, 0.75));\n\t\t\t\thighp vec4 transformedNormal = u_NormalMatrix * vec4(a_normal, 1.0);\n\t\t\t\thighp float directional = max(dot(transformedNormal.xyz, u_directionalLight), 0.0);\n\t\t\t\tv_Lighting = u_ambientLight + (u_directionalLightColor * directional);\t\t\t\t\n\t\t\t}";
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
            var fragCode = "\n\t\t\tvarying highp vec2 v_TextureCoord;\n\t\t\tvarying highp vec3 v_Lighting;\n\n\t\t\tuniform sampler2D u_Sampler;\n\n\t\t\tvoid main(void) {\n\t\t\t\thighp vec4 texelColor = texture2D(u_Sampler, v_TextureCoord); //vec4(vColor.rgb, 1.);\n\t\t\t\tgl_FragColor = vec4(texelColor.rgb * v_Lighting * texelColor.a, texelColor.a);\n\t\t\t}";
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
        };
        return App;
    }());
    function showRangeValue(prepend, sliderId, inputId) {
        document.getElementById(inputId).value = prepend + document.getElementById(sliderId).value;
    }
    function startApp() {
        var app = new App(document.getElementById('canvas'));
        app.loadTexture('./img/stars.png', 'stars');
        app.loadTexture('./img/earth.png', 'earth');
        app.loadTexture('./img/clouds.png', 'clouds');
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
        sliderX.addEventListener('input', function () {
            app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value));
            showRangeValue('X:', 'sliderX', 'sliderInputX');
        });
        sliderY.addEventListener('input', function () {
            app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value));
            showRangeValue('Y:', 'sliderY', 'sliderInputY');
        });
        sliderZ.addEventListener('input', function () {
            app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value));
            showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
        });
        sliderZoom.addEventListener('input', function () {
            app.SetZoom(parseFloat(sliderZoom.value));
            showRangeValue('', 'sliderZoom', 'sliderInputZoom');
        });
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