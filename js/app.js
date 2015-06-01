var container, scene, camera, renderer;

var CAMERA_HORIZON = 25000;
var minCameraFov = 15, maxCameraFov = 75;
var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

var effect;
var WEBSOCKET_ADDR = "ws://127.0.0.1:1981";
var USE_TRACKER = true;
var USE_WEBVR = false;

var MOUSE_SPEED = 0.005;
var KEYBOARD_SPEED = 0.02;
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

// Used for WebVR Only
var cameraLeft = new THREE.PerspectiveCamera();
cameraLeft.matrixAutoUpdate = false;
var cameraRight = new THREE.PerspectiveCamera();
cameraRight.matrixAutoUpdate = false;
var eyeOffsetLeft = new THREE.Matrix4();
var eyeOffsetRight = new THREE.Matrix4();
var sensorDevice = null;
var hmdDevice = null;
var isFullscreen = false;

var currentRenderer;

// Utility function
// ----------------------------------------------
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

function deltaAngleDeg(a,b) {
  return Math.min(360-(Math.abs(a-b)%360),Math.abs(a-b)%360);
}

function initWebVR() {
  var perspectiveMatrixFromVRFieldOfView =  function (fov, zNear, zFar) {
        var outMat = new THREE.Matrix4();
        var out = outMat.elements;
        var upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
        var downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
        var leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
        var rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);

        var xScale = 2.0 / (leftTan + rightTan);
        var yScale = 2.0 / (upTan + downTan);

        out[0] = xScale;
        out[4] = 0.0;
        out[8] = -((leftTan - rightTan) * xScale * 0.5);
        out[12] = 0.0;

        out[1] = 0.0;
        out[5] = yScale;
        out[9] = ((upTan - downTan) * yScale * 0.5);
        out[13] = 0.0;

        out[2] = 0.0;
        out[6] = 0.0;
        out[10] = zFar / (zNear - zFar);
        out[14] = (zFar * zNear) / (zNear - zFar);

        out[3] = 0.0;
        out[7] = 0.0;
        out[11] = -1.0;
        out[15] = 0.0;

        return outMat;
      }

  var enumerateVRDevices = function(devices) {
    for (var i = 0; i < devices.length; ++i) {
      if (devices[i] instanceof HMDVRDevice) {
        hmdDevice = devices[i];
        var offsetLeft = hmdDevice.getEyeTranslation("left");
        eyeOffsetLeft = (new THREE.Matrix4()).makeTranslation(offsetLeft.x, offsetLeft.y, offsetLeft.z);
        var offsetRight = hmdDevice.getEyeTranslation("right")
        eyeOffsetRight = (new THREE.Matrix4()).makeTranslation(offsetRight.x, offsetRight.y, offsetRight.z);

        //cameraLeft.position.sub(eyeOffsetLeft);
        //cameraLeft.position.z = 12;

        //cameraRight.position.sub(eyeOffsetRight);
        //cameraRight.position.z = 12;

        if ('getCurrentEyeFieldOfView' in hmdDevice) {
          fovLeft = hmdDevice.getCurrentEyeFieldOfView("left");
          fovRight = hmdDevice.getCurrentEyeFieldOfView("right");
        } else {
          fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
          fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
        }

        cameraLeft.projectionMatrix = perspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
        cameraRight.projectionMatrix = perspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
      }
    }

    for (var i = 0; i < devices.length; ++i) {
      if (devices[i] instanceof PositionSensorVRDevice && (!hmdDevice || devices[i].hardwareUnitId == hmdDevice.hardwareUnitId)) {
        sensorDevice = devices[i];
      }
    }
  }

  var onFullscreenChange = function() {
    if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
      isFullscreen = false;
    }
    resize();
  }

  if (navigator.getVRDevices) {
    navigator.getVRDevices().then(enumerateVRDevices);
  } else if (navigator.mozGetVRDevices) {
    navigator.mozGetVRDevices(enumerateVRDevices);
  } else {
    return false;
  }

  document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
  document.addEventListener("mozfullscreenchange", onFullscreenChange, false);
  return true;
}

function initScene(){

    $container = $('#viewContainer');

    $('#toggle-render').click(function() {
        //TODO
    });

    window.addEventListener( 'resize', resize, false );

	camera = new THREE.PerspectiveCamera(maxCameraFov, WIDTH/HEIGHT, 0.1, CAMERA_HORIZON);

	scene = new THREE.Scene();
	scene.add(camera);

	camera.position.set(0,0,10);
	camera.lookAt(scene.position);

	try {
        renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
    }catch(e){
      alert('This application needs WebGL enabled!');
      return false;
    }

    renderer.autoClearColor = false;
	renderer.setSize(WIDTH, HEIGHT);

	currentRenderer = renderer;

	$container.append( renderer.domElement );

	THREEx.WindowResize(renderer, camera);

	//Pictures
	var panoramaBox = new THREE.BoxGeometry(128, 128, 128, 16, 16, 16);
	
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
	scene.add(panoramaMesh);
}

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
    console.log('websocket close');
    if (USE_TRACKER) setTimeout(initWebSocket, 1000);
  };

  connectionHMDData = new WebSocket(WEBSOCKET_ADDR + "?");

  connectionHMDData.onmessage = function(message) {
    var HMDData = JSON.parse(message.data);
    console.log(HMDData);
    connectionHMDData.close();

    currentRenderer = new THREE.OculusRiftEffect( renderer, HMDData);
    currentRenderer.setSize(WIDTH, HEIGHT );
  }
}

