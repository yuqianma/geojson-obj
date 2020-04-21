import * as THREE from '../node_modules/three/build/three.module.js';
import { OBJExporter } from '../node_modules/three/examples/jsm/exporters/OBJExporter.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { Plate } from './plate.js';

window.THREE = THREE;

function parseToObjString(object) {
  var exporter = new OBJExporter();
  var result = exporter.parse( object );
  return result;
}

function download(text) {
  const a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  a.setAttribute('download', 'geojson.obj');
  document.body.append(a);
  a.click();
  a.remove();
}

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000000000 );
camera.position.set( -4e5, 6e6, -2e6 );
window._camera = camera;

const control = new OrbitControls( camera, renderer.domElement );

const scene = new THREE.Scene();
const light = new THREE.DirectionalLight( 0xffffff );
scene.add( light );

scene.add( new THREE.AxesHelper( 20000000 ) );

scene.add( new THREE.GridHelper( 2000, 2 ) );

function example() {
  function CustomCurve( scale ) {

    THREE.Curve.call( this );
  
    this.scale = ( scale === undefined ) ? 1 : scale;

    this.arcLengthDivisions = 1;
  
  }
  
  CustomCurve.prototype = Object.create( THREE.Curve.prototype );
  CustomCurve.prototype.constructor = CustomCurve;
  
  CustomCurve.prototype.getPoint = function ( t ) {
    var tx = t * 3 - 1.5;
    var ty = Math.sin( 2 * Math.PI * t );
    var tz = 0;
  
    return new THREE.Vector3( tx, ty, tz ).multiplyScalar( this.scale );
  
  };
  
  var path = new CustomCurve( 1000 );
  var geometry = new THREE.TubeBufferGeometry( path, 20, 200, 2, false );
  var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  var mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );
}

function fitView() {
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject( plate.object );
  const size = boundingBox.getSize(new THREE.Vector3());
  camera.position.set(-size.x / 10, size.x, -size.x / 10)
}

function focusChina() {
  camera.position.set(
    -12838345.970047053,
    1935005.7193151636,
    746082.0641847774
  );

  camera.rotation.set(
    -2.509895558846024,
    -0.2946291195079585,
    -2.9322266947597226
  );
}

async function generate(filepath) {
  const geojson = await fetch(filepath).then(r => r.json());

  const plate = new Plate(geojson);
  window.plate = plate;

  plate.object.rotateX(Math.PI / 2);
  plate.object.rotateY(Math.PI);
  scene.add(plate.object);

  scene.add( new THREE.BoxHelper( plate.object, 0xffff00 ) );

  // example();

  // fitView();

  focusChina();

  window.downloadObj = function () {
    const result = parseToObjString(plate.object);
    // console.log(result);
    // console.log(result.split('\n').filter(line => line[0] !== 'v' && line[0] !== 'f').join('\n'));
    // const r = result.split('\n').map(line => {
    //   if (line[0] === 'o') {
    //     return 'g' + line.slice(1);
    //   }
    //   return line;
    // }).join('\n');
    download(result);
  }


  // mark
  //
  // console.log(plate.project([-180, 0]));
  // console.log(plate.project([0, 0]));
  // console.log(plate.project([180, 0]));
  // console.log(plate.project([360, 0]));

  var geometry = new THREE.CircleGeometry( 500000, 32 );
  var material = new THREE.MeshBasicMaterial( { color: 0xee5555 } );
  var circle = new THREE.Mesh( geometry, material );
  const [x, y] = plate.project([180, 0]);
  geometry.translate(x, y, 1);
  circle.rotateX(Math.PI / 2);
  circle.rotateY(Math.PI);
  scene.add(circle);
};

window.generate = generate;
// generate('./geojson/china-area.json');
// generate('./geojson/world-120.old.json');
generate('./geojson/world-area.json');

function animate() {

  requestAnimationFrame( animate );
  
  // camera.lookAt( scene.position );

  light.position.set( camera.position.x, camera.position.y, camera.position.z ).normalize();

  renderer.render( scene, camera );

}
animate();
