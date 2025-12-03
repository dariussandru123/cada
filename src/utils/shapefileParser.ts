import JSZip from 'jszip';
import * as shapefile from 'shapefile';
import proj4 from 'proj4';
import { LatLngBounds } from 'leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

// Definim proiecția Stereo 70 (EPSG:31700) folosită în România
proj4.defs('EPSG:31700', '+proj=sterea +lat_0=46 +lon_0=25 +k=0.99975 +x_0=500000 +y_0=500000 +ellps=krass +towgs84=33.4,-146.6,-76.3,-0.359,-0.053,0.844,-0.84 +units=m +no_defs');

// WGS84 (EPSG:4326) - sistemul folosit de Leaflet
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

export interface ShapefileLayer {
  name: string;
  geoJson: FeatureCollection;
  color: string;
}

const LAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export async function parseShapefile(file: File): Promise<{
  layers: ShapefileLayer[];
  bounds: LatLngBounds;
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  let shpFiles: { name: string; shp: ArrayBuffer; dbf?: ArrayBuffer }[] = [];

  if (file.name.endsWith('.zip')) {
    console.log('📦 Extracting ZIP archive...');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Find all .shp files in the ZIP
    const shpFileNames = Object.keys(zip.files).filter(name => name.endsWith('.shp'));
    console.log(`Found ${shpFileNames.length} shapefile(s):`, shpFileNames);
    
    if (shpFileNames.length === 0) {
      throw new Error('Arhiva nu conține fișiere .shp');
    }
    
    // Extract each shapefile with its corresponding .dbf
    for (const shpFileName of shpFileNames) {
      const baseName = shpFileName.replace('.shp', '');
      const dbfFileName = baseName + '.dbf';
      
      console.log(`📄 Extracting ${shpFileName}...`);
      const shpBuffer = await zip.files[shpFileName].async('arraybuffer');
      
      let dbfBuffer: ArrayBuffer | undefined;
      if (zip.files[dbfFileName]) {
        console.log(`📄 Extracting ${dbfFileName}...`);
        dbfBuffer = await zip.files[dbfFileName].async('arraybuffer');
      }
      
      // Extract just the filename without path
      const name = shpFileName.split('/').pop()?.replace('.shp', '') || shpFileName;
      
      shpFiles.push({
        name,
        shp: shpBuffer,
        dbf: dbfBuffer,
      });
    }
  } else if (file.name.endsWith('.shp')) {
    console.log('📄 Processing single .shp file...');
    shpFiles.push({
      name: file.name.replace('.shp', ''),
      shp: arrayBuffer,
    });
  } else {
    throw new Error('Format de fișier nesuportat. Folosiți .shp sau .zip');
  }

  console.log(`🗺️ Parsing ${shpFiles.length} shapefile(s)...`);
  
  // Parse each shapefile
  const layers: ShapefileLayer[] = [];
  let allFeatures: Feature[] = [];
  
  for (let i = 0; i < shpFiles.length; i++) {
    const { name, shp, dbf } = shpFiles[i];
    console.log(`🔄 Parsing layer ${i + 1}/${shpFiles.length}: ${name}`);
    
    try {
      const features: Feature[] = [];
      
      const source = dbf 
        ? await shapefile.open(shp, dbf)
        : await shapefile.open(shp);
      
      let result = await source.read();
      let featureCount = 0;
      let skippedCount = 0;
      
      while (!result.done) {
        if (result.value) {
          const feature = result.value as Feature;
          
          // Check if feature has valid geometry
          if (feature && feature.geometry && feature.geometry.type) {
            features.push(feature);
            featureCount++;
          } else {
            console.warn(`⚠️ Skipping invalid feature in ${name}:`, feature);
            skippedCount++;
          }
        }
        result = await source.read();
      }
      
      console.log(`✅ Layer "${name}": ${featureCount} valid features, ${skippedCount} skipped`);
      
      if (features.length > 0) {
        const geoJson: FeatureCollection = {
          type: 'FeatureCollection',
          features: features,
        };
        
        // Transform coordinates
        const transformedGeoJson = transformCoordinates(geoJson);
        
        layers.push({
          name,
          geoJson: transformedGeoJson,
          color: LAYER_COLORS[i % LAYER_COLORS.length],
        });
        
        allFeatures.push(...transformedGeoJson.features);
      } else {
        console.warn(`⚠️ Layer "${name}" has no valid features, skipping`);
      }
    } catch (layerError: any) {
      console.error(`❌ Error parsing layer "${name}":`, layerError);
      console.error('Layer error details:', {
        name: layerError.name,
        message: layerError.message,
        stack: layerError.stack
      });
      // Continue with other layers instead of failing completely
      console.log(`⏭️ Skipping layer "${name}" and continuing with others...`);
    }
  }

  if (layers.length === 0) {
    throw new Error('Niciun strat valid nu a putut fi încărcat din fișier');
  }

  // Calculate bounds from all features
  const combinedGeoJson: FeatureCollection = {
    type: 'FeatureCollection',
    features: allFeatures,
  };
  
  const bounds = calculateBounds(combinedGeoJson);
  
  console.log(`✅ Successfully parsed ${layers.length} layer(s)`);
  console.log('Bounds:', bounds);

  return { layers, bounds };
}

