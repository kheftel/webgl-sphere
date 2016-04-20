// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm
interface IShaderProgram
{
	Pmatrix: WebGLUniformLocation;
	Vmatrix: WebGLUniformLocation;
	Mmatrix: WebGLUniformLocation;
	ShaderProgram: WebGLProgram;
}

class App
{
	private _canvas: HTMLCanvasElement;
	private _ctx: WebGLRenderingContext;
	private _vertices: number[];
	private _indices: number[];
	private _colors: number[];
	private _shader: IShaderProgram;
	
	private _config:
	{
		DrawMode: number;
		Quality: number;
		
		Rotation:
		{
			[key: string]: number;
			X: number;
			Y: number;
			Z: number;
		}
	};
	
	private _definedColors =
	[
		//[.1, .1, .1, 1],    // white
		[.1, .0, .0, 1],    // red
		[.0, .1, .0, 1],    // green
		[.0, .0, .1, 1],    // blue
		//[.1, .1, .0, 1],    // yellow
		//[.1, .0, .1, 1]     // purple
	];

	constructor(canvas: HTMLCanvasElement)
	{
		this._canvas = canvas;
		this._ctx = <WebGLRenderingContext>canvas.getContext('webgl');
		this._ctx.viewport(0,0,canvas.width,canvas.height);
		
		this._config = 
		{
			DrawMode: this._ctx.TRIANGLES,
			Quality: 3,
			
			Rotation:
			{
				X: 0.0001,
				Y: 0.00005,
				Z: 0
			}
		};
	}
	
