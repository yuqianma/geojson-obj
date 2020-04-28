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

function download(filename = 'geojson.obj', text) {
  const a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  a.setAttribute('download', filename);
  document.body.append(a);
  a.click();
  a.remove();
}

function downloadObj(filename, object, splitBy = 'o') {
  let text = parseToObjString(object);
  if (splitBy === 'g') {
    text = text.split('\n').map(line => {
      if (line[0] === 'o') {
        return 'g' + line.slice(1);
      }
      return line;
    }).join('\n');
  }
  download(filename, text);
}

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000000000 );
camera.position.set( -4e5, 6e6, -2e6 );

const control = new OrbitControls( camera, renderer.domElement );

const scene = new THREE.Scene();
const light = new THREE.DirectionalLight( 0xffffff );
scene.add( light );

scene.add( new THREE.AxesHelper( 20000000 ) );

scene.add( new THREE.GridHelper( 2000, 2 ) );

const geoGroup = new THREE.Group();
scene.add(geoGroup);

let hashData = location.hash ? JSON.parse(decodeURI(location.hash).substr(1)) : null;
const setHashData = obj => {
  hashData = { ...hashData, ...obj };
  location.hash = JSON.stringify(hashData);
}

(function(control) {
  if (!hashData) {
    return
  }
  const { target, position, zoom } = hashData;
  control.target.set(...target);
  control.object.position.set(...position);
  control.object.zoom = zoom;

  control.object.updateProjectionMatrix();
  control.update();

})(control);

control.addEventListener('end', e => {
  const control = e.target;
  const target = control.target;
  const { position, zoom } = control.object;

  setHashData({
    target: [target.x, target.y, target.z],
    position: [position.x, position.y, position.z],
    zoom
  });
});

function animate() {

  requestAnimationFrame( animate );
  
  // camera.lookAt( scene.position );

  light.position.set( camera.position.x, camera.position.y, camera.position.z ).normalize();

  renderer.render( scene, camera );

}
animate();

function disposeObject(object) {
  if (!object.children) {
    return;
  }
  for ( var i = 0; i < object.children.length; i ++ ) {
    var child = object.children[ i ];
    if ( child.isMesh ) {
      child.geometry.dispose();
    } else {
      disposeObject(child);
    }

    object.remove( child );
    i --;
  }
}

let geoObject;
let ratio = hashData.ratio || 1e3;

async function generate(filepath, opt) {
  opt = {...opt, scale: 1 / ratio };
  const geojson = await fetch(filepath).then(r => r.json());

  const model = geoModel(geojson, opt);
  const object = model.create();

  geoObject = object;

  object.rotateX(Math.PI / 2);
  object.rotateY(Math.PI);
  geoGroup.add(object);

  const helper = new THREE.BoxHelper( object, 0xffff00 );
  geoGroup.add( helper );

  // indicate [180, 0]
  const [x, y] = model.project([180, 0]);
  var geometry = new THREE.SphereBufferGeometry( x / 100, 32, 32 );
  var material = new THREE.MeshBasicMaterial( { color: 0xee5555 } );
  var circle = new THREE.Mesh( geometry, material );
  geometry.translate(x, y, 1);
  circle.rotateY(Math.PI);
  geoGroup.add(circle);
};

function viewModel(id) {
  if (id > -1) {
    const modelOpt = ModelList[id];
    const { file } = modelOpt;

    disposeObject(geoGroup);

    generate(file, modelOpt);
  }
}

document.querySelector('#download').addEventListener('click', (e) => {
  const { name } = ModelList[hashData.model];
  const filename = name.toLowerCase().split(' ').join('.') + `1-${ratio/1000}km.obj`;
  console.log('downloading', filename);
  downloadObj(filename, geoObject);
});

document.querySelector('#ratioExp').value = ratio.toExponential().split('1e+')[1];

document.querySelector('#ratioExpBtn').addEventListener('click', (e) => {
  const exp = document.querySelector('#ratioExp').value;
  ratio = 10 ** exp;
  console.log(ratio);
  setHashData({ ratio });
  viewModel(hashData.model);
});

const form = document.querySelector('#models');

form.addEventListener('change', e => {
  const selected = form.elements.model.value;
  setHashData({
    model: selected
  });
  viewModel(selected);
});

function displayModelList(modelList) {
  modelList.forEach((model, i) => {
    const { name } = model;
    const label = form.appendChild(document.createElement('label'));
    label.textContent = name;
    label.insertAdjacentHTML('afterbegin', `<input type="radio" name="model" value="${i}" ${hashData.model == i ? 'checked' : ''} />`);
  });
}

const ModelList = [
  {
    name: 'china provinces plane surface',
    file: './geojson/china-area.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeSurface'
  },
  {
    name: 'china ten-dash line extrude surface',
    file: './geojson/china-area.json',
    featureTypes: ['MultiLineString'],
    outputType: 'extrudeSurface'
  },
  {
    name: 'china ten-dash line plane surface',
    file: './geojson/china-area.json',
    featureTypes: ['MultiLineString'],
    outputType: 'planeSurface'
  },
  {
    name: 'china provinces boundary plane outline',
    file: './geojson/china-area.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeOutline',
    minPolygonArea: 1e10
  },
  {
    name: 'china boundary plane outline',
    file: './geojson/world-360.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeOutline',
    minPolygonArea: 1e10,
    featureFilter: feature => feature.properties.name === '中国'
  },
  {
    name: 'china boundary plane surface',
    file: './geojson/world-360.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeSurface',
    minPolygonArea: 1e10,
    featureFilter: feature => feature.properties.name === '中国'
  },
  {
    name: 'world extrude surface',
    file: './geojson/world-360.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'extrudeSurface',
    simplifyOptions: {
      tolerance: 0.1,
      // highQuality: true,
    }
  },
  {
    name: 'world plane surface',
    file: './geojson/world-360.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeSurface',
    simplifyOptions: {
      tolerance: 0.1,
      // highQuality: true,
    }
  },
  {
    name: 'world contries boundary plane outline',
    file: './geojson/world-360.json',
    featureTypes: ['Polygon', 'MultiPolygon'],
    outputType: 'planeOutline',
    minPolygonArea: 1e10,
    simplifyOptions: {
      tolerance: 0.1,
      // highQuality: true,
    }
  }
];

displayModelList(ModelList);

hashData && viewModel(hashData.model);
