import { get2DProjection } from './projection.js';

const FeatureTypes = {
  Polygon: 'Polygon',
  MultiPolygon: 'MultiPolygon',
  LineString: 'LineString',
  MultiLineString: 'MultiLineString'
};

const Constants = {
  Outline: 'outline',
  Surface: 'surface',

  Extrude: 'extrude',
  Plane: 'plane',
};

export function geoModel(geojson, opt = {}) {
  const {
    featureTypes,
    outputType = 'extrudesurface',
    color = 0x00bbdd,
    sideColor = 0xffffff,
    depth = 1e5,
    lineWidth = 2e4,
    minPolygonArea = 0,
    simplifyOptions,
    featureFilter,
  } = opt;

  // if (simplifyOptions) {
  //   geojson = turf.simplify(geojson, simplifyOptions);
  // }

  const _project = get2DProjection(geojson);
  const project = point => {
    const projected = _project(point);
    // flip y for 3d;
    projected[1] = -projected[1];
    if (point[0] > _project.boundedLongitude) {
      // d3 will wrap out-of-range longitude.
      // Offset it by adding width.
      projected[0] += _project.boundedWidth;
    }
    return projected;
  };

  const supportedFeatureTypes = featureTypes
    ? featureTypes.reduce((obj, name) => (obj[name] = 1, obj), {})
    : FeatureTypes;

  const ot = outputType.toLowerCase();
  const shapeType = ot.includes(Constants.Outline) ? Constants.Outline : Constants.Surface;
  const geomType = ot.includes(Constants.Plane) ? Constants.Plane : Constants.Extrude;
  
  const mat = new THREE.MeshBasicMaterial({ color });
  const sideMat = new THREE.MeshBasicMaterial({ color: sideColor });

  const ringToShape = ring =>
    new THREE.Shape(ring.map(point => new THREE.Vector2(...project(point))));

  const polygonToSurfaceShape = polygon => polygon.slice(1).reduce((polygonShape, hole) => {
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
      let m = normals[i][1];
      let hw = lineWidth / 2;

      dx *= hw;
      dy *= hw;

      // TODO: why Infinity?
      // if (Number.isFinite(m)) {
      //   dx *= m;
      //   dy *= m;
      // }
      
      points[i] = new THREE.Vector2( x - dx, y - dy );
      points[len - 1 - i] = new THREE.Vector2( x + dx, y + dy );
    });

    return new THREE.Shape(points);
  }

  // outline only, no hole
  const polygonToOutlineShape = polygon => expandLineToShape(polygon[0]);

  const shapeToExtrudeMesh = shape => new THREE.Mesh(
    new THREE.ExtrudeBufferGeometry(shape, {
      depth,
      bevelEnabled: false
    }),
    [mat, sideMat]
  );

  const shapeToPlaneMesh = shape => new THREE.Mesh(
    new THREE.ShapeBufferGeometry(shape),
    mat
  );

  const polygonToShape = shapeType === Constants.Surface ? polygonToSurfaceShape : polygonToOutlineShape;
  const shapeToMesh = geomType === Constants.Extrude ? shapeToExtrudeMesh : shapeToPlaneMesh;

  const create = () => {
    const group = new THREE.Group();

    turf.featureEach(geojson, (feature) => {
      if (featureFilter && !featureFilter(feature)) {
        return;
      } 
      const type = turf.getType(feature);
      const name = feature.properties.name;

      if (!supportedFeatureTypes[type]) {
        return;
      }

      if (name && name !== '中国' && simplifyOptions) {
        feature = turf.simplify(feature, simplifyOptions);
      }

      let coordinates = feature.geometry.coordinates;

      if (type === FeatureTypes.MultiPolygon || type === FeatureTypes.Polygon) {
        if (type === FeatureTypes.MultiPolygon) {
          // Tix abnormal MultiPolygon.
          // Too many sub rings are not presenting holes.
          // It's bug in geojson.
          if (coordinates.length === 1 && coordinates[0].length > 10) {
            // console.log(name, feature);
            // re-map rings to normal polygons
            coordinates = coordinates[0].map(polygon => [polygon]);
          }
        }

        if (type === FeatureTypes.Polygon) {
          coordinates = [coordinates];
        }

        coordinates.forEach(polygon => {
          if (minPolygonArea) {
            let area;
            try {
              area = turf.area(turf.polygon(polygon));
            } catch (e) {
              // line, maybe
            }

            if (!area || area < minPolygonArea) {
              return;
            }
          }

          const shape = polygonToShape(polygon);
          const mesh = shapeToMesh(shape);
          mesh.name = name;

          group.add(mesh);
        });
      } else if (type === FeatureTypes.MultiLineString || type === FeatureTypes.LineString) {

        if (type === FeatureTypes.LineString) {
          coordinates = [coordinates];
        }

        coordinates.forEach(line => {
          const shape = expandLineToShape(line);
          const mesh = shapeToMesh(shape);
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
