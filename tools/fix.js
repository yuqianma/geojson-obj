const turf = require('@turf/turf');
const path = require('path');
const fs = require('fs');

const [,, from, to] = process.argv;

const originGeojson = JSON.parse(fs.readFileSync(from).toString());

const Excludes = {
  '海南省': 1,
  '台湾省': 1,
  '澳门特别行政区': 1,
  '香港特别行政区': 1
};

turf.featureEach(originGeojson, (currentFeature, featureIndex) => {

  if (currentFeature.properties.name) {
    const name = currentFeature.properties.name;
    if (Excludes[name]) {
      return
    }
    console.log(name);
    const type = turf.getType(currentFeature);
    if (type === 'MultiPolygon') {
      currentFeature.geometry.coordinates = 
      currentFeature.geometry.coordinates.filter(polygon => {
        return polygon[0].length > 10;
      });
      if (currentFeature.geometry.coordinates.length === 0) {
        throw 'empty:' + name
      } 
    } else if (type === 'Polygon') {
      
    }
  }
  
});

fs.writeFileSync(to, JSON.stringify(originGeojson));
