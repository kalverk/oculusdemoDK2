var container, scene, camera;
var inOculusMode = false;

var CAMERA_HORIZON = 25000;
var minCameraFov = 15, maxCameraFov = 75;
var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

var effect;
var WEBSOCKET_ADDR = "ws://127.0.0.1:1981";
var USE_TRACKER = true;

var MOUSE_SPEED = 0.005;
var KEYBOARD_SPEED = 0.002;
var FAR = 1000;
var NEAR = 0.1;

var HMDRotation = new THREE.Quaternion();
var HMDTranslation = new THREE.Vector3();

var headingVector = new THREE.Euler(0,0,0,'YZX');
var moveVector = new THREE.Vector3();
var keyboardMoveVector = new THREE.Vector3();
var gamepadMoveVector = new THREE.Vector3();
var BaseRotation = new THREE.Quaternion();
var BaseRotationEuler = new THREE.Euler(0,0,0,'YZX');

var regularRenderer;
var oculusRenderer;
var currentRenderer;

	var monster = undefined;
	var animateMonster = false;

function angleRangeDeg(angle) {
  angle %= 360;
  if (angle < 0) angle += 360;
  return angle;
}

function angleRangeRad(angle) {
  angle %= 2*Math.PI;
  if (angle < 0) angle += 2*Math.PI;
  return angle;
}

function initScene(){

    $container = $('#viewContainer');

    $('#toggle-render').click(function() {
        if (!inOculusMode) {
            USE_TRACKER = true;
            inOculusMode = true;
            initWebSocket();
        }else{
            //TODO tagasi oculusest ei tule, vana renderdus jääb külge
            inOculusMode = false;
            USE_TRACKER = false;
            currentRenderer = regularRenderer;
            connection.close();
        }
    });

    window.addEventListener( 'resize', resize, false );

	camera = new THREE.PerspectiveCamera(maxCameraFov, WIDTH/HEIGHT, 0.1, CAMERA_HORIZON);

	scene = new THREE.Scene();
	scene.add(camera);

	camera.position.set(0,0,10);
	camera.lookAt(scene.position);

	try {
        regularRenderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
    }catch(e){
      alert('This application needs WebGL enabled!');
      return false;
    }

    regularRenderer.autoClearColor = false;
	regularRenderer.setSize(WIDTH, HEIGHT);

	currentRenderer = regularRenderer;

	$container.append(regularRenderer.domElement);

	THREEx.WindowResize(regularRenderer, camera);

	//Pictures
	var panoramaBox = new THREE.BoxGeometry(2500, 2500, 2500, 16, 16, 16);
	
	var panoramArray = [];
	for (var i = 0; i < 6; i++){
	    var timestamp = new Date().getTime();
        var image = new Image();
        image.src = panoramasArray[i];
        var $image = $(image);
        $image.attr('id', 'image-' + i + timestamp);
        $image.data('timestamp', timestamp);
        $image.addClass('panorama-image');

        $image.hide();
        $('body').append($image);
        var texture = new THREE.Texture($image);
        texture.image = $('#' + $image.attr('id'))[0];
        texture.needsUpdate = true;

        panoramArray.push( new THREE.MeshBasicMaterial({
			map: texture,
			side: THREE.BackSide
		}));
	}

	var material = new THREE.MeshFaceMaterial(panoramArray);
	var panoramaMesh = new THREE.Mesh(panoramaBox, material);
	panoramaMesh.rotation.y = -64.87432 * Math.PI / 180;
	scene.add(panoramaMesh);
	addObjectsToScene()
}

