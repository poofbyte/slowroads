import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

export const TIMES_OF_DAY = {
  early_morning: {
    id: 'early_morning',
    name: 'Early Morning',
    skyTop: '#0a1226',
    skyBottom: '#2e3b5e',
    fogColor: '#1d2745',
    fogDensity: 0.0048,
    sunColor: '#8ba2cc',
    sunIntensity: 0.45,
    sunElevation: 6,
    sunAzimuth: 80,
    ambientColor: '#18223c',
    ambientIntensity: 0.42,
    isNight: false
  },
  sunrise: {
    id: 'sunrise',
    name: 'Sunrise',
    skyTop: '#24224a',
    skyBottom: '#f58e47',
    fogColor: '#bd6852',
    fogDensity: 0.0035,
    sunColor: '#ff823a',
    sunIntensity: 1.5,
    sunElevation: 12,
    sunAzimuth: 95,
    ambientColor: '#6e4242',
    ambientIntensity: 0.62,
    isNight: false
  },
  morning: {
    id: 'morning',
    name: 'Morning',
    skyTop: '#3b82d4',
    skyBottom: '#bfe0f7',
    fogColor: '#b2d6f2',
    fogDensity: 0.0028,
    sunColor: '#fffbe6',
    sunIntensity: 1.35,
    sunElevation: 36,
    sunAzimuth: 120,
    ambientColor: '#dce9f5',
    ambientIntensity: 0.68,
    isNight: false
  },
  afternoon: {
    id: 'afternoon',
    name: 'Afternoon',
    skyTop: '#2563eb',
    skyBottom: '#93c5fd',
    fogColor: '#bfdbfe',
    fogDensity: 0.0024,
    sunColor: '#ffffff',
    sunIntensity: 1.45,
    sunElevation: 58,
    sunAzimuth: 170,
    ambientColor: '#e2e8f0',
    ambientIntensity: 0.72,
    isNight: false
  },
  golden_hour: {
    id: 'golden_hour',
    name: 'Golden Hour',
    skyTop: '#4338ca',
    skyBottom: '#fb923c',
    fogColor: '#e07a52',
    fogDensity: 0.0030,
    sunColor: '#f97316',
    sunIntensity: 1.6,
    sunElevation: 18,
    sunAzimuth: 240,
    ambientColor: '#9a3412',
    ambientIntensity: 0.65,
    isNight: false
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    skyTop: '#31144a',
    skyBottom: '#ef4444',
    fogColor: '#99354e',
    fogDensity: 0.0034,
    sunColor: '#dc2626',
    sunIntensity: 1.4,
    sunElevation: 8,
    sunAzimuth: 265,
    ambientColor: '#581c87',
    ambientIntensity: 0.58,
    isNight: false
  },
  twilight: {
    id: 'twilight',
    name: 'Twilight',
    skyTop: '#0f172a',
    skyBottom: '#334155',
    fogColor: '#1e293b',
    fogDensity: 0.0040,
    sunColor: '#38bdf8',
    sunIntensity: 0.28,
    sunElevation: 2,
    sunAzimuth: 285,
    ambientColor: '#1e293b',
    ambientIntensity: 0.38,
    isNight: false
  },
  night: {
    id: 'night',
    name: 'Night',
    skyTop: '#020617',
    skyBottom: '#0b1120',
    fogColor: '#070c18',
    fogDensity: 0.0045,
    sunColor: '#94a3b8',
    sunIntensity: 0.32,
    sunElevation: 38,
    sunAzimuth: 180,
    ambientColor: '#0f172a',
    ambientIntensity: 0.32,
    isNight: true
  }
};