	private _setData()
	{
		var ctx = this._ctx;
		
		var icosahedron = new Icosahedron3D(this._config.Quality);
		this._vertices = <number[]><any>icosahedron.Points.reduce((a,b,i) => i === 1 ? [a.x,a.y,a.z,b.x,b.y,b.z] : (<any>a).concat([b.x,b.y,b.z]));
		this._indices = icosahedron.TriangleIndices;
		this._colors = this._generateColors(this._vertices);
			
		var vertex_buffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, vertex_buffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._vertices), ctx.STATIC_DRAW);
	  
		var color_buffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, color_buffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(this._colors), ctx.STATIC_DRAW);
		
		var index_buffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, index_buffer);
		ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), ctx.STATIC_DRAW);
		
		return {
			vertex : vertex_buffer,
			color  : color_buffer,
			index  : index_buffer
		};
	}
	
	private _generateColors(vertices: number[])
	{
		let colors:number[][] = [];
	
		for(let i = 0; i < vertices.length; i+=4)
		{
			colors[i] = this._definedColors[colors.length % this._definedColors.length];
		}

		return colors.reduce((a,b) => a.concat(b));	
	}
	
	private _animate(proj_matrix: Float32Array, view_matrix: Float32Array, mov_matrix: Float32Array)
	{
		const ctx = this._ctx;
		const rotThetas = this._config.Rotation;
		
		let time_old = 0;
		const execAnimation = (time: number) =>
		{
			var dt = time-time_old;
			
			for(var axis in rotThetas)
			{
				var theta = rotThetas[axis];
				if (theta > 0.0 || theta < 0.0)
				{
					(<any>Matrix)[`Rotate${axis}`](mov_matrix, dt * theta);
				}
			}
			
			time_old = time;

			ctx.enable(ctx.DEPTH_TEST);
			ctx.depthFunc(ctx.LEQUAL);
			ctx.clearColor(0.0, 0.333, 0.333, 1);
			ctx.clearDepth(1.0);
			ctx.viewport(0.0, 0.0, this._canvas.width, this._canvas.height);
			ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
			
			ctx.uniformMatrix4fv(this._shader.Pmatrix, false, proj_matrix);
			ctx.uniformMatrix4fv(this._shader.Vmatrix, false, view_matrix);
			ctx.uniformMatrix4fv(this._shader.Mmatrix, false, mov_matrix);
			
			ctx.drawElements(this._config.DrawMode, this._indices.length, ctx.UNSIGNED_SHORT, 0);
			
			window.requestAnimationFrame(execAnimation);
		}
		
		execAnimation(0);
	}

	public Draw()
	{
		var buffers = this._setData();

		this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers.vertex, buffers.color);

		var proj_matrix = new Float32Array(Matrix.GetProjection(40, this._canvas.width/this._canvas.height, 1, 100));
		var view_matrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
		var mov_matrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
		view_matrix[14] = view_matrix[14]-2;

		this._animate(proj_matrix, view_matrix, mov_matrix);
	}
	
	
	public SetDrawMode(value: string)
	{
		var modeValue = (<any>this._ctx)[value];
		if (modeValue === undefined && typeof modeValue !== 'number') throw new Error(`Invalid mode value '${value}'`);

		this._config.DrawMode = modeValue;
	}
	
	public SetQuality(value: string)
	{
		var intValue = parseInt(value, 10);
		if (isNaN(intValue)) throw new Error(`Quality value must be a number.`);

		this._config.Quality = intValue;
		
		var buffers = this._setData();
		this._shader = App.UseQuarternionShaderProgram(this._ctx, buffers.vertex, buffers.color);
	}
	
	public GetRotation(axis: string)
	{
		return this._config.Rotation[axis];
	}

	public SetRotation(axis: string, value: number)
	{
		if (this._config.Rotation[axis] === undefined) throw new Error(`Invalid axis '${axis}'`);
		if (isNaN(value) || typeof value !== 'number') throw new Error(`Rotation value must be a number.`);
		
		this._config.Rotation[axis] = value;
	}

	public static UseQuarternionVertShader(context: WebGLRenderingContext)
	{
		var vertCode = `
			attribute vec3 position;
			attribute highp vec3 aVertexNormal;
			uniform mat4 Pmatrix;
			uniform mat4 Vmatrix;
			uniform mat4 Mmatrix;

			attribute vec4 color;
			varying lowp vec4 vColor;

			varying highp vec2 vTextureCoord;
			varying highp vec3 vLighting;

			void main(void) {
				gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);
				gl_PointSize = 4.0;
				vColor = color;

				highp vec3 ambientLight = vec3(1.0, 1.0, 1.0);
				highp vec3 directionalLightColor = vec3(1.0, 1.0, 0);
				highp vec3 directionalVector = vec3(0.85, 0.75, 0.0);

				highp vec4 transformedNormal = Vmatrix * vec4(aVertexNormal, 1.0);
				highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
				vLighting = ambientLight + (directionalLightColor * directional);
			}`;
		
		var vertShader = context.createShader(context.VERTEX_SHADER);
		context.shaderSource(vertShader, vertCode);
		context.compileShader(vertShader);
		
		return vertShader;
	}

	public static UseVariableFragShader(context: WebGLRenderingContext)
	{
		var fragCode = `
			precision mediump float;
			varying lowp vec4 vColor;
			varying highp vec3 vLighting;
			uniform sampler2D uSampler;
			void main(void) {
				gl_FragColor = vec4(vColor.rgb * vLighting, 1.);
			}`;
		
		var fragShader = context.createShader(context.FRAGMENT_SHADER);
		context.shaderSource(fragShader, fragCode);
		context.compileShader(fragShader);
    
		return fragShader;
	}

	public static UseQuarternionShaderProgram(context: WebGLRenderingContext, vertex_buffer: WebGLBuffer, color_buffer: WebGLBuffer): IShaderProgram
	{
		var vertShader = App.UseQuarternionVertShader(context);
		var fragShader = App.UseVariableFragShader(context);
    
		var shaderProgram = context.createProgram();
		context.attachShader(shaderProgram, vertShader);
		context.attachShader(shaderProgram, fragShader);
		context.linkProgram(shaderProgram);
		
		var Pmatrix = context.getUniformLocation(shaderProgram, "Pmatrix");
		var Vmatrix = context.getUniformLocation(shaderProgram, "Vmatrix");
		var Mmatrix = context.getUniformLocation(shaderProgram, "Mmatrix");
		context.bindBuffer(context.ARRAY_BUFFER, vertex_buffer);
		
		var position = context.getAttribLocation(shaderProgram, "position");
		context.vertexAttribPointer(position, 3, context.FLOAT, false, 0, 0);
		context.enableVertexAttribArray(position);
		context.bindBuffer(context.ARRAY_BUFFER, color_buffer);
		
		var color = context.getAttribLocation(shaderProgram, "color");
		context.vertexAttribPointer(color, 3, context.FLOAT, false, 0, 0);
		context.enableVertexAttribArray(color);
		
		context.useProgram(shaderProgram);
    
		return {
			Pmatrix: Pmatrix,
			Vmatrix: Vmatrix,
			Mmatrix: Mmatrix,
			ShaderProgram: shaderProgram
		};
	}
}

