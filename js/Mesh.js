define(["require", "exports", "./Matrix"], function (require, exports, Matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Mesh = /** @class */ (function () {
        function Mesh(name) {
            this.name = name;
            this.modelMatrix = Matrix_1.default.create();
            this.normalMatrix = Matrix_1.default.create();
            this.is2D = false;
        }
        Mesh.prototype.prepBuffers = function (gl) {
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
        };
        Mesh.prototype.beforeDraw = function (gl) {
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
        };
        Mesh.prototype.draw = function (gl) {
            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
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