export const WEATHER_TYPES = {
  clear: {
    id: 'clear',
    name: 'Clear',
    fogMultiplier: 1.0,
    lightMultiplier: 1.0,
    gripMultiplier: 1.0,
    hasPrecipitation: false,
    surfaceType: 'dry'
  },
  cloudy: {
    id: 'cloudy',
    name: 'Partly Cloudy',
    fogMultiplier: 1.15,
    lightMultiplier: 0.92,
    gripMultiplier: 1.0,
    hasPrecipitation: false,
    surfaceType: 'dry'
  },
  overcast: {
    id: 'overcast',
    name: 'Overcast',
    fogMultiplier: 1.35,
    lightMultiplier: 0.82,
    gripMultiplier: 0.96,
    hasPrecipitation: false,
    surfaceType: 'dry'
  },
  light_rain: {
    id: 'light_rain',
    name: 'Light Rain',
    fogMultiplier: 1.55,
    lightMultiplier: 0.78,
    gripMultiplier: 0.74,
    hasPrecipitation: true,
    precipType: 'rain',
    particleCount: 1400,
    surfaceType: 'wet'
  },
  heavy_rain: {
    id: 'heavy_rain',
    name: 'Heavy Rain',
    fogMultiplier: 2.1,
    lightMultiplier: 0.65,
    gripMultiplier: 0.58,
    hasPrecipitation: true,
    precipType: 'rain',
    particleCount: 2600,
    surfaceType: 'wet'
  },
  snow: {
    id: 'snow',
    name: 'Snowfall',
    fogMultiplier: 1.7,
    lightMultiplier: 0.85,
    gripMultiplier: 0.38,
    hasPrecipitation: true,
    precipType: 'snow',
    particleCount: 1600,
    surfaceType: 'snow'
  },
  fog: {
    id: 'fog',
    name: 'Dense Fog',
    fogMultiplier: 3.4,
    lightMultiplier: 0.72,
    gripMultiplier: 0.88,
    hasPrecipitation: false,
    surfaceType: 'wet'
  },
  storm: {
    id: 'storm',
    name: 'Stormy',
    fogMultiplier: 2.4,
    lightMultiplier: 0.55,
    gripMultiplier: 0.52,
    hasPrecipitation: true,
    precipType: 'rain',
    particleCount: 3000,
    surfaceType: 'wet'
  }
};

export const SEASONS = {
  autumn: {
    name: 'Autumn',
    skyTop: '#d17d4a',
    skyBottom: '#fbe2c5',
    fogColor: '#f1c8a4',
    fogDensity: 0.0034,
    sunColor: '#ffa84a',
    sunIntensity: 1.4,
    sunElevation: 28,
    sunAzimuth: 140,
    ambientColor: '#f5d9c2',
    ambientIntensity: 0.65,
    terrain: {
      grass: 0x93783a,
      grassDry: 0xb59848,
      rock: 0x6e6357,
      dirt: 0x856b49
    },
    scenery: {
      pineColor: 0x243e26,
      deciduousColor: 0xd97c27,
      birchColor: 0xebb134,
      bushColor: 0xb56926,
      rockColor: 0x6b6255
    },
    night: false
  },
  summer: {
    name: 'Summer',
    skyTop: '#4ea5f5',
    skyBottom: '#cbe7fc',
    fogColor: '#c5e4fa',
    fogDensity: 0.0030,
    sunColor: '#fff9ea',
    sunIntensity: 1.35,
    sunElevation: 48,
    sunAzimuth: 110,
    ambientColor: '#e0f2fe',
    ambientIntensity: 0.7,
    terrain: {
      grass: 0x487d37,
      grassDry: 0x6e9645,
      rock: 0x6e6e6a,
      dirt: 0x7a6c52
    },
    scenery: {
      pineColor: 0x1f4724,
      deciduousColor: 0x3d782e,
      birchColor: 0x5a9136,
      bushColor: 0x477833,
      rockColor: 0x6b6b66
    },
    night: false
  },
  winter: {
    name: 'Winter',
    skyTop: '#94b3cc',
    skyBottom: '#e2edf5',
    fogColor: '#d6e6f2',
    fogDensity: 0.0038,
    sunColor: '#edf6fc',
    sunIntensity: 1.15,
    sunElevation: 22,
    sunAzimuth: 160,
    ambientColor: '#cfdfeb',
    ambientIntensity: 0.65,
    terrain: {
      grass: 0xdee7ed,
      grassDry: 0xb8cddb,
      rock: 0x5d6870,
      dirt: 0x7a838a
    },
    scenery: {
      pineColor: 0x223631,
      deciduousColor: 0xe0ebf2,
      birchColor: 0xdde7ee,
      bushColor: 0x9fb8c9,
      rockColor: 0x556066
    },
    night: false
  },
  sunset: {
    name: 'Sunset',
    skyTop: '#3b2569',
    skyBottom: '#f56e3b',
    fogColor: '#a65463',
    fogDensity: 0.0032,
    sunColor: '#ff4c1a',
    sunIntensity: 1.5,
    sunElevation: 12,
    sunAzimuth: 220,
    ambientColor: '#6e3c54',
    ambientIntensity: 0.55,
    terrain: {
      grass: 0x73483b,
      grassDry: 0x8c5b42,
      rock: 0x524248,
      dirt: 0x634237
    },
    scenery: {
      pineColor: 0x2b1e2e,
      deciduousColor: 0x8a3928,
      birchColor: 0xb8522e,
      bushColor: 0x6e2f2e,
      rockColor: 0x4f3d44
    },
    night: false
  },
  night: {
    name: 'Night',
    skyTop: '#060a16',
    skyBottom: '#10172e',
    fogColor: '#0a1024',
    fogDensity: 0.0042,
    sunColor: '#6f8fc2',
    sunIntensity: 0.4,
    sunElevation: 35,
    sunAzimuth: 180,
    ambientColor: '#121933',
    ambientIntensity: 0.35,
    terrain: {
      grass: 0x162420,
      grassDry: 0x1d2e26,
      rock: 0x1c1e29,
      dirt: 0x20242b
    },
    scenery: {
      pineColor: 0x0f1c14,
      deciduousColor: 0x142217,
      birchColor: 0x1b2829,
      bushColor: 0x111c16,
      rockColor: 0x1a1d26
    },
    night: true
  }
};