class Matrix
{
	public static GetProjection(angle: number, a: number, zMin: number, zMax: number)
	{
		var ang = Math.tan((angle*.5)*Math.PI/180);
		return [
			0.5/ang, 0 , 0, 0,
			0, 0.5*a/ang, 0, 0,
			0, 0, -(zMax+zMin)/(zMax-zMin), -1,
			0, 0, (-2*zMax*zMin)/(zMax-zMin), 0
		];
	}
	
	public static RotateX(m: Float32Array, angle: number)
	{
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv1 = m[1], mv5 = m[5], mv9 = m[9];
				
		m[1] = m[1]*c-m[2]*s;
		m[5] = m[5]*c-m[6]*s;
		m[9] = m[9]*c-m[10]*s;

		m[2] = m[2]*c+mv1*s;
		m[6] = m[6]*c+mv5*s;
		m[10] = m[10]*c+mv9*s;
	}
	
	public static RotateY(m: Float32Array, angle: number)
	{
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv0 = m[0], mv4 = m[4], mv8 = m[8];
				
		m[0] = c*m[0]+s*m[2];
		m[4] = c*m[4]+s*m[6];
		m[8] = c*m[8]+s*m[10];

		m[2] = c*m[2]-s*mv0;
		m[6] = c*m[6]-s*mv4;
		m[10] = c*m[10]-s*mv8;
	}
	
	public static RotateZ(m: Float32Array, angle: number)
	{
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var mv0 = m[0], mv4 = m[4], mv8 = m[8]; 
				
		m[0] = c*m[0]-s*m[1];
		m[4] = c*m[4]-s*m[5];
		m[8] = c*m[8]-s*m[9];
		m[1] = c*m[1]+s*mv0;
		m[5] = c*m[5]+s*mv4;
		m[9] = c*m[9]+s*mv8;
	}
}

class Icosahedron3D
{
	public Points: {x: number; y: number; z: number}[];
	public TriangleIndices: number[];

	private _middlePointIndexCache: {[key: number]: number};
	private _quality: number;
	private _index: number;

	constructor(quality: number)
	{
		this._quality = quality;
		this._calculateGeometry();
	}

	private _calculateGeometry()
	{
		this.Points = [];
		this.TriangleIndices = [];
		this._middlePointIndexCache = {};
		this._index = 0;
    
		var t = (1.0 + Math.sqrt(5.0)) / 2.0;
    
		this._addVertex(-1, t, 0);
		this._addVertex(1, t, 0);
		this._addVertex(-1, -t, 0);
		this._addVertex(1, -t, 0);
    
		this._addVertex(0, -1, t);
		this._addVertex(0, 1, t);
		this._addVertex(0, -1, -t);
		this._addVertex(0, 1, -t);
    
		this._addVertex(t, 0, -1);
		this._addVertex(t, 0, 1);
		this._addVertex(-t, 0, -1);
		this._addVertex(-t, 0, 1);


		this._addFace(0, 11, 5);
		this._addFace(0, 5, 1);
		this._addFace(0, 1, 7);
		this._addFace(0, 7, 10);
		this._addFace(0, 10, 11);
    
		this._addFace(1, 5, 9);
		this._addFace(5, 11, 4);
		this._addFace(11, 10, 2);
		this._addFace(10, 7, 6);
		this._addFace(7, 1, 8);
    
		this._addFace(3, 9, 4);
		this._addFace(3, 4, 2);
		this._addFace(3, 2, 6);
		this._addFace(3, 6, 8);
		this._addFace(3, 8, 9);
    
		this._addFace(4, 9, 5);
		this._addFace(2, 4, 11);
		this._addFace(6, 2, 10);
		this._addFace(8, 6, 7);
		this._addFace(9, 8, 1);
    
		this._refineVertices();
	}