function addObjectsToScene(){
			var color = "#FFFFFF";
			var points = [];
			points.push(new THREE.Vector3(-570,-280,-900));
			points.push(new THREE.Vector3(-820,-310,-900));
			points.push(new THREE.Vector3(-800,100,-900));
			points.push(new THREE.Vector3(-560,90,-900));
			points.push(new THREE.Vector3(-570,-280,-900));
			scene.add(addToScene(points,color));
			addTooltip("1.83m2",color,30,-540,-340,-900);

			points = [];
			points.push(new THREE.Vector3(-880,-160,-600));
			points.push(new THREE.Vector3(-1200,-180,-600));
			points.push(new THREE.Vector3(-1200,100,-600));
			points.push(new THREE.Vector3(-880,85,-600));
			points.push(new THREE.Vector3(-880,-160,-600));
			scene.add(addToScene(points,color));
			addTooltip("3.36m2",color,30,-880,-210,-600);

			color = "#FFFF00";
			points = [];
			points.push(new THREE.Vector3(-180,-280,-450));
			points.push(new THREE.Vector3(-140,1100,-450));
			scene.add(addToScene(points,color));
			addTooltip("9.12m",color,30,-140,-300,-450);

			powerLine("#FF0000","330V");

			points = [];
			points.push(new THREE.Vector3(-450,-210,250));
			points.push(new THREE.Vector3(-900,-180,450));
			generatePoints(points, 10, 20, 10, false);
			addTooltip("Veetrass (04.1997)","#3399FF",15,-450,-210,50);

			points = [];
			points.push(new THREE.Vector3(400,-210,-150));
			points.push(new THREE.Vector3(900,-180,-400));
			generatePoints(points, 10, 20, 10, false);
			addTooltip("Veetrass (04.1997)","#3399FF",15,400,-210,-170);

			color = "#66FF66";
			points = [];
			points.push( new THREE.Vector3 (932.08895,-210,970) );
			points.push( new THREE.Vector3 (-100.11771, -120, 970) );
			points.push( new THREE.Vector3 (-218.73386, -210,  710.54008) );
			points.push( new THREE.Vector3 (615.13821, -210, 387.95873) );
			points.push( new THREE.Vector3 (932.08895, -205, 1090) );
			scene.add(addToScene(points,color));
			points = [];
			points.push( new THREE.Vector3 (-100.11771, -120, 970) );
			points.push( new THREE.Vector3 (615.13821, -210, 387.95873) );
			scene.add(addToScene(points,color));
			addTooltip("Tähistada 60m2",color,35,400, -210, 700);

			//initMonster();
    }

    function initMonster(){

    	var sceneInfo = {name : "Monster", url : "/js/easteregg/monster.json",
		 objectScale: new THREE.Vector3(0.1, 0.1, 0.1),
		 objectPosition: new THREE.Vector3(1000, -280, 40),
		 objectRotation: new THREE.Euler(-Math.PI/2, 0, 13),
		 animationTime: 3}

    	var loader = new THREE.glTFLoader;
    	loader.load( sceneInfo.url, function(data) {

			var gltf = data;

			monster = gltf.scene;

			if (sceneInfo.objectPosition) {
				monster.position.copy(sceneInfo.objectPosition);
			}

			if (sceneInfo.objectRotation)
				monster.rotation.copy(sceneInfo.objectRotation);

			if (sceneInfo.objectScale)
				monster.scale.copy(sceneInfo.objectScale);

			if (gltf.animations && gltf.animations.length) {
				var i, len = gltf.animations.length;
				for (i = 0; i < len; i++) {
					var animation = gltf.animations[i];
					animation.loop = true;
					// There's .3333 seconds junk at the tail of the Monster animation that
					// keeps it from looping cleanly. Clip it at 3 seconds
					if (sceneInfo.animationTime)
						animation.duration = sceneInfo.animationTime;
					animation.play();
				}
			}
		});
    }

    function cleanup() {

		if (container && renderer)
		{
			container.removeChild(renderer.domElement);
		}

		cameraIndex = 0;
		cameras = [];
		cameraNames = [];
		defaultCamera = null;

		if (!loader || !gltf.animations)
			return;

		var i, len = gltf.animations.length;
		for (i = 0; i < len; i++) {
			var animation = gltf.animations[i];
			if (animation.running) {
				animation.stop();
			}
		}
	}

    function generatePoints(points, segments, radius, radiusSegments, closed) {
		var tubeGeometry = new THREE.TubeGeometry(new THREE.SplineCurve3(points), segments, radius, radiusSegments, closed);
		tubeMesh = createMesh(tubeGeometry);
		scene.add(tubeMesh);
	}

	function createMesh(geom) {

		var meshMaterial = new THREE.MeshNormalMaterial();
		//var meshMaterial = new THREE.MeshBasicMaterial({color:"#FFFFF0", transparent: true, opacity: 0.8});

		var wireFrameMat = new THREE.MeshBasicMaterial();
		wireFrameMat.wireframe = true;

		var mesh = THREE.SceneUtils.createMultiMaterialObject(geom, [meshMaterial,wireFrameMat]);
		return mesh;
	}

    function tube(posx,posy,posz,posx1,posy1,posz1,color){
    	var outerradius = 25;
		var innerradius = 20;
		var segments = 600;
		var radiussegments = 360;
		var tubecolor = new THREE.Color(color);
		var endtubecolor = new THREE.Color(color);
		var wireframe = false;

	var tubepath1 = [{"point" :new THREE.Vector3(posx,posy,posz)},{"point" :new THREE.Vector3(posx1,posy1,posz1)}];
		var actualpoints =[];
		for(var i=0; i<tubepath1.length; i++)
		{
		  actualpoints.push(tubepath1[i].point);
		}
		var actualextrudePath = new THREE.SplineCurve3(actualpoints);
		actualextrudePath.dynamic = true;


		var outertube = new THREE.TubeGeometry(actualextrudePath, segments,outerradius ,radiussegments, false, false);
		outertube.dynamic = true;
		outertube.verticesNeedUpdate = true;
		outertube.dynamic = true;

		var outertubeMesh = new THREE.Mesh(outertube, new THREE.MeshBasicMaterial(
		{ color: tubecolor, shading: THREE.SmoothShading, side: THREE.DoubleSide, wireframe: wireframe, transparent: true,vertexColors: THREE.FaceColors, overdraw: false
		}));
		outertubeMesh.name = "outertube";
		outertubeMesh.dynamic = true;
		outertubeMesh.needsUpdate = true;
		renderer.sortObjects = false;

		var innertube = new THREE.TubeGeometry(actualextrudePath, segments,innerradius ,radiussegments, false, false);
		innertube.dynamic = true;
		innertube.verticesNeedUpdate = true;
		innertube.dynamic = true;

		var innertubeMesh = new THREE.Mesh(innertube, new THREE.MeshBasicMaterial(
		{ color: tubecolor, shading: THREE.SmoothShading, side: THREE.DoubleSide, wireframe: wireframe, transparent: true,vertexColors: THREE.FaceColors, overdraw: false
		}));
		innertubeMesh.name = "innertube";
		innertubeMesh.dynamic = true;
		innertubeMesh.needsUpdate = true;
		renderer.sortObjects = false;

		var first = new THREE.Geometry()
		for (i = 0; i < radiussegments;i++){
		var j = i;
			var k= i*6;

			first.vertices.push(outertube.vertices[j+0].clone());
			first.vertices.push(outertube.vertices[j+1].clone());
			first.vertices.push(innertube.vertices[j+0].clone());
			first.faces.push( new THREE.Face3( k+0, k+1, k+2 ) );
			first.vertices.push(innertube.vertices[j+0].clone());
			first.vertices.push(innertube.vertices[j+1].clone());
			first.vertices.push(outertube.vertices[j+1].clone());
			first.faces.push( new THREE.Face3( k+3, k+4, k+5 ) );

		};
		first.mergeVertices()
		 var firstMesh = new THREE.Mesh(first, new THREE.MeshBasicMaterial(
			 { color: endtubecolor, shading: THREE.SmoothShading, side: THREE.DoubleSide, wireframe: wireframe, transparent: true,vertexColors: THREE.FaceColors, overdraw: false}));

		var second = new THREE.Geometry()
		for (i = 0; i < radiussegments;i++){
		var j = i;
			var k= i*6;

			second.vertices.push(outertube.vertices[outertube.vertices.length-2-j+0].clone());
			second.vertices.push(outertube.vertices[outertube.vertices.length-2-j+1].clone());
			second.vertices.push(innertube.vertices[outertube.vertices.length-2-j+0].clone());
			second.faces.push( new THREE.Face3( k+0, k+1, k+2 ) );
			second.vertices.push(innertube.vertices[outertube.vertices.length-2-j+0].clone());
			second.vertices.push(innertube.vertices[outertube.vertices.length-2-j+1].clone());
			second.vertices.push(outertube.vertices[outertube.vertices.length-2-j+1].clone());
			second.faces.push( new THREE.Face3( k+3, k+4, k+5 ) );



		};
		second.mergeVertices()
		var secondMesh = new THREE.Mesh(second, new THREE.MeshBasicMaterial(
			 { color: endtubecolor, shading: THREE.SmoothShading, side: THREE.DoubleSide, wireframe: wireframe, transparent: true,vertexColors: THREE.FaceColors, overdraw: false}));
		scene.add( outertubeMesh );
		scene.add( innertubeMesh );
		scene.add( firstMesh );
		scene.add( secondMesh );
    }

    function powerLine(color,voltage){
    	points = [];
		points.push(new THREE.Vector3(-448.51175,-210,336.44888));
		points.push(new THREE.Vector3(-333.92123,-210,279.7933));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(-599.89516,-210,410.92839));
		points.push(new THREE.Vector3(-478.1476,-210,351.31872));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(-795.77717,-210,508.1594));
		points.push(new THREE.Vector3(-643.1296,-210,432.64064));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(-1048.4853,-210,634.22013));
		points.push(new THREE.Vector3(-844.95343,-210,533.08154));
		scene.add(addLineToScene(points,color));

		/*points = [];
		points.push(new THREE.Vector3(-1522.54165,-110,868.90739));
		points.push(new THREE.Vector3(-1150.25763,-110,684.70785));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(-2084.83702,-170,1145.20556));
		points.push(new THREE.Vector3(-1641.17623,-170,925.43639));
		scene.add(addLineToScene(points,color));*/

		addTooltip(voltage,color,20,-363.92123,-210,210);

		points = [];
		points.push(new THREE.Vector3(394.92761,-210,-57.60254));
		points.push(new THREE.Vector3(312.43569,-210,-18.92682));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(550.45422,-210,-129.83767));
		points.push(new THREE.Vector3(427.64233,-210,-72.50646));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(751.75803,-210,-226.72388));
		points.push(new THREE.Vector3(587.52893,-210,-148.91716));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(1057.8786,-210,-372.96193));
		points.push(new THREE.Vector3(805.98377,-210,-253.05024));
		scene.add(addLineToScene(points,color));

		points = [];
		points.push(new THREE.Vector3(1532.16188,-210,-597.63135));
		points.push(new THREE.Vector3(1178.63634,-210,-429.51355));
		scene.add(addLineToScene(points,color));

		addTooltip(voltage,color,20,312.43569,-210,108.92682);
    }

    function addTooltip(text,color,size,posx,posy,posz){
		var canvas1 = document.createElement('canvas');
		var context1 = canvas1.getContext('2d');
		context1.font = "Bold " + size + "px Arial";
		context1.fillStyle = color;
		context1.fillText(text, 0, 50);

		var texture1 = new THREE.Texture(canvas1)
		texture1.needsUpdate = true;

		var material1 = new THREE.MeshBasicMaterial( {map: texture1, side:THREE.DoubleSide } );
		material1.transparent = true;

		var mesh1 = new THREE.Mesh(
			new THREE.PlaneGeometry(canvas1.width, canvas1.height),
			material1
		  );
		mesh1.position.set(posx,posy,posz);
		mesh1.lookAt( camera.position );
		scene.add( mesh1 );
    }

    function addCylinderToScene(radius,endradius,height,radiusSegmens,color,posx,posy,posz){
    	var geometry = new THREE.CylinderGeometry(radius, endradius, height, radiusSegmens);
		var material = new THREE.MeshBasicMaterial( {color: color} );
		var cylinder = new THREE.Mesh( geometry, material );
		cylinder.position.set(posx,posy,posz);
		scene.add(cylinder);
    }

    function addLineToScene(points,color){
		var oneDrawing = new THREE.Object3D();

		for (var i = 0, len = points.length; i < len; i++) {
			var material3D = new THREE.MeshBasicMaterial({
				color : color,
				transparent : true,
				opacity : 0.8,
				side : THREE.DoubleSide
			});

			material3D.originalColor = new THREE.Color(color);

			var geometry = new THREE.BoxGeometry(5,2,5);
			geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / -2 ) );

			// before this block add start and end points for smoothing edges
			if (i + 1 === len){
				return oneDrawing;
			}

			var mesh = new THREE.Mesh( geometry, material3D );
			mesh.position.set(points[i].x,points[i].y,points[i].z);
			mesh.lookAt( v1(points[ i + 1 ]) );
			var length = v1(points[i]).distanceTo( v1(points[i + 1]) );
			mesh.scale.set( 1, 1, length*(1/2));
			mesh.translateZ( 0.5 * length );
			oneDrawing.add(mesh);
		}
	}

    function addToScene(points,color){
		var oneDrawing = new THREE.Object3D();

    	for (var i = 0, len = points.length; i < len; i++) {
			var material3D = new THREE.MeshBasicMaterial({
				color : color,
				transparent : true,
				opacity : 0.8,
				side : THREE.DoubleSide
			});

			material3D.originalColor = new THREE.Color(color);

			var pointMaterial3D = new THREE.MeshBasicMaterial({
				color : color,
				transparent : true,
				side : THREE.DoubleSide
			});

			pointMaterial3D.originalColor = new THREE.Color(color);

			var geometry = new THREE.BoxGeometry(5,2,5);
			geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / -2 ) );

			// before this block add start and end points for smoothing edges
			if (i + 1 === len){
				//Random radius
				var pointMesh = new THREE.Mesh(geometry, pointMaterial3D)
				pointMesh.position.set(points[i].x,points[i].y,points[i].z);
				pointMesh.scale.set( 2.5, 2.5, 2.5);
				pointMesh.vertex = true;
				oneDrawing.add(pointMesh);
				return oneDrawing;
			}

			//Random radius
			var pointMesh = new THREE.Mesh(geometry, pointMaterial3D)
			pointMesh.position.set(points[i].x,points[i].y,points[i].z);
			pointMesh.scale.set( 2.5, 2.5, 2.5);
			pointMesh.vertex = true;
			oneDrawing.add(pointMesh);

			var mesh = new THREE.Mesh( geometry, material3D );
			mesh.position.set(points[i].x,points[i].y,points[i].z);
			mesh.lookAt( v1(points[ i + 1 ]) );
			var length = v1(points[i]).distanceTo( v1(points[i + 1]) );
			mesh.scale.set( 1, 1, length*(1/2));
			mesh.translateZ( 0.5 * length );
			oneDrawing.add(mesh);
		}
    }

    function v1(obj){return new THREE.Vector3( obj.x, obj.y, obj.z );}