/**
 * Atmospheric Environment & Weather Manager
 */
export class EnvironmentManager {
  constructor(scene, renderer, roadManager, terrainManager, sceneryManager) {
    this.scene = scene;
    this.renderer = renderer;
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;
    this.sceneryManager = sceneryManager;

    this.currentTimeOfDay = 'morning';
    this.currentWeather = 'clear';
    this.currentSeason = 'autumn';
    this.autoDayNightCycle = false;
    this.timeCycleHour = 10.0; // 0 to 24 hours

    this.initSkyDome();
    this.initLighting();
    this.initFog();
    this.initPrecipitation();

    this.applyTimeOfDay('morning');
    this.applyWeather('clear');
  }

  initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(680, 24, 16);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#3b82d4') },
        bottomColor: { value: new THREE.Color('#bfe0f7') },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyDome);

    // Starfield for night sky
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random());
      const r = 660;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.0
    });
    this.starfield = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starfield);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1536;
    this.sunLight.shadow.mapSize.height = 1536;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 420;

    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.02;

    this.sunTarget = new THREE.Object3D();
    this.sunLight.target = this.sunTarget;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunTarget);
  }

  initFog() {
    this.scene.fog = new THREE.FogExp2('#b2d6f2', 0.0028);
  }

  /**
   * High-performance 3D Precipitation Particle Systems (Rain streaks & Snowflakes)
   */
  initPrecipitation() {
    // 1. Rain streaks
    const rainCount = 2800;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 80;
      rainPositions[i * 3 + 1] = Math.random() * 45;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainMat = new THREE.PointsMaterial({
      color: 0xc4e2ff,
      size: 0.45,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    this.rainPoints = new THREE.Points(rainGeo, this.rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // 2. Snowflakes
    const snowCount = 2000;
    const snowPositions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 80;
      snowPositions[i * 3 + 1] = Math.random() * 45;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    this.snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.85,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.snowPoints = new THREE.Points(snowGeo, this.snowMat);
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  applyTimeOfDay(timeId) {
    const tod = TIMES_OF_DAY[timeId] || TIMES_OF_DAY.morning;
    this.currentTimeOfDay = tod.id;

    const weather = WEATHER_TYPES[this.currentWeather] || WEATHER_TYPES.clear;

    // Apply Sky
    this.skyMat.uniforms.topColor.value.set(tod.skyTop);
    this.skyMat.uniforms.bottomColor.value.set(tod.skyBottom);
    this.starMat.opacity = tod.isNight ? 0.85 : 0.0;

    // Apply Sunlight & Shadow direction
    const lightMult = weather.lightMultiplier;
    this.sunLight.color.set(tod.sunColor);
    this.sunLight.intensity = tod.sunIntensity * lightMult;

    const radAz = (tod.sunAzimuth * Math.PI) / 180;
    const radEl = (tod.sunElevation * Math.PI) / 180;
    const dist = 140;

    this.sunLightOffset = new THREE.Vector3(
      Math.sin(radAz) * Math.cos(radEl) * dist,
      Math.sin(radEl) * dist,
      Math.cos(radAz) * Math.cos(radEl) * dist
    );

    // Apply Ambient
    this.ambientLight.color.set(tod.ambientColor);
    this.ambientLight.intensity = tod.ambientIntensity * lightMult;

    // Apply Fog
    this.scene.fog.color.set(tod.fogColor);
    this.scene.fog.density = tod.fogDensity * weather.fogMultiplier;
    this.renderer.setClearColor(tod.fogColor);
  }

  applyWeather(weatherId) {
    const weather = WEATHER_TYPES[weatherId] || WEATHER_TYPES.clear;
    this.currentWeather = weather.id;

    // Toggle Precipitation
    if (weather.hasPrecipitation) {
      if (weather.precipType === 'rain') {
        this.rainPoints.visible = true;
        this.snowPoints.visible = false;
      } else if (weather.precipType === 'snow') {
        this.snowPoints.visible = true;
        this.rainPoints.visible = false;
      }
    } else {
      this.rainPoints.visible = false;
      this.snowPoints.visible = false;
    }

    // Reapply time of day with weather lighting & fog adjustments
    this.applyTimeOfDay(this.currentTimeOfDay);

    // Update Road Surface Material (Asphalt dry/wet/snow)
    if (this.roadManager) {
      const roadTex = TextureGenerator.createAsphaltTexture(weather.surfaceType);
      const shldTex = TextureGenerator.createShoulderTexture(weather.surfaceType);

      if (this.roadManager.roadMaterial) {
        this.roadManager.roadMaterial.map = roadTex;
        this.roadManager.roadMaterial.roughness = (weather.surfaceType === 'wet' ? 0.22 : 0.88);
        this.roadManager.roadMaterial.metalness = (weather.surfaceType === 'wet' ? 0.25 : 0.08);
        this.roadManager.roadMaterial.needsUpdate = true;
      }
      if (this.roadManager.shoulderMaterial) {
        this.roadManager.shoulderMaterial.map = shldTex;
        this.roadManager.shoulderMaterial.needsUpdate = true;
      }
    }
  }

  applySeason(seasonKey) {
    const s = SEASONS[seasonKey] || SEASONS.autumn;
    this.currentSeason = seasonKey;

    if (this.terrainManager) {
      this.terrainManager.setSeasonColors(s.terrain);
    }
    if (this.sceneryManager) {
      this.sceneryManager.setSeasonColors(s.scenery);
    }
  }

  isNight() {
    const tod = TIMES_OF_DAY[this.currentTimeOfDay];
    return tod ? tod.isNight : false;
  }

  update(carPosition, dt = 0.016) {
    // Dynamic Day-Night Progression if enabled
    if (this.autoDayNightCycle) {
      this.timeCycleHour = (this.timeCycleHour + dt * 0.12) % 24.0;
      if (this.timeCycleHour >= 5 && this.timeCycleHour < 7) {
        this.applyTimeOfDay('early_morning');
      } else if (this.timeCycleHour >= 7 && this.timeCycleHour < 9) {
        this.applyTimeOfDay('sunrise');
      } else if (this.timeCycleHour >= 9 && this.timeCycleHour < 14) {
        this.applyTimeOfDay('morning');
      } else if (this.timeCycleHour >= 14 && this.timeCycleHour < 17) {
        this.applyTimeOfDay('afternoon');
      } else if (this.timeCycleHour >= 17 && this.timeCycleHour < 19) {
        this.applyTimeOfDay('golden_hour');
      } else if (this.timeCycleHour >= 19 && this.timeCycleHour < 21) {
        this.applyTimeOfDay('sunset');
      } else if (this.timeCycleHour >= 21 && this.timeCycleHour < 22) {
        this.applyTimeOfDay('twilight');
      } else {
        this.applyTimeOfDay('night');
      }
    }

    // Sky Dome and starfield center on vehicle
    this.skyDome.position.copy(carPosition);
    this.starfield.position.copy(carPosition);

    // Directional sunlight follows vehicle smoothly
    if (this.sunLightOffset) {
      this.sunLight.position.copy(carPosition).add(this.sunLightOffset);
      this.sunTarget.position.copy(carPosition);
    }

    // Precipitation Particles Animation (Rain / Snow)
    if (this.rainPoints && this.rainPoints.visible) {
      this.rainPoints.position.copy(carPosition);
      const pos = this.rainPoints.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i) - 34.0 * dt;
        if (y < -3.0) y = 42.0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.snowPoints && this.snowPoints.visible) {
      this.snowPoints.position.copy(carPosition);
      const pos = this.snowPoints.geometry.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i) - 8.5 * dt;
        let x = pos.getX(i) + Math.sin(pos.getY(i) * 0.1) * 2.0 * dt;
        if (y < -3.0) y = 42.0;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
  }
}
