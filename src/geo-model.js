import { get2DProjection } from './projection.js';

const GeometryTypes = {
  Polygon: 'Polygon',
  MultiPolygon: 'MultiPolygon',
  LineString: 'LineString',
  MultiLineString: 'MultiLineString'
};

export function geoModel(geojson, opt = {}) {
  const {
    geometryTypes,
    output,
    color = 0x00bbdd,
    depth = 1e5,
    lineWidth = 2e4,
  } = opt;

  const project = get2DProjection(geojson);

  const supportedGeometryTypeMap = geometryTypes
    ? geometryTypes.reduce((obj, name) => (obj[name] = 1, obj), {})
    : GeometryTypes;
  
  const mat = new THREE.MeshBasicMaterial({ color });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const ringToShape = ring =>
    new THREE.Shape(ring.map(point => new THREE.Vector2(...project(point))));

  const polygonToShape = polygon => polygon.slice(1).reduce((polygonShape, hole) => {
    polygonShape.holes.push(ringToShape(hole));
    return polygonShape;
  }, ringToShape(polygon[0]));

  const expandLineToShape = line => {
    const linePoints = line.map(project);
    const len = linePoints.length * 2;
    const points = new Array(len);
    const normals = getNormals(linePoints);

    linePoints.forEach(([x, y], i) => {
      let [dx, dy] = normals[i][0];
      dx *= lineWidth / 2;
      dy *= lineWidth / 2;
      points[i] = new THREE.Vector2( x - dx, y - dy );
      points[len - 1 - i] = new THREE.Vector2( x + dx, y + dy );
    });

    return new THREE.Shape(points);
  }

  const shapeToExtrudeMesh = shape => new THREE.Mesh(
    new THREE.ExtrudeBufferGeometry(shape, {
      depth,
      bevelEnabled: false
    }),
    [mat, mat2]
  );

  const shapeToMesh = shape => new THREE.Mesh(
    new THREE.ShapeBufferGeometry(shape),
    mat
  );

  const create = () => {
    const group = new THREE.Group();

    turf.featureEach(geojson, (feature) => {
      const type = turf.getType(feature);
      const name = feature.properties.name;

      if (!supportedGeometryTypeMap[type]) {
        return;
      }

      let coordinates = feature.geometry.coordinates;

      if (type === GeometryTypes.MultiPolygon || type === GeometryTypes.Polygon) {

        if (type === GeometryTypes.Polygon) {
          coordinates = [coordinates];
        }

        coordinates.forEach(polygon => {
          const shape = polygonToShape(polygon);
          const mesh = shapeToExtrudeMesh(shape);
          mesh.name = name;

          group.add(mesh);
        });
      } else if (type === GeometryTypes.MultiLineString || type === GeometryTypes.LineString) {

        if (type === GeometryTypes.LineString) {
          coordinates = [coordinates];
        }

        coordinates.forEach(line => {
          const shape = expandLineToShape(line);
          const mesh = shapeToExtrudeMesh(shape);
          mesh.name = name;

          group.add(mesh);
        });
      }

    });

    return group;
  }

  return {
    project,
    create
  }
}
