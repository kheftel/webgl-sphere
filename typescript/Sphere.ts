export default class Sphere {
	public Points: { x: number; y: number; z: number }[];
	public Normals: { x: number, y: number, z: number }[];
	public TextureCoords: { u: number, v: number }[];
	public TriangleIndices: number[];

	private _radius: number;
	private _sectorCount: number;
	private _stackCount: number;

	constructor(radius = 1, sectors = 36, stacks = 18) {
		this._radius = radius;
		this._sectorCount = sectors;
		this._stackCount = stacks;
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

		var x, y, z, xy;                              // vertex position
		var nx, ny, nz, lengthInv = 1.0 / radius;    // normal
		var s, t;                                     // texCoord

		var sectorStep = 2 * Math.PI / sectorCount;
		var stackStep = Math.PI / stackCount;
		var sectorAngle, stackAngle;

		for (var i = 0; i <= stackCount; ++i) {
			stackAngle = Math.PI / 2 - i * stackStep;        // starting from pi/2 to -pi/2
			xy = radius * Math.cos(stackAngle);             // r * cos(u)
			z = radius * Math.sin(stackAngle);              // r * sin(u)

			// add (sectorCount+1) vertices per stack
			// the first and last vertices have same position and normal, but different tex coords
			for (var j = 0; j <= sectorCount; ++j) {
				sectorAngle = j * sectorStep;           // starting from 0 to 2pi

				// vertex position
				x = xy * Math.cos(sectorAngle);             // r * cos(u) * cos(v)
				y = xy * Math.sin(sectorAngle);             // r * cos(u) * sin(v)
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
			k1 = i * (sectorCount + 1);     // beginning of current stack
			k2 = k1 + sectorCount + 1;      // beginning of next stack

			for (j = 0; j < sectorCount; ++j, ++k1, ++k2) {
				// 2 triangles per sector excluding 1st and last stacks
				if (i != 0) {
					this._addFace(k1, k2, k1 + 1);   // k1---k2---k1+1
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