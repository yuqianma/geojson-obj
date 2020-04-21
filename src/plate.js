import { Line2 } from '../node_modules/three/examples/jsm/lines/Line2.js';
import { LineMaterial } from '../node_modules/three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from '../node_modules/three/examples/jsm/lines/LineGeometry.js';

const EarthRadius = 6378137;

const SUPPORTED_FEATURE_TYPES = {
  MultiPolygon: true,
  Polygon: true,
};

export const supportedFeature = (feature) => SUPPORTED_FEATURE_TYPES[turf.getType(feature)];

export const supportedFeatureEach = (geojson, callback) =>
  turf.featureEach(geojson, (feature, index) => {
    supportedFeature(feature) && callback(feature, index)
  });

// return scaling factor that fit bounds within width/height
export function getFittedScale(bounds, width, height) {
  const topLeft = bounds[0];
  const bottomRight = bounds[1];

  const w = bottomRight[0] - topLeft[0];
  const h = bottomRight[1] - topLeft[1];

  const hscale = width / w;
  const vscale = height / h;

  // pick the smallest scaling factor
  const scale = (hscale < vscale) ? hscale : vscale;

  return scale;
}

// 我们的geojson自定义了一个可视范围用于初始范围计算（例如海南）
export const bbox = (geojson) => {
  const result = [Infinity, Infinity, -Infinity, -Infinity];

  supportedFeatureEach(geojson, (feature) => {

    // const coord =
    //         feature.properties && feature.properties.bbox ||
    //         turf.bbox(feature);
    const coord = turf.bbox(feature);

    if (result[0] > coord[0]) { result[0] = coord[0]; }
    if (result[1] > coord[1]) { result[1] = coord[1]; }
    if (result[2] < coord[2]) { result[2] = coord[2]; }
    if (result[3] < coord[3]) { result[3] = coord[3]; }

  });

  return result;
};

export const get2DProjection = (bbox, unit = 1000) => {
  const [ax, ay, bx, by] = bbox;

  // CHART-10454, support longitude exceeds 180
  // adjust wrapped projection in plate#project

  // log max longitude to adjust projection manually
  let boundedLongitude;
  if (bx - ax > 360) {
    boundedLongitude = ax + 360
  }

  // step 1: rotate lambda to ensure longitude range within [-180, 180], (adjust ax to west)
  // step 2: center rotated south-west point

  let rotation = [0, 0];
  if (bx > 180 || ax < -180) {
    rotation = [-180 - ax, 0];
  }

  const center = [ax + rotation[0], ay];

  // create a normalized feature for d3 to calculation
  const boundsFeature = turf.multiPoint([[ax, ay], [bx, by]]);

  const unitProjection = d3.geoMercator()
                           .center(center)
                           .rotate(rotation)
                           .scale(EarthRadius)
                           .translate([0, 0]);

  // const path = d3.geoPath().projection(unitProjection);

  // // bounds in radian
  // const bounds = path.bounds(boundsFeature);

  // const scale = getFittedScale(bounds, unit, unit);

  // const proj = d3.geoMercator()
  //          .center(center)
  //          .rotate(rotation)
  //          .scale(scale)
  //          .translate([0, 0]);

  const lonLatOrigin = unitProjection([0, 0]);
  const proj = unitProjection.translate([-lonLatOrigin[0], -lonLatOrigin[1]]);
  // const proj = unitProjection;

  proj.boundedLongitude = boundedLongitude;
  proj.boundedWidth = proj([boundedLongitude, 0])[0];

  return proj;
};

const getDebugGeojson = () => {
  const getTri = ([ax, ay, bx, by]) => ([
    [ ax, ay ],
    [ bx, ay ],
    // [ bx, by ],
    [ ax, by ],
    [ ax, ay ]
  ]);
  const j = turf.multiPolygon([ [[ 
    [-180, 80],
    [-160, 80],
    [-160, -60],
    [180, -60],
    [180, -80],
    [-180, -80]
  ]] ]);
  // j.properties.bbox = [73.502355, 16, 135.09567, 43.563269];
  return j;
};

// Use D3.js projection to create array of Three.js points/vectors from GeoJSON ring
const ringToPoints = (ring, projection) =>
  ring.map(point => new THREE.Vector2(...projection(point)));

// Create Three.js polygon from GeoJSON Polygon
const createPolygonShape = (polygon, projection) => {
  const outerRing = polygon[0];
  const points = ringToPoints(outerRing, projection);
  const polygonShape = new THREE.Shape(points);

  polygon.slice(1).forEach(hole => {
    const points = ringToPoints(hole, projection);
    const holeShape = new THREE.Shape(points);
    polygonShape.holes.push(holeShape);
  });

  return polygonShape;
};

export class Plate {
  constructor(geojson) {
    // this.geojson = getDebugGeojson();
    this.geojson = geojson;

    this.props = {
      depth: 1e5,
      color: 0x00bbdd,
      outlineColor: 0x00bbdd,
      linewidth: 2e4
    };

    this.install();
  }

