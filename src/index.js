import * as THREE from '../node_modules/three/build/three.module.js';
import { OBJExporter } from '../node_modules/three/examples/jsm/exporters/OBJExporter.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { geoModel } from './geo-model.js';

window.THREE = THREE;

/**
 * Output types:
 * 1. Polygon -> extrude mesh
 * 2. Polygon -> line shape mesh (outline)
 * 3. LineString -> line extrude mesh (ten-dash line)
 */

function parseToObjString(object) {
  var exporter = new OBJExporter();
  var result = exporter.parse( object );
  return result;
}

function download(text, filename = 'geojson.obj') {
  const a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  a.setAttribute('download', filename);
  document.body.append(a);
  a.click();
  a.remove();
}

function downloadObj(object, splitBy = 'o') {
  let text = parseToObjString(object);
  if (splitBy === 'g') {
    text = text.split('\n').map(line => {
      if (line[0] === 'o') {
        return 'g' + line.slice(1);
      }
      return line;
    }).join('\n');
  }
  download(text);
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

function fitView(object) {
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject( object );
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

  const model = geoModel(geojson, {
    geometryTypes: ['Polygon', 'MultiPolygon']
  });
  const object = model.create();

  object.rotateX(-Math.PI / 2);
  object.rotateY(Math.PI);
  scene.add(object);

  scene.add( new THREE.BoxHelper( object, 0xffff00 ) );

  // example();

  // fitView();

  focusChina();

  window.downloadObj = () => downloadObj(object);

  var geometry = new THREE.CircleGeometry( 500000, 32 );
  var material = new THREE.MeshBasicMaterial( { color: 0xee5555 } );
  var circle = new THREE.Mesh( geometry, material );
  const [x, y] = model.project([180, 0]);
  geometry.translate(x, y, 1);
  circle.rotateX(Math.PI / 2);
  circle.rotateY(Math.PI);
  scene.add(circle);
};

generate('./geojson/china-area.json');
// generate('./geojson/world-360.json');

function animate() {

  requestAnimationFrame( animate );
  
  // camera.lookAt( scene.position );

  light.position.set( camera.position.x, camera.position.y, camera.position.z ).normalize();

  renderer.render( scene, camera );

}
animate();
