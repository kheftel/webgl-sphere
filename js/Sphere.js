define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Sphere = /** @class */ (function () {
        function Sphere(radius, sectors, stacks) {
            if (radius === void 0) { radius = 1; }
            if (sectors === void 0) { sectors = 36; }
            if (stacks === void 0) { stacks = 18; }
            this._radius = radius;
            this._sectorCount = sectors;
            this._stackCount = stacks;
            this._calculateGeometry();
        }
        Sphere.prototype.getVertices = function () {
            return this.Points.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        };
        Sphere.prototype.getNormals = function () {
            return this.Normals.reduce(function (a, b, i) { return i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : a.concat([b.x, b.y, b.z]); });
        };
        Sphere.prototype.getUVs = function () {
            return this.TextureCoords.reduce(function (a, b, i) { return i === 1 ? [a.u, a.v, b.u, b.v] : a.concat([b.u, b.v]); });
        };
        Sphere.prototype.getIndices = function () {
            return this.TriangleIndices;
        };
        Sphere.prototype._calculateGeometry = function () {
            this.Points = [];
            this.Normals = [];
            this.TextureCoords = [];
            this.TriangleIndices = [];
            ///////////////////////////////////////////////////////////////////////////////
            // build vertices of sphere with smooth shading using parametric equation
            // x = r * cos(u) * cos(v)
            // y = r * cos(u) * sin(v)
            // z = r * sin(u)
            // where u: stack(latitude) angle (-90 <= u <= 90)
            //       v: sector(longitude) angle (0 <= v <= 360)
            ///////////////////////////////////////////////////////////////////////////////
            var radius = this._radius;
            var sectorCount = this._sectorCount;
            var stackCount = this._stackCount;
            var x, y, z, xy; // vertex position
            var nx, ny, nz, lengthInv = 1.0 / radius; // normal
            var s, t; // texCoord
            var sectorStep = 2 * Math.PI / sectorCount;
            var stackStep = Math.PI / stackCount;
            var sectorAngle, stackAngle;
            for (var i = 0; i <= stackCount; ++i) {
                stackAngle = Math.PI / 2 - i * stackStep; // starting from pi/2 to -pi/2
                xy = radius * Math.cos(stackAngle); // r * cos(u)
                z = radius * Math.sin(stackAngle); // r * sin(u)
                // add (sectorCount+1) vertices per stack
                // the first and last vertices have same position and normal, but different tex coords
                for (var j = 0; j <= sectorCount; ++j) {
                    sectorAngle = j * sectorStep; // starting from 0 to 2pi
                    // vertex position
                    x = xy * Math.cos(sectorAngle); // r * cos(u) * cos(v)
                    y = xy * Math.sin(sectorAngle); // r * cos(u) * sin(v)
                    this._addVertex(x, y, z);
                    // normalized vertex normal
                    nx = x * lengthInv;
                    ny = y * lengthInv;
                    nz = z * lengthInv;
                    this._addNormal(nx, ny, nz);
                    // vertex tex coord between [0, 1]
                    s = j / sectorCount;
                    t = i / stackCount;
                    this._addTextureCoord(s, t);
                }
            }
            // indices
            //  k1--k1+1
            //  |  / |
            //  | /  |
            //  k2--k2+1
            var k1, k2;
            for (i = 0; i < stackCount; ++i) {
                k1 = i * (sectorCount + 1); // beginning of current stack
                k2 = k1 + sectorCount + 1; // beginning of next stack
                for (j = 0; j < sectorCount; ++j, ++k1, ++k2) {
                    // 2 triangles per sector excluding 1st and last stacks
                    if (i != 0) {
                        this._addFace(k1, k2, k1 + 1); // k1---k2---k1+1
                    }
                    if (i != (stackCount - 1)) {
                        this._addFace(k1 + 1, k2, k2 + 1); // k1+1---k2---k2+1
                    }
                    // // vertical lines for all stacks
                    // lineIndices.push_back(k1);
                    // lineIndices.push_back(k2);
                    // if (i != 0)  // horizontal lines except 1st stack
                    // {
                    // 	lineIndices.push_back(k1);
                    // 	lineIndices.push_back(k1 + 1);
                    // }
                }
            }
        };
        Sphere.prototype._addVertex = function (x, y, z) {
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
        Sphere.prototype._addNormal = function (x, y, z) {
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
        Sphere.prototype._addTextureCoord = function (u, v) {
            this.TextureCoords.push({
                u: u,
                v: v,
            });
        };
        Sphere.prototype._addFace = function (x, y, z) {
            this.TriangleIndices.push(x);
            this.TriangleIndices.push(y);
            this.TriangleIndices.push(z);
        };
        return Sphere;
    }());
    exports.default = Sphere;
});
//# sourceMappingURL=Sphere.js.map