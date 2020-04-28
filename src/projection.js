const EarthRadius = 6378137;

export const get2DProjection = (geojson, scale) => {
  const bbox = turf.bbox(geojson);
  const [ax, ay, bx, by] = bbox;

  // CHART-10454, support longitude exceeds 180
  // adjust wrapped projection 

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

  const unitProjection = d3.geoMercator()
                           .center(center)
                           .rotate(rotation)
                           .scale(EarthRadius * scale)
                           .translate([0, 0]);

  const lonLatOrigin = unitProjection([0, 0]);
  const proj = unitProjection.translate([-lonLatOrigin[0], -lonLatOrigin[1]]);

  proj.boundedLongitude = boundedLongitude;
  proj.boundedWidth = proj([boundedLongitude, 0])[0];

  return proj;
};
