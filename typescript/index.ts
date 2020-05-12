// Following http://www.tutorialspoint.com/webgl/webgl_modes_of_drawing.htm

import Mesh from "./Mesh";
import Sphere from "./Sphere";
import Matrix from "./Matrix";
import m4 from "./m4";
import IShaderProgram from "./IShaderProgram";
import Quad2D from "./Quad2D";
import Scene from "./Scene";

class App {
	public scene: Scene;
	public canvas: HTMLCanvasElement;

	private _config:
		{
			DrawMode: number;
			Quality: number;
			ZoomLevel: number;

			Rotation:
			{
				[key: string]: number;
				X: number;
				Y: number;
				Z: number;
			}
		};

	private _qualityData =
		[
			{ sectors: 10, stacks: 5 },
			{ sectors: 18, stacks: 9 },
			{ sectors: 36, stacks: 18 },
			{ sectors: 72, stacks: 36 },
		];

	constructor(canvas: HTMLCanvasElement, fovRad:number, zMin:number, zMax:number) {
		this.scene = new Scene(canvas, fovRad, zMin, zMax);
		this.canvas = canvas;
		var gl = this.scene._gl;

		this._config =
		{
			DrawMode: gl.TRIANGLES,
			Quality: 3,
			ZoomLevel: -15,

			Rotation:
			{
				X: 0.0000,
				Y: 0.0000,
				Z: 0.0001
			}
		};
	}