	private _addVertex(x: number, y: number, z: number)
	{
		var length = Math.sqrt(x * x + y * y + z * z);
		this.Points.push({
			x: x / length,
			y: y / length,
			z: z / length
		});
		return this._index++;
	}

	private _addFace(x: number, y: number, z: number)
	{
		this.TriangleIndices.push(x);
		this.TriangleIndices.push(y);
		this.TriangleIndices.push(z);
	}

	private _refineVertices()
	{
		for(var i = 0; i < this._quality; i++)
		{
			var faceCount = this.TriangleIndices.length;
			for(var face = 0; face < faceCount; face += 3)
			{
				var x1 = this.TriangleIndices[face];
				var y1 = this.TriangleIndices[face + 1];
				var z1 = this.TriangleIndices[face + 2];

				var x2 = this._getMiddlePoint(x1, y1);
				var y2 = this._getMiddlePoint(y1, z1);
				var z2 = this._getMiddlePoint(z1, x1);

				this._addFace(x1, x2, z2);
				this._addFace(y1, y2, x2);
				this._addFace(z1, z2, y2);
				this._addFace(x2, y2, z2);
			}
		}
	}

	private _getMiddlePoint(p1: number, p2: number)
	{
		var firstIsSmaller = p1 < p2;
		var smallerIndex = firstIsSmaller ? p1 : p2;
		var greaterIndex = firstIsSmaller ? p2 : p1;
		var key = (smallerIndex << 32) + greaterIndex;
    
		var p = this._middlePointIndexCache[key];
		if (p !== undefined) p;
    
		var point1 = this.Points[p1];
		var point2 = this.Points[p2];
		var middle = {
			x: (point1.x + point2.x) / 2.0,
			y: (point1.y + point2.y) / 2.0,
			z: (point1.z + point2.z) / 2.0,
		};
		
		var i = this._addVertex(middle.x, middle.y, middle.z);    
		this._middlePointIndexCache[key] = i;
		return i;
	}
}


function showRangeValue(prepend:string,sliderId:string,inputId:string)
{
	(<HTMLInputElement>document.getElementById(inputId)).value = prepend + (<HTMLInputElement>document.getElementById(sliderId)).value;
}

(() =>
{
	let app = new App(<HTMLCanvasElement>document.getElementById('canvas'));
	app.Draw();

	let drawMode = <HTMLSelectElement>document.getElementById('drawMode');
	drawMode.addEventListener('change', (e) => app.SetDrawMode((<HTMLOptionElement>drawMode.options[drawMode.selectedIndex]).value));

	let quality = <HTMLSelectElement>document.getElementById('quality');
	quality.addEventListener('change', (e) => app.SetQuality((<HTMLOptionElement>quality.options[quality.selectedIndex]).value));

	let sliderX = <HTMLInputElement>document.getElementById('sliderX');
	let sliderY = <HTMLInputElement>document.getElementById('sliderY');
	let sliderZ = <HTMLInputElement>document.getElementById('sliderZ');
	
	sliderX.value = app.GetRotation('X').toString();
	sliderY.value = app.GetRotation('Y').toString();
	sliderZ.value = app.GetRotation('Z').toString();
	
	sliderX.addEventListener('input', () => app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value)));
	sliderY.addEventListener('input', () => app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value)));
	sliderZ.addEventListener('input', () => app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value)));
	
	showRangeValue('X:', 'sliderX', 'sliderInputX');
	showRangeValue('Y:', 'sliderY', 'sliderInputY');
	showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
})();