function transformCoordinates(geoJson: FeatureCollection): FeatureCollection {
  const transformed: FeatureCollection = {
    type: 'FeatureCollection',
    features: geoJson.features.map((feature) => {
      // Additional safety check
      if (!feature || !feature.geometry || !feature.geometry.type) {
        console.warn('⚠️ Skipping feature with invalid geometry:', feature);
        return null;
      }
      
      try {
        return {
          ...feature,
          geometry: transformGeometry(feature.geometry),
        };
      } catch (err) {
        console.error('❌ Error transforming feature:', err, feature);
        return null;
      }
    }).filter((f): f is Feature => f !== null), // Remove null features
  };

  return transformed;
}

function transformGeometry(geometry: Geometry): Geometry {
  if (!geometry || !geometry.type) {
    throw new Error('Invalid geometry: missing type');
  }

  try {
    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates;
      const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
      return {
        type: 'Point',
        coordinates: [lng, lat],
      };
    } else if (geometry.type === 'LineString') {
      return {
        type: 'LineString',
        coordinates: geometry.coordinates.map(([x, y]) => {
          const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
          return [lng, lat];
        }),
      };
    } else if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) =>
          ring.map(([x, y]) => {
            const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
            return [lng, lat];
          })
        ),
      };
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) =>
            ring.map(([x, y]) => {
              const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
              return [lng, lat];
            })
          )
        ),
      };
    } else if (geometry.type === 'MultiLineString') {
      return {
        type: 'MultiLineString',
        coordinates: geometry.coordinates.map((line) =>
          line.map(([x, y]) => {
            const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
            return [lng, lat];
          })
        ),
      };
    } else if (geometry.type === 'MultiPoint') {
      return {
        type: 'MultiPoint',
        coordinates: geometry.coordinates.map(([x, y]) => {
          const [lng, lat] = proj4('EPSG:31700', 'EPSG:4326', [x, y]);
          return [lng, lat];
        }),
      };
    }
  } catch (err) {
    console.error('❌ Error transforming geometry type:', geometry.type, err);
    throw err;
  }

  return geometry;
}

function calculateBounds(geoJson: FeatureCollection): LatLngBounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  geoJson.features.forEach((feature) => {
    if (!feature || !feature.geometry || !feature.geometry.type) {
      return; // Skip invalid features
    }

    try {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      } else if (feature.geometry.type === 'LineString') {
        feature.geometry.coordinates.forEach(([lng, lat]) => {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      } else if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((ring) => {
          ring.forEach(([lng, lat]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          });
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            ring.forEach(([lng, lat]) => {
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
            });
          });
        });
      } else if (feature.geometry.type === 'MultiLineString') {
        feature.geometry.coordinates.forEach((line) => {
          line.forEach(([lng, lat]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          });
        });
      } else if (feature.geometry.type === 'MultiPoint') {
        feature.geometry.coordinates.forEach(([lng, lat]) => {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      }
    } catch (err) {
      console.error('❌ Error calculating bounds for feature:', err, feature);
    }
  });

  return new LatLngBounds([minLat, minLng], [maxLat, maxLng]);
}
