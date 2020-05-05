define(["require", "exports", "./Matrix"], function (require, exports, Matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Mesh = /** @class */ (function () {
        function Mesh() {
            this.modelMatrix = Matrix_1.default.create();
            this.normalMatrix = Matrix_1.default.create();
        }
        Mesh.prototype.prepBuffers = function (gl) {
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
        };
        Mesh.prototype.updateNormalMatrix = function () {
            Matrix_1.default.invert(this.normalMatrix, this.modelMatrix);
            Matrix_1.default.transpose(this.normalMatrix, this.normalMatrix);
        };
        return Mesh;
    }());
    exports.default = Mesh;
});
//# sourceMappingURL=Mesh.js.map