function initControls() {

  // Keyboard
  // ---------------------------------------
  var lastSpaceKeyTime = new Date(),
      lastCtrlKeyTime = lastSpaceKeyTime;

  $(document).keydown(function(e) {
    //console.log(e.keyCode);
    switch(e.keyCode) {
      case 37:
        keyboardMoveVector.y = KEYBOARD_SPEED;
        break;
      case 38:
        keyboardMoveVector.x = KEYBOARD_SPEED;
        break;
      case 39:
        keyboardMoveVector.y = -KEYBOARD_SPEED;
        break;
      case 40:
        keyboardMoveVector.x = -KEYBOARD_SPEED;
        break;
      case 17: // Ctrl
        var ctrlKeyTime = new Date();
        if (ctrlKeyTime-lastCtrlKeyTime < 300) {
          //moveToNextPlace();
        }
        lastCtrlKeyTime = ctrlKeyTime;
        break;
      case 18: // Alt
        //TODO use depth
        USE_DEPTH = !USE_DEPTH;
        //setSphereGeometry();
        break;
      case 70: // F
        console.log("f key press " + USE_WEBVR + isFullscreen);
        if (USE_WEBVR && !isFullscreen) {
          if (renderer.domElement.webkitRequestFullscreen) {
            renderer.domElement.webkitRequestFullscreen({ vrDisplay: hmdDevice });
            isFullscreen = true;
          } else if (renderer.domElement.mozRequestFullScreen) {
            renderer.domElement.mozRequestFullScreen({ vrDisplay: hmdDevice });
            isFullscreen = true;
          }
        }
        break;
      case 82: // R
        if (USE_WEBVR) {
          sensorDevice.resetSensor();
        }
        break;
    }
  });

  $(document).keyup(function(e) {
    switch(e.keyCode) {
      case 37:
      case 39:
        keyboardMoveVector.y = 0.0;
        break;
      case 38:
      case 40:
        keyboardMoveVector.x = 0.0;
        break;
    }
  });

  // Mouse
  // ---------------------------------------
  var viewer = $('#viewContainer'),
      mouseButtonDown = false,
      lastClientX = 0,
      lastClientY = 0;

  viewer.dblclick(function() {
    moveToNextPlace();
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
      var enableX = (USE_TRACKER || USE_WEBVR) ? 0 : 1;
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

function animate(){
	if(render()){
	    requestAnimationFrame(animate);
	}
	update();
}

function update(){
	stats.update();
}

function render() {
  if (USE_WEBVR/* && isFullscreen*/) {
    cameraLeft.matrix.copy(camera.matrix).multiply(eyeOffsetLeft);
    cameraLeft.matrixWorldNeedsUpdate = true;

    currentRenderer.enableScissorTest ( true );
    currentRenderer.setScissor( 0, 0, window.innerWidth / 2, window.innerHeight );
    currentRenderer.setViewport( 0, 0, window.innerWidth / 2, window.innerHeight );
    currentRenderer.render(scene, cameraLeft);

    // Render right eye
    cameraRight.matrix.copy(camera.matrix).multiply(eyeOffsetRight);
    cameraRight.matrixWorldNeedsUpdate = true;

    currentRenderer.setScissor( window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
    currentRenderer.setViewport( window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight );
    currentRenderer.render(scene, cameraRight);
  }
  else {
    currentRenderer.render(scene, camera);
  }
}

function resize( event ) {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  currentRenderer.setSize( WIDTH, HEIGHT );
  camera.projectionMatrix.makePerspective( 60, WIDTH / HEIGHT, NEAR, FAR );
}

function loop() {
  requestAnimationFrame( loop );

  // User vr plugin
  if (USE_WEBVR && sensorDevice) {
    var vrState = sensorDevice.getState();
    HMDRotation.set(vrState.orientation.x, vrState.orientation.y, vrState.orientation.z, vrState.orientation.w);
    HMDTranslation.set(vrState.position.x, vrState.position.y, vrState.position.z);
  }

  // Compute move vector
  moveVector.addVectors(keyboardMoveVector, gamepadMoveVector);

  // Disable X movement HMD tracking is enabled
  if (USE_TRACKER || USE_WEBVR) {
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
        $(stats.domElement).hide();
    }else{
        $('#toggle-render').show();
        $(stats.domElement).show();
    }
  }
});

initScene();
initControls();

if (initWebVR()) {
    console.log("Using webVR");
    USE_TRACKER = false;
    USE_WEBVR = true;
}
else {
    USE_WEBVR = false;
}

if (USE_TRACKER) {
    initWebSocket();
}

loop();