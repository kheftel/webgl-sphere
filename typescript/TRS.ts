import m4 from "./m4";

export default class TRS {
    public translation: number[];
    public rotation: number[];
    public scale: number[];

    constructor() {
        this.translation = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];

    }

    public getMatrix(dst?: Float32Array) {
        dst = dst || new Float32Array(16);
        var t = this.translation;
        var r = this.rotation;
        var s = this.scale;
        m4.translation(t[0], t[1], t[2], dst);
        m4.xRotate(dst, r[0], dst);
        m4.yRotate(dst, r[1], dst);
        m4.zRotate(dst, r[2], dst);
        m4.scale(dst, s[0], s[1], s[2], dst);
        return dst;
    }
}