  install() {
    const geojson = this.geojson;

    this._bbox = bbox(geojson);

    // get projection range
    // x ∈ [0, unit]
    // y ∈ [0, -unit]
    this._2DProjection = get2DProjection(this._bbox);

    // flip y so we get range y ∈ [0, unit]
    this.project = this.project.bind(this);

    const shapes = this.getFeatureShapes(geojson);

    // z=0 is upside face
    // extrude to the downside
    // const extrude = this._createExtrude({ shapes });
    // const outline = this._createOutline({ shapes });

    // const group = new THREE.Group();
    // group.add(extrude);
    // group.add(outline);

    // this.object = extrude;
    this.object = this.createOutline(geojson);
  }

  project(point) {
    const projected = this._2DProjection(point);
    // flip y for 3d;
    projected[1] = -projected[1];
    if (point[0] > this._2DProjection.boundedLongitude) {
      // d3 will wrap out-of-range longitude.
      // Offset it by adding width.
      projected[0] += this._2DProjection.boundedWidth;
    }
    return projected;
  }

  getBboxGeometry() {
    return new THREE.ShapeGeometry(
      _.flatten( this.getFeatureShapes( turf.bboxPolygon(this._bbox) ) )
    );
  }

  getFeatureShapes(geojson) {
    const allShapes = [];
    supportedFeatureEach(geojson, (feature) => {
      let coordinates = feature.geometry.coordinates;
      if (turf.getType(feature) === 'Polygon') {
        coordinates = [coordinates]; // make it as MultiPolygon
      }

      const shapes = coordinates.map(polygon => createPolygonShape(polygon, this.project));
      shapes._name = feature.properties.name;
      allShapes.push(shapes);
    });

    return allShapes;
  }

  createOutline(geojson) {
    const { outlineColor, linewidth } = this.props;
    const outlineGroup = new THREE.Group();
    
    const mat = new THREE.MeshBasicMaterial( { color: outlineColor } );

    supportedFeatureEach(geojson, (feature) => {
      let coordinates = feature.geometry.coordinates;

      if (turf.getType(feature) === 'Polygon') {
        coordinates = [coordinates]; // make it as MultiPolygon
      }

      coordinates.map((polygon) => {
        const outerRing = polygon[0];
        const linePoints = outerRing.map(this.project);

        linePoints.push(linePoints[0].slice());

        const len = linePoints.length * 2;
        const points = new Array(len);

        const normals = getNormals(linePoints);

        linePoints.forEach(([x, y], i) => {
          let [dx, dy] = normals[i][0];
          dx *= linewidth / 2;
          dy *= linewidth / 2;
          points[i] = new THREE.Vector2( x - dx, y - dy );
          points[len - 1 - i] = new THREE.Vector2( x + dx, y + dy );
        });

        const strokeShape = new THREE.Shape(points);

        const geom = new THREE.ShapeBufferGeometry(strokeShape);
        const mesh = new THREE.Mesh( geom, mat );

        outlineGroup.add(mesh);
      });

    });

    return outlineGroup;
  }

  _createExtrude({ shapes }) {
    const { depth, color } = this.props;

    const extrudeSurfaceMat = new THREE.MeshBasicMaterial({
      color,
      // visible: false,
      // depthTest: false,
    });
    const sideMat = new THREE.MeshBasicMaterial({
      color,
      // depthTest: false,
    });

    const group = new THREE.Group();
    shapes.forEach(shape => {
      const extrudeGeometry = new THREE.ExtrudeBufferGeometry(shape, {
        depth,
        bevelEnabled: false
      });

      // const mat = new THREE.MeshBasicMaterial({
      //   color: '#' + (0x1000000 + (Math.random() * 0x1000000) | 0).toString(16).substr(1),
      // });

      const extrudeMesh = new THREE.Mesh(extrudeGeometry, [extrudeSurfaceMat, sideMat]);
      extrudeMesh.name = shape._name;
      group.add(extrudeMesh);
    });
    
    return group;
  }

  _createOutline({ shapes }) {
    const { outlineColor } = this.props;

    const outlineGeometries = shapes.map(shape => new THREE.ShapeBufferGeometry(shape));

    const outlineGroup = new THREE.Group();
    outlineGeometries.map(geom => {
      const line = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.MeshBasicMaterial({
          color: outlineColor
        })
      );
      outlineGroup.add(line);

      geom.dispose();
    });

    return outlineGroup;
  }

  _createOutline2({ shapes }) {
    const { outlineColor } = this.props;

    const outlineGroup = new THREE.Group();

    shapes.map(shape => {
      shape.forEach(s => {
        const position = [];

        s.curves.forEach(curve => {
          position.push(curve.v1.x, curve.v1.y, 0);
        });
        const { x, y } = s.curves[0].v1;
        position.push(x, y, 0);

        const geometry = new LineGeometry();
        geometry.setPositions( position );

        const line = new Line2(
          geometry,
          new LineMaterial({
            color: outlineColor,
            linewidth: 0.01,
            // vertexColors: true,
            dashed: false,
          })
        );
        outlineGroup.add(line);
      });
    });

    return outlineGroup;
  }

  dispose() {

  }
}
