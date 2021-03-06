define(["require", "exports", "./TRS", "./m4"], function (require, exports, TRS_1, m4_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Mesh = /** @class */ (function () {
        function Mesh(name, gl) {
            this.gl = gl;
            this.name = name;
            this.modelMatrix = m4_1.default.identity();
            this.normalMatrix = m4_1.default.identity();
            this.is2D = false;
            this.isFullyLit = false;
            this.transform = new TRS_1.default();
            this.isVisible = true;
        }
        Mesh.prototype.prepBuffers = function () {
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
            this.uloc_sampler = gl.getUniformLocation(this.shader.shaderProgram, 'u_sampler');
            this.uloc_fullyLit = gl.getUniformLocation(this.shader.shaderProgram, 'u_fullyLit');
        };
        Mesh.prototype.deleteBuffers = function () {
            var gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.deleteBuffer(this.vertexBuffer);
            gl.deleteBuffer(this.normalBuffer);
            gl.deleteBuffer(this.uvBuffer);
            gl.deleteBuffer(this.indexBuffer);
        };
        // public updateWorldMatrix(parentWorldMatrix?: Float32Array) {
        //     var transform = this.transform;
        //     if (transform) {
        //         transform.getMatrix(this.localMatrix);
        //     }
        //     if (parentWorldMatrix) {
        //         // a matrix was passed in so do the math
        //         m4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
        //     } else {
        //         // no matrix was passed in so just copy local to world
        //         m4.copy(this.localMatrix, this.worldMatrix);
        //     }
        //     // now process all the children
        //     var worldMatrix = this.worldMatrix;
        //     this.children.forEach(function (child) {
        //         child.updateWorldMatrix(worldMatrix);
        //     });
        // }
        // public setParent(parent: Mesh) {
        //     // remove us from our parent
        //     if (this.parent) {
        //         var ndx = this.parent.children.indexOf(this);
        //         if (ndx >= 0) {
        //             this.parent.children.splice(ndx, 1);
        //         }
        //     }
        //     // Add us to our new parent
        //     if (parent) {
        //         parent.children.push(this);
        //     }
        //     this.parent = parent;
        // };
        Mesh.prototype.beforeDraw = function () {
            var gl = this.gl;
            this.updateTransform();
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
            if (this.isFullyLit) {
                gl.uniform3f(this.uloc_fullyLit, 1, 1, 1);
            }
            else {
                gl.uniform3f(this.uloc_fullyLit, 0, 0, 0);
            }
            // set blend mode
            if (this.isOpaque) {
                gl.disable(gl.BLEND);
            }
            else {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            }
        };
        Mesh.prototype.draw = function (mode) {
            if (mode === void 0) { mode = null; }
            var gl = this.gl;
            if (mode === null)
                mode = gl.TRIANGLES;
            gl.drawElements(mode, this.indices.length, gl.UNSIGNED_SHORT, 0);
        };
        Mesh.prototype.updateTransform = function () {
            // copy transforms into model matrix
            this.transform.getMatrix(this.modelMatrix);
            // NOTE: not all of the m4 operations are safe to pass self as dst.....
            // recompute normal matrix
            this.normalMatrix = m4_1.default.inverse(this.modelMatrix);
            this.normalMatrix = m4_1.default.transpose(this.normalMatrix);
            // Matrix.invert(this.normalMatrix, this.modelMatrix);
            // Matrix.transpose(this.normalMatrix, this.normalMatrix);
        };
        return Mesh;
    }());
    exports.default = Mesh;
});
//# sourceMappingURL=Mesh.js.map