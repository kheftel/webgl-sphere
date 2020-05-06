// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
define(["require", "exports", "./Sphere", "./Matrix", "./Quad", "./Scene"], function (require, exports, Sphere_1, Matrix_1, Quad_1, Scene_1) {
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
            this.scene = new Scene_1.default(canvas);
            this.canvas = canvas;
            var gl = this.scene._gl;
            this._config =
                {
                    DrawMode: gl.TRIANGLES,
                    Quality: 3,
                    ZoomLevel: -15,
                    Rotation: {
                        X: 0.0000,
                        Y: 0.0001,
                        Z: 0
                    }
                };
        }
        App.prototype._setData = function () {
            // remove all existing meshes
            this.scene.destroyAllMeshes();
            // create meshes for the scene
            var q = new Quad_1.default(2, 2);
            var backdrop = this.scene.createMesh('backdrop');
            backdrop.isOpaque = true;
            backdrop.is2D = true;
            backdrop.vertices = q.getVertices();
            backdrop.normals = q.getNormals();
            backdrop.uvs = q.getUVs();
            backdrop.indices = q.getIndices();
            backdrop.texture = this.scene.getTexture('stars');
            backdrop.isFullyLit = false;
            backdrop.prepBuffers();
            Matrix_1.default.scale(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
            Matrix_1.default.translate(backdrop.modelMatrix, backdrop.modelMatrix, [1, 1, 0]);
            backdrop.updateNormalMatrix();
            var radius = 7.0;
            var sphere = new Sphere_1.default(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var earth = this.scene.createMesh('earth');
            earth.isOpaque = true;
            earth.vertices = sphere.getVertices();
            earth.normals = sphere.getNormals();
            earth.uvs = sphere.getUVs();
            earth.indices = sphere.getIndices();
            earth.prepBuffers();
            earth.texture = this.scene.getTexture('earth');
            Matrix_1.default.rotateX(earth.modelMatrix, 270 * Math.PI / 180);
            Matrix_1.default.rotateY(earth.modelMatrix, 170 * Math.PI / 180);
            earth.updateNormalMatrix();
            var sphere2 = new Sphere_1.default(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
            var clouds = this.scene.createMesh('clouds');
            clouds.isOpaque = false;
            clouds.vertices = sphere2.getVertices();
            clouds.normals = sphere2.getNormals();
            clouds.uvs = sphere2.getUVs();
            clouds.indices = sphere2.getIndices();
            clouds.prepBuffers();
            clouds.texture = this.scene.getTexture('clouds');
            Matrix_1.default.rotateX(clouds.modelMatrix, 270 * Math.PI / 180);
            Matrix_1.default.rotateY(clouds.modelMatrix, 170 * Math.PI / 180);
            Matrix_1.default.translate(clouds.modelMatrix, clouds.modelMatrix, [0, 0, 0]);
            clouds.updateNormalMatrix();
            return {
                meshes: [backdrop, earth, clouds]
            };
        };
        App.prototype._animate = function () {
            var _this = this;
            var rotThetas = this._config.Rotation;
            var view_matrix = this.scene.viewMatrix;
            var time_old = 0;
            var zoomLevel_old = 0;
            var execAnimation = function (time) {
                var dt = time - time_old;
                time_old = time;
                // adjust zoom level
                if (Math.abs(_this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
                    view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + _this._config.ZoomLevel;
                    zoomLevel_old = _this._config.ZoomLevel;
                    console.log(_this._config.ZoomLevel);
                }
                // update mesh
                _this.scene._meshes.forEach(function (mesh) {
                    if (mesh.name != 'backdrop') {
                        for (var axis in rotThetas) {
                            var theta = rotThetas[axis];
                            if (theta > 0.0 || theta < 0.0) {
                                Matrix_1.default["rotate" + axis](mesh.modelMatrix, dt * theta);
                            }
                        }
                    }
                });
                _this.scene.drawScene(time);
                window.requestAnimationFrame(execAnimation);
            };
            execAnimation(0);
        };
        App.prototype.Draw = function () {
            var data = this._setData();
            this._animate();
        };
        App.prototype.SetDrawMode = function (value) {
            var modeValue = this.scene._gl[value];
            if (modeValue === undefined && typeof modeValue !== 'number')
                throw new Error("Invalid mode value '" + value + "'");
            this._config.DrawMode = this.scene.drawMode = modeValue;
            console.log(this.scene.drawMode);
        };
        App.prototype.SetQuality = function (value) {
            var intValue = parseInt(value, 10);
            if (isNaN(intValue))
                throw new Error("Quality value must be a number.");
            this._config.Quality = intValue;
            this._setData();
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
        return App;
    }());
    function showRangeValue(prepend, sliderId, inputId) {
        document.getElementById(inputId).value = prepend + document.getElementById(sliderId).value;
    }
    function startApp() {
        var app = new App(document.getElementById('canvas'));
        var scene = app.scene;
        scene.loadTexture('./img/stars.png', 'stars');
        scene.loadTexture('./img/earth.png', 'earth');
        scene.loadTexture('./img/clouds.png', 'clouds');
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