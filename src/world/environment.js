import * as THREE from 'three';

export const SEASONS = {
  autumn: {
    name: 'Autumn',
    skyTop: '#d17d4a',
    skyBottom: '#fbe2c5',
    fogColor: '#f1c8a4',
    fogDensity: 0.0034,
    sunColor: '#ffa84a',
    sunIntensity: 1.4,
    sunElevation: 28, // degrees
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
    sunColor: '#6f8fc2', // Pale moonlight
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

export class EnvironmentManager {
  constructor(scene, renderer, roadManager, terrainManager, sceneryManager) {
    this.scene = scene;
    this.renderer = renderer;
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;
    this.sceneryManager = sceneryManager;

    this.currentSeasonKey = 'autumn';

    // Sky dome
    this.skyDome = this.createSkyDome();
    this.scene.add(this.skyDome);

    // Starfield for night
    this.stars = this.createStarfield();
    this.scene.add(this.stars);

    // Fog
    this.fog = new THREE.FogExp2(0xf1c8a4, 0.0034);
    this.scene.fog = this.fog;

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xffa84a, 1.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.bias = -0.0005;

    // Shadow bounds centered around the vehicle
    const d = 45;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere ambient light
    this.ambientLight = new THREE.HemisphereLight(0xf5d9c2, 0x826d59, 0.65);
    this.scene.add(this.ambientLight);

    // Apply default season
    this.applySeason(this.currentSeasonKey);
  }

  createSkyDome() {
    const geo = new THREE.SphereGeometry(700, 32, 16);
    // Invert geometry so inside is visible
    geo.scale(-1, 1, 1);

    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float factor = max(0.0, min(1.0, (h + 0.05) * 1.5));
        gl_FragColor = vec4(mix(bottomColor, topColor, factor), 1.0);
      }
    `;

    this.skyUniforms = {
      topColor: { value: new THREE.Color(SEASONS.autumn.skyTop) },
      bottomColor: { value: new THREE.Color(SEASONS.autumn.skyBottom) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    return new THREE.Mesh(geo, mat);
  }

  createStarfield() {
    const starCount = 1200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Hemisphere above ground
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.1);
      const r = 680;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0
    });

    this.starMaterial = mat;
    return new THREE.Points(geo, mat);
  }

  applySeason(seasonKey) {
    const s = SEASONS[seasonKey] || SEASONS.autumn;
    this.currentSeasonKey = seasonKey;

    // Sky colors
    this.skyUniforms.topColor.value.set(s.skyTop);
    this.skyUniforms.bottomColor.value.set(s.skyBottom);

    // Fog
    this.fog.color.set(s.fogColor);
    this.fog.density = s.fogDensity;
    this.renderer.setClearColor(this.fog.color);

    // Sun light
    this.sunLight.color.set(s.sunColor);
    this.sunLight.intensity = s.sunIntensity;

    // Ambient
    this.ambientLight.color.set(s.ambientColor);
    this.ambientLight.intensity = s.ambientIntensity;

    // Stars opacity
    this.starMaterial.opacity = s.night ? 0.9 : 0.0;

    // Update terrain & scenery
    if (this.terrainManager) {
      this.terrainManager.setSeasonColors(s.terrain);
    }
    if (this.sceneryManager) {
      this.sceneryManager.setSeasonColors(s.scenery);
    }
  }

  update(carPosition) {
    const s = SEASONS[this.currentSeasonKey];

    // Compute sun direction from azimuth and elevation
    const radAz = THREE.MathUtils.degToRad(s.sunAzimuth);
    const radEl = THREE.MathUtils.degToRad(s.sunElevation);

    const sunDist = 120;
    const sunX = Math.cos(radAz) * Math.cos(radEl) * sunDist;
    const sunY = Math.sin(radEl) * sunDist;
    const sunZ = Math.sin(radAz) * Math.cos(radEl) * sunDist;

    // Move sun light and target to follow the car seamlessly
    this.sunLight.position.set(
      carPosition.x + sunX,
      carPosition.y + sunY,
      carPosition.z + sunZ
    );
    this.sunLight.target.position.copy(carPosition);
    this.sunLight.target.updateMatrixWorld();

    // Center sky dome on player
    this.skyDome.position.copy(carPosition);
    this.stars.position.copy(carPosition);
  }

  isNight() {
    return SEASONS[this.currentSeasonKey].night;
  }
}
