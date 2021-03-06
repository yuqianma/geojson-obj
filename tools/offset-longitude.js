const turf = require('@turf/turf');
const path = require('path');
const fs = require('fs');

const [,, from, to] = process.argv;

const originGeojson = JSON.parse(fs.readFileSync(from).toString());

function mutatePolygon(polygon) {
  let bbox;
  try {
    bbox = turf.bbox(turf.polygon(polygon));
  } catch (e) {
    // nine lines
  }
  if (bbox) {
    const [lon1, ,lon2] = bbox;
    if (lon1 < -18) {
      polygon.forEach(ring => {
        ring.forEach(currentCoord => {
          currentCoord[0] += 360;
          currentCoord[0] %= 360;
        });
      });
    }
  }
}

turf.featureEach(originGeojson, (currentFeature, featureIndex) => {

  if (currentFeature.properties.name) {
    const name = currentFeature.properties.name;
    const type = turf.getType(currentFeature);
    if (type === 'MultiPolygon') {
      if (name === '中国') {
        const coordinates = [];

        currentFeature.geometry.coordinates
        .filter(polygon => {
          return polygon.length !== 10;
        })
        .forEach((polygon, i) => {
          if (polygon.length > 1) {
            console.log('flat china polygon #', i);
            polygon.forEach(ring => coordinates.push([ring]));
          } else {
            coordinates.push(polygon);
          }
        });
        currentFeature.geometry.coordinates = coordinates;
      }
      currentFeature.geometry.coordinates.forEach(mutatePolygon);
    } else if (type === 'Polygon') {
      mutatePolygon(currentFeature.geometry.coordinates);
    }
  }
  
});

fs.writeFileSync(to, JSON.stringify(originGeojson));
