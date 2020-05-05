export default class Quad {
	public Points: { x: number; y: number; z: number }[];
	public Normals: { x: number, y: number, z: number }[];
	public TextureCoords: { u: number, v: number }[];
	public TriangleIndices: number[];

	private _width: number;
	private _height: number;

	constructor(width:number, height:number) {
		this._width = width;
		this._height = height;
		this._calculateGeometry();
	}

	public getVertices() {
		return <number[]><any>this.Points.reduce((a, b, i) => i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : (<any>a).concat([b.x, b.y, b.z]));
	}

	public getNormals() {
		return <number[]><any>this.Normals.reduce((a, b, i) => i === 1 ? [a.x, a.y, a.z, b.x, b.y, b.z] : (<any>a).concat([b.x, b.y, b.z]));
	}

	public getUVs() {
		return <number[]><any>this.TextureCoords.reduce((a, b, i) => i === 1 ? [a.u, a.v, b.u, b.v] : (<any>a).concat([b.u, b.v]));
	}

	public getIndices() {
		return this.TriangleIndices;
	}

	private _calculateGeometry() {
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
	}

	private _addVertex(x: number, y: number, z: number) {
		// var length = Math.sqrt(x * x + y * y + z * z);
		// x /= length;
		// y /= length;
		// z /= length;
		this.Points.push({
			x: x,
			y: y,
			z: z,
		});
	}

	private _addNormal(x: number, y: number, z: number) {
		// var length = Math.sqrt(x * x + y * y + z * z);
		// x /= length;
		// y /= length;
		// z /= length;
		this.Normals.push({
			x: x,
			y: y,
			z: z,
		});
	}

	private _addTextureCoord(u: number, v: number) {
		this.TextureCoords.push({
			u: u,
			v: v,
		});
	}

	private _addFace(x: number, y: number, z: number) {
		this.TriangleIndices.push(x);
		this.TriangleIndices.push(y);
		this.TriangleIndices.push(z);
	}
}