	private _setData() {
		// remove all existing meshes
		this.scene.destroyAllMeshes();

		// create meshes for the scene

		// cover the canvas no matter what, keep square
		// not quite centered, but it's ok
		var largeDimension = Math.max(this.scene.canvasWidth, this.scene.canvasHeight)
		var q = new Quad2D(largeDimension, largeDimension);
		var backdrop = this.scene.createMesh('backdrop');
		backdrop.isOpaque = true;
		backdrop.is2D = true;
		backdrop.vertices = q.getVertices();
		backdrop.normals = q.getNormals();
		backdrop.uvs = q.getUVs();
		backdrop.indices = q.getIndices();
		backdrop.texture = this.scene.getTexture('stars');
		backdrop.isFullyLit = false;
		backdrop.prepBuffers();

		var radius = 7.0;
		var sphere = new Sphere(radius, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		console.log(this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);

		var earth = this.scene.createMesh('earth');
		earth.isOpaque = true;
		earth.vertices = sphere.getVertices();
		earth.normals = sphere.getNormals();
		earth.uvs = sphere.getUVs();
		earth.indices = sphere.getIndices();
		earth.prepBuffers();
		earth.texture = this.scene.getTexture('earth');
		earth.transform.translation[2] = 0;
		earth.transform.rotation[0] = m4.deg2rad(-90);
		earth.transform.rotation[2] = m4.deg2rad(170);
		earth.updateTransform();

		var sphere2 = new Sphere(radius * 1.02, this._qualityData[this._config.Quality].sectors, this._qualityData[this._config.Quality].stacks);
		var clouds = this.scene.createMesh('clouds');
		clouds.isOpaque = false;
		clouds.vertices = sphere2.getVertices();
		clouds.normals = sphere2.getNormals();
		clouds.uvs = sphere2.getUVs();
		clouds.indices = sphere2.getIndices();
		clouds.prepBuffers();
		clouds.texture = this.scene.getTexture('clouds');
		clouds.transform.scale[0] = clouds.transform.scale[1] = clouds.transform.scale[2] = 1.02;
		clouds.transform.rotation[0] = m4.deg2rad(-90);
		clouds.transform.rotation[2] = m4.deg2rad(170);

		return {
			meshes: [backdrop, earth, clouds]
		};
	}

	private _animate() {
		const rotThetas = this._config.Rotation;

		var view_matrix = this.scene.viewMatrix;

		let time_old = 0;
		let zoomLevel_old = 0;
		const execAnimation = (time: number) => {
			var dt = time - time_old;
			time_old = time;

			this.scene.cameraPosition[2] = -this._config.ZoomLevel;

			// adjust zoom level
			// if (Math.abs(this._config.ZoomLevel - zoomLevel_old) >= 0.01) {
			// 	view_matrix[14] = view_matrix[14] + (zoomLevel_old * -1) + this._config.ZoomLevel;
			// 	zoomLevel_old = this._config.ZoomLevel;
			// 	console.log(this._config.ZoomLevel);
			// }

			// update meshes
			var earth = this.scene.getMeshByName('earth');
			var clouds = this.scene.getMeshByName('clouds');
			for (var axis in rotThetas) {
				var theta = rotThetas[axis];
				if (theta > 0.0 || theta < 0.0) {
					var index = 0;
					switch (axis) {
						case 'X':
							index = 0;
							break;
						case 'Y':
							index = 1;
							break;
						case 'Z':
							index = 2;
							break;

					}
					earth.transform.rotation[index] += dt * theta;
					if(clouds) clouds.transform.rotation[index] = earth.transform.rotation[index];
					// (<any>Matrix)[`rotate${axis}`](mesh.modelMatrix, dt * theta);
				}
			}

			this.scene.drawScene(time);

			window.requestAnimationFrame(execAnimation);
		}

		execAnimation(0);
	}

	public Draw() {
		var data = this._setData();

		this._animate();
	}

	public SetDrawMode(value: string) {
		var modeValue = (<any>this.scene._gl)[value];
		if (modeValue === undefined && typeof modeValue !== 'number') throw new Error(`Invalid mode value '${value}'`);

		this._config.DrawMode = this.scene.drawMode = modeValue;
		console.log(this.scene.drawMode);
	}

	public SetQuality(value: string) {
		var intValue = parseInt(value, 10);
		if (isNaN(intValue)) throw new Error(`Quality value must be a number.`);

		this._config.Quality = intValue;

		this._setData();
	}

	public GetRotation(axis: string) {
		return this._config.Rotation[axis];
	}

	public SetRotation(axis: string, value: number) {
		if (this._config.Rotation[axis] === undefined) throw new Error(`Invalid axis '${axis}'`);
		if (isNaN(value) || typeof value !== 'number') throw new Error(`Rotation value must be a number.`);

		this._config.Rotation[axis] = value;
	}

	public GetZoom() {
		return this._config.ZoomLevel;
	}

	public SetZoom(value: number) {
		if (isNaN(value) || typeof value !== 'number') throw new Error(`Zoom value must be a number.`);

		this._config.ZoomLevel = value;
	}
}

function showRangeValue(prepend: string, sliderId: string, inputId: string) {
	(<HTMLInputElement>document.getElementById(inputId)).value = prepend + (<HTMLInputElement>document.getElementById(sliderId)).value;
}

function startApp() {
	let app = new App(<HTMLCanvasElement>document.getElementById('canvas'), m4.deg2rad(45), 0.1, 1000);

	let scene = app.scene;

	scene.loadTexture('./img/stars.png', 'stars');
	scene.loadTexture('./img/earth.png', 'earth');
	scene.loadTexture('./img/clouds.png', 'clouds');

	let drawMode = <HTMLSelectElement>document.getElementById('drawMode');
	drawMode.addEventListener('change', (e) => app.SetDrawMode((<HTMLOptionElement>drawMode.options[drawMode.selectedIndex]).value));

	let quality = <HTMLSelectElement>document.getElementById('quality');
	quality.addEventListener('change', (e) => app.SetQuality((<HTMLOptionElement>quality.options[quality.selectedIndex]).value));

	let sliderX = <HTMLInputElement>document.getElementById('sliderX');
	let sliderY = <HTMLInputElement>document.getElementById('sliderY');
	let sliderZ = <HTMLInputElement>document.getElementById('sliderZ');
	let sliderZoom = <HTMLInputElement>document.getElementById('sliderZoom');

	sliderX.value = app.GetRotation('X').toString();
	sliderY.value = app.GetRotation('Y').toString();
	sliderZ.value = app.GetRotation('Z').toString();
	sliderZoom.value = app.GetZoom().toString();

	sliderX.addEventListener('input', () => {
		app.SetRotation(sliderX.getAttribute('data-axis'), parseFloat(sliderX.value));
		showRangeValue('X:', 'sliderX', 'sliderInputX');
	});
	sliderY.addEventListener('input', () => {
		app.SetRotation(sliderY.getAttribute('data-axis'), parseFloat(sliderY.value))
		showRangeValue('Y:', 'sliderY', 'sliderInputY');
	});
	sliderZ.addEventListener('input', () => {
		app.SetRotation(sliderZ.getAttribute('data-axis'), parseFloat(sliderZ.value))
		showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
	});
	sliderZoom.addEventListener('input', () => {
		app.SetZoom(parseFloat(sliderZoom.value));
		showRangeValue('', 'sliderZoom', 'sliderInputZoom');
	});

	showRangeValue('X:', 'sliderX', 'sliderInputX');
	showRangeValue('Y:', 'sliderY', 'sliderInputY');
	showRangeValue('Z:', 'sliderZ', 'sliderInputZ');
	showRangeValue('', 'sliderZoom', 'sliderInputZoom');

	app.Draw();
}

(() => {
	startApp();
})();
