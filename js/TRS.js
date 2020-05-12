define(["require", "exports", "./m4"], function (require, exports, m4_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TRS = /** @class */ (function () {
        function TRS() {
            this.translation = [0, 0, 0];
            this.rotation = [0, 0, 0];
            this.scale = [1, 1, 1];
        }
        TRS.prototype.getMatrix = function (dst) {
            dst = dst || new Float32Array(16);
            var t = this.translation;
            var r = this.rotation;
            var s = this.scale;
            m4_1.default.translation(t[0], t[1], t[2], dst);
            m4_1.default.xRotate(dst, r[0], dst);
            m4_1.default.yRotate(dst, r[1], dst);
            m4_1.default.zRotate(dst, r[2], dst);
            m4_1.default.scale(dst, s[0], s[1], s[2], dst);
            return dst;
        };
        return TRS;
    }());
    exports.default = TRS;
});
//# sourceMappingURL=TRS.js.map