function initWebSocket() {
  connection = new WebSocket(WEBSOCKET_ADDR);
  connection.binaryType = 'arraybuffer'
  console.log('WebSocket conn:', connection);

  connection.onopen = function () {
    // connection is opened and ready to use
    console.log('websocket open');
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
    console.log('websocket error :-(');
  };

  connection.onmessage = function (message) {
    data = new Float32Array(message.data);
    if (message.data.byteLength == 16) {
      HMDRotation.set(data[0],data[1],data[2],data[3]);
    }
    else if (message.data.byteLength == 12) {
      HMDTranslation.set(data[0], data[1], data[2]);
    };
  };

  connection.onclose = function () {
    console.log('websocket close' + USE_TRACKER);
    if (USE_TRACKER) setTimeout(initWebSocket, 1000);
  };

  connectionHMDData = new WebSocket(WEBSOCKET_ADDR + "?");

  connectionHMDData.onmessage = function(message) {
    var HMDData = JSON.parse(message.data);
    console.log(HMDData);
    connectionHMDData.close();

    currentRenderer = new THREE.OculusRiftEffect(regularRenderer, HMDData);
    currentRenderer.setSize(WIDTH, HEIGHT );
  }
}

function initControls() {
    var movingH = false;
    var movingV = false;

$(document).keydown(function(e) {
    	if(e.keyCode==32){
    	    //Space pressed
    	    //addObjectsToScen();
    	    if(monster){
    	    	if(animateMonster){
					animateMonster = false;
					scene.remove(monster);
				}else{
					animateMonster = true;
					scene.add(monster);
				}
    	    }
    	    //$( "#mapContainerLeft" ).show();
    	}else if(e.keyCode==(13)){
    	    //Enter pressed
            //inWebVRMode = true;
            //hideUIElements();
            addObjectsToScene();
    	}else if(e.keyCode==79){
            if (!inOculusMode) {
                console.log("Oculus Mode activate");
                USE_TRACKER = true;
                inOculusMode = true;
                initWebSocket();
                hideUIElements();
            }else{
                //TODO tagasi oculusest ei tule, vana renderdus jääb külge
                console.log("Oculus Mode Deactivate");
                inOculusMode = false;
                USE_TRACKER = false;
                connection.close();
            }
        }
    });

  // Mouse
  // ---------------------------------------
  var viewer = $('#viewContainer'),
      mouseButtonDown = false,
      lastClientX = 0,
      lastClientY = 0;

  viewer.dblclick(function() {
    //TODO move to the next place
    console.log("move to the next place");
  });

  viewer.mousedown(function(event) {
    mouseButtonDown = true;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
  });

  viewer.mouseup(function() {
    mouseButtonDown = false;
  });

  viewer.mousemove(function(event) {
    if (mouseButtonDown) {
      var enableX = 1;
      BaseRotationEuler.set(
        angleRangeRad(BaseRotationEuler.x + (event.clientY - lastClientY) * MOUSE_SPEED * enableX),
        angleRangeRad(BaseRotationEuler.y + (event.clientX - lastClientX) * MOUSE_SPEED),
        0.0
      );
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      BaseRotation.setFromEuler(BaseRotationEuler);
    }
  });

}

