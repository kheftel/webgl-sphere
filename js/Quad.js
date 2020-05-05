define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Quad = /** @class */ (function () {
        function Quad(width, height) {
            this._width = width;
            this._height = height;
            this._calculateGeometry();
        }
        Quad.prototype.getVertices = function () {
            return this.Points.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        };
        Quad.prototype.getNormals = function () {
            return this.Normals.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        };
        Quad.prototype.getUVs = function () {
            return this.TextureCoords.reduce(function (a, b, i) { return i === 1 ? [a.u, a.v, b.u, b.v] : a.concat([b.u, b.v]); });
        };
        Quad.prototype.getIndices = function () {
            return this.TriangleIndices;
        };
        Quad.prototype._calculateGeometry = function () {
            this.Points = [];
            this.Normals = [];
            this.TextureCoords = [];
            this.TriangleIndices = [];
            this._addVertex(-this._width / 2, this._height / 2, 0);
            this._addVertex(this._width / 2, this._height / 2, 0);
            this._addVertex(-this._width / 2, -this._height / 2, 0);
            this._addVertex(this._width / 2, -this._height / 2, 0);
            this._addNormal(0, 0, 1);
            this._addNormal(0, 0, 1);
            this._addNormal(0, 0, 1);
            this._addNormal(0, 0, 1);
            this._addTextureCoord(0, 0);
            this._addTextureCoord(0, 1);
            this._addTextureCoord(1, 0);
            this._addTextureCoord(1, 1);
            this._addFace(0, 1, 2);
            this._addFace(2, 1, 3);
        };
        Quad.prototype._addVertex = function (x, y, z) {
            // var length = Math.sqrt(x * x + y * y + z * z);
            // x /= length;
            // y /= length;
            // z /= length;
            this.Points.push({
                x: x,
                y: y,
                z: z,
            });
        };
        Quad.prototype._addNormal = function (x, y, z) {
            // var length = Math.sqrt(x * x + y * y + z * z);
            // x /= length;
            // y /= length;
            // z /= length;
            this.Normals.push({
                x: x,
                y: y,
                z: z,
            });
        };
        Quad.prototype._addTextureCoord = function (u, v) {
            this.TextureCoords.push({
                u: u,
                v: v,
            });
        };
        Quad.prototype._addFace = function (x, y, z) {
            this.TriangleIndices.push(x);
            this.TriangleIndices.push(y);
            this.TriangleIndices.push(z);
        };
        return Quad;
    }());
    exports.default = Quad;
});
//# sourceMappingURL=Quad.js.map