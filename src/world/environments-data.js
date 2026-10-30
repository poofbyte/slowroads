/**
 * Expanded Driving Environments Configuration
 * 5 distinct scenic procedural landscapes with unique terrain, vegetation, and road geometry
 */
export const ENVIRONMENTS = {
  mountains: {
    id: 'mountains',
    name: 'Alpine Mountain Pass',
    desc: 'Steep uphill climbs, winding hairpin turns, dramatic cliffside drops, and valley bridges',
    elevScale: 1.9,
    curveScale: 1.45,
    terrain: {
      grass: 0x5a6952,
      grassDry: 0x827c5e,
      rock: 0x4a4f54,
      dirt: 0x615a4c
    },
    scenery: {
      pineColor: 0x1a2e20,
      deciduousColor: 0x6e7845,
      birchColor: 0x9fa86c,
      bushColor: 0x475438,
      rockColor: 0x52575c
    },
    defaultTime: 'morning',
    defaultWeather: 'clear'
  },
  forest: {
    id: 'forest',
    name: 'Forest & Countryside',
    desc: 'Rolling countryside hills, lush pine and birch woods, and gentle flowing asphalt',
    elevScale: 1.0,
    curveScale: 1.0,
    terrain: {
      grass: 0x3d702d,
      grassDry: 0x5f8737,
      rock: 0x615d54,
      dirt: 0x705d45
    },
    scenery: {
      pineColor: 0x1f4724,
      deciduousColor: 0x3a7828,
      birchColor: 0x52912f,
      bushColor: 0x407329,
      rockColor: 0x5e5a52
    },
    defaultTime: 'afternoon',
    defaultWeather: 'clear'
  },
  snow: {
    id: 'snow',
    name: 'Snowy Winter Peaks',
    desc: 'Snow-covered mountain highway, frost-laden conifers, icy road surfaces, and reduced traction',
    elevScale: 1.4,
    curveScale: 1.15,
    terrain: {
      grass: 0xe5eef5,
      grassDry: 0xc8d8e4,
      rock: 0x6b7782,
      dirt: 0x8f9aa3
    },
    scenery: {
      pineColor: 0x223631,
      deciduousColor: 0xe2ecf2,
      birchColor: 0xdce6ed,
      bushColor: 0xb0c4d4,
      rockColor: 0x5d6973
    },
    defaultTime: 'morning',
    defaultWeather: 'snow'
  },
  desert: {
    id: 'desert',
    name: 'Red Rock Desert',
    desc: 'High-speed sweeping highway cutting through warm sandstone canyons, mesas, and desert scrub',
    elevScale: 1.1,
    curveScale: 0.75,
    terrain: {
      grass: 0xbf7854,
      grassDry: 0xd98c66,
      rock: 0x8a452c,
      dirt: 0xaa5a3a
    },
    scenery: {
      pineColor: 0x5e5e3a,
      deciduousColor: 0x997542,
      birchColor: 0xb58c50,
      bushColor: 0x806b3a,
      rockColor: 0x82422c
    },
    defaultTime: 'golden_hour',
    defaultWeather: 'clear'
  },
  coast: {
    id: 'coast',
    name: 'Pacific Coastal Highway',
    desc: 'Curving sea cliffs and ocean breezes alongside coastal rock arches',
    elevScale: 0.95,
    curveScale: 1.25,
    terrain: {
      grass: 0x456b3e,
      grassDry: 0x73874e,
      rock: 0x525254,
      dirt: 0x73634c
    },
    scenery: {
      pineColor: 0x1e3626,
      deciduousColor: 0x477038,
      birchColor: 0x6a944a,
      bushColor: 0x3d6631,
      rockColor: 0x545759
    },
    defaultTime: 'sunset',
    defaultWeather: 'clear'
  }
};