function render() {
    currentRenderer.render(scene, camera);
}

function resize( event ) {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  currentRenderer.setSize( WIDTH, HEIGHT );
  camera.projectionMatrix.makePerspective( 60, WIDTH / HEIGHT, NEAR, FAR );
}

function loop() {
  requestAnimationFrame( loop );

  // Compute move vector
  moveVector.addVectors(keyboardMoveVector, gamepadMoveVector);

  // Disable X movement HMD tracking is enabled
  if (USE_TRACKER) {
    moveVector.x = 0;
  }

  // Apply movement
  BaseRotationEuler.set( angleRangeRad(BaseRotationEuler.x + moveVector.x), angleRangeRad(BaseRotationEuler.y + moveVector.y), 0.0 );
  BaseRotation.setFromEuler(BaseRotationEuler);

  // Update camera rotation
  camera.quaternion.multiplyQuaternions(BaseRotation, HMDRotation);
  camera.position.copy(HMDTranslation.clone().applyQuaternion(BaseRotation));

  // Compute heading
  headingVector.setFromQuaternion(camera.quaternion);
  currHeading = angleRangeDeg(THREE.Math.radToDeg(-headingVector.y));

  // render
  render();
}

function checkWebVR() {
  if(manager.isWebVRCompatible()) {
    $('#toggle-render').show();
  }else {
    $('#toggle-render').hide();
  }
}

$(window).keypress(function(e) {
  if (e.keyCode == 0 || e.keyCode == 32) {
    console.log('Space pressed');
    if($('#toggle-render').is(":visible")){
        $('#toggle-render').hide();
    }else{
        $('#toggle-render').show();
    }
  }
});

initScene();
initControls();

loop();