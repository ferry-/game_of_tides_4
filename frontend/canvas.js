// Copyright 2016 duncan law (mrdunk@gmail.com)

/*global THREE*/

var Renderer = function(options) {
  this.views = [];  // All registered Viewports.

  var Viewport = function(width, height, camera) {
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setClearColor(0xcccccc);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.renderer.autoClear = false;

    var _this = this;

    this.setSize = function(width, height) {
      _this.renderer.setSize(width, height);
      _this.camera.aspect = width / height;
      _this.camera.updateProjectionMatrix();
    };

    this.setScene = function(scene) {
      _this.scene = scene;
    };

    this.render = function() {
      if (typeof _this.scene === 'undefined' ||
          typeof _this.camera === 'undefined') {
        //console.log('Error: Secene or camera missing!');
        return;
      }
      _this.renderer.render(_this.scene.scene, _this.camera);
    };

    if (typeof camera !== 'undefined') {
      this.camera = camera;
    } else {
      this.camera = new THREE.PerspectiveCamera(
          75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.z = 5;
    }

    if (width && height) {
      this.setSize(width, height);
    } else {
      this.setSize(window.innerWidth, window.innerHeight);
    }
  };


  this.CreateScene = function(vertices, color) {
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(color, 3));
    geometry.computeVertexNormals();
    //var material = new THREE.MeshBasicMaterial({//color: 0xff0000,
    //                                            side : THREE.BackSide});
    var material = new THREE.MeshPhongMaterial({//color: 0xff0000,
                                                vertexColors: THREE.VertexColors,
                                                  side : THREE.FrontSide,
                                                  shading: THREE.FlatShading });
    //var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });

    //material.wireframe = true;
    var mesh = new THREE.Mesh(geometry, material);

    this.scene = new THREE.Scene();

    //var ambientLight = new THREE.AmbientLight( 0xb0b0b0 );
    var ambientLight = new THREE.AmbientLight( 0xffffff );
    this.scene.add(ambientLight);

    /*var pointLight = new THREE.PointLight( 0xffffff, 1, 0 );
    pointLight.position.set( 0,3000,100000 );
    this.scene.add(pointLight);*/
    
    this.scene.add(mesh);
  };

  this.Update = function(){
    for (var view_index = 0; view_index < this.views.length; view_index++){
      this.views[view_index].renderer.clear();
      this.views[view_index].render();
    }
  };

  this.SetScene = function(scene){
    for (var view_index = 0; view_index < this.views.length; view_index++){
      this.views[view_index].setScene(scene);
    }
  };

  this.RegisterView = function(port_width, port_height) {
    var camera = new THREE.PerspectiveCamera(45, 1, 1, 0, 200);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 3;
    var viewport = new Viewport(port_width, port_height, camera);
    camera.controls = new THREE.OrbitControls( camera, viewport.renderer.domElement )
    this.views.push(viewport);
  }.bind(this);

  var CameraDistance = function(data){
    console.log(data);
    if(this.views[0]){
      this.views[0].camera.position.z = data;
    }
  }.bind(this);

  var CameraDirection = function(data) {
    if(this.views[0]){
      this.views[0].camera.position.y = data / 10;
      this.views[0].camera.lookAt(new THREE.Vector3(0,0,0));
    }
  }.bind(this);

  /* Configuration data for this module. To be inserted into the Menu. */
  this.menu_data = {
    name: "scene",
    content: {
      description: 'scene',
      settings: {
        camera1_range: {
          description : 'camera1 range',
          type: options.Slider,
          callback: CameraDistance,
          value: 5
        },
        camera1_direction: {
          description : 'camera1 direction',
          type: options.Slider,
          callback: CameraDirection,
          value: 5
        }
      }
    }
  }
  

  if(options){
    options.RegisterClient(this);
  }
}
