import './style.css';
import * as THREE from 'three';

import { RoadManager } from './world/road.js';
import { TerrainManager } from './world/terrain.js';
import { SceneryManager } from './world/scenery.js';
import { EnvironmentManager, SEASONS } from './world/environment.js';
import { CarModel } from './vehicle/car.js';
import { VehiclePhysics } from './vehicle/physics.js';
import { SoundEngine } from './vehicle/audio.js';
import { CameraController, CAMERA_MODES } from './camera/camera-controller.js';
import { HUD } from './ui/hud.js';
import { SettingsModal } from './ui/settings.js';

class SlowRoadsApp {
  constructor() {
    this.canvas = document.getElementById('canvas3d');
    this.isPaused = false;
    this.hasStarted = false;

    // Input state
    this.input = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false
    };

    this.keys = {};

    this.initThree();
    this.initWorld();
    this.initVehicle();
    this.initAudio();
    this.initUI();
    this.bindInput();

    // Start render loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.2,
      900
    );

    // Resize handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initWorld() {
    // 1. Road Manager (Spline ribbon, asphalt, curbs, roadside markers)
    this.roadManager = new RoadManager(this.scene, { seed: 108 });

    // 2. Terrain Manager (Chunked terrain with road corridor cut/fill)
    this.terrainManager = new TerrainManager(this.scene, this.roadManager, { seed: 108 });

    // 3. Instanced Scenery (Low-poly pine, deciduous, birch, rocks, bushes)
    this.sceneryManager = new SceneryManager(this.scene, this.roadManager, this.terrainManager, { seed: 108 });

    // 4. Environment (Sky dome, sun light, fog, dynamic seasons)
    this.environmentManager = new EnvironmentManager(
      this.scene,
      this.renderer,
      this.roadManager,
      this.terrainManager,
      this.sceneryManager
    );

    // Initial terrain & scenery generation around origin
    const startPos = new THREE.Vector3(0, 5, 0);
    this.terrainManager.update(startPos);
    this.sceneryManager.update(startPos);
  }

  initVehicle() {
    // 3D Car Model
    this.carModel = new CarModel(this.scene);

    // Vehicle Physics
    this.physics = new VehiclePhysics(this.roadManager, this.terrainManager, {
      steeringSensitivity: 1.0
    });

    // Place vehicle on starting road
    this.physics.resetToNearestRoad();
    this.carModel.update(this.physics, this.environmentManager.isNight());

    // Camera Controller
    this.cameraController = new CameraController(this.camera);
    this.cameraController.update(0.016, this.physics);
  }

  initAudio() {
    this.soundEngine = new SoundEngine();
  }

  initUI() {
    // HUD
    this.hud = new HUD({
      onToggleCamera: () => {
        const mode = this.cameraController.cycleMode();
        this.hud.showToast(`Camera: ${mode}`);
      },
      onToggleCruise: () => {
        this.toggleCruiseControl();
      },
      onReset: () => {
        this.resetVehicle();
      },
      onToggleAudio: () => {
        const muted = this.soundEngine.toggleMute();
        this.hud.setAudioMuted(muted);
        this.hud.showToast(muted ? 'Sound Muted' : 'Sound Enabled');
      },
      onOpenSettings: () => {
        this.settingsModal.open();
      }
    });

    // Settings Modal & Start Screen
    this.settingsModal = new SettingsModal({
      onStart: (chosenSeason) => {
        this.hasStarted = true;
        this.environmentManager.applySeason(chosenSeason);
        this.soundEngine.init();
        this.soundEngine.resume();
        this.hud.showToast(`Driving Started • ${SEASONS[chosenSeason].name} Season`);
      },
      onSeasonChange: (seasonKey) => {
        this.environmentManager.applySeason(seasonKey);
        this.hud.showToast(`Atmosphere: ${SEASONS[seasonKey].name}`);
      },
      onSteeringChange: (val) => {
        this.physics.steeringSensitivity = val;
      },
      onUnitChange: (unit) => {
        this.hud.speedUnit = unit;
      },
      onToggleCruise: () => {
        this.toggleCruiseControl();
      },
      onQualityChange: (quality) => {
        this.applyQuality(quality);
      },
      onVolumeChange: (vol) => {
        this.soundEngine.setMasterVolume(vol);
      },
      onReset: () => {
        this.resetVehicle();
      },
      onPause: (paused) => {
        this.isPaused = paused;
      }
    });
  }

  toggleCruiseControl() {
    this.physics.cruiseControlEnabled = !this.physics.cruiseControlEnabled;
    if (this.physics.cruiseControlEnabled) {
      // Set cruise speed to current speed or default 80 km/h (22.2 m/s)
      this.physics.cruiseSpeed = Math.max(12.0, this.physics.speed);
      const displaySpeed = Math.round(this.physics.cruiseSpeed * (this.hud.speedUnit === 'kmh' ? 3.6 : 2.237));
      this.hud.showToast(`Cruise Control ON (${displaySpeed} ${this.hud.speedUnit.toUpperCase()})`);
    } else {
      this.hud.showToast('Cruise Control OFF');
    }
  }

  resetVehicle() {
    this.physics.resetToNearestRoad();
    this.carModel.update(this.physics, this.environmentManager.isNight());
    this.cameraController.update(0.016, this.physics);
    this.hud.showToast('Vehicle Reset to Road');
  }

  applyQuality(quality) {
    if (quality === 'ultra') {
      this.terrainManager.viewDistance = 4;
      this.renderer.shadowMap.mapSize.set(2048, 2048);
      this.hud.showToast('Quality: Ultra');
    } else if (quality === 'high') {
      this.terrainManager.viewDistance = 3;
      this.renderer.shadowMap.mapSize.set(2048, 2048);
      this.hud.showToast('Quality: High');
    } else if (quality === 'medium') {
      this.terrainManager.viewDistance = 2;
      this.renderer.shadowMap.mapSize.set(1024, 1024);
      this.hud.showToast('Quality: Medium');
    }
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Handle non-driving actions
      if (e.code === 'KeyC') {
        const mode = this.cameraController.cycleMode();
        this.hud.showToast(`Camera: ${mode}`);
      } else if (e.code === 'KeyR') {
        this.resetVehicle();
      } else if (e.code === 'KeyH') {
        this.hud.toggleVisibility();
      } else if (e.code === 'KeyM') {
        const muted = this.soundEngine.toggleMute();
        this.hud.setAudioMuted(muted);
        this.hud.showToast(muted ? 'Sound Muted' : 'Sound Enabled');
      } else if (e.code === 'Escape') {
        this.settingsModal.toggle();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch / click unlock sound
    window.addEventListener('pointerdown', () => {
      if (this.soundEngine) this.soundEngine.resume();
    }, { once: true });
  }

  processDrivingInput() {
    // Throttle: W or ArrowUp
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp']) ? 1 : 0;

    // Brake / Reverse: S or ArrowDown
    const backward = (this.keys['KeyS'] || this.keys['ArrowDown']) ? 1 : 0;

    // Steer: A / ArrowLeft (-1 to left) to D / ArrowRight (+1 to right)
    let steer = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steer -= 1; // Turn left
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steer += 1; // Turn right

    // Handbrake: Space
    const handbrake = !!this.keys['Space'];

    this.input.throttle = forward;
    this.input.brake = backward;
    this.input.steer = steer;
    this.input.handbrake = handbrake;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.hasStarted && !this.isPaused) {
      // 1. Process player input
      this.processDrivingInput();

      // 2. Step physics
      this.physics.update(dt, this.input);

      // 3. Update road generation & streaming
      this.roadManager.update(this.physics.position);

      // 4. Update terrain chunks
      this.terrainManager.update(this.physics.position);

      // 5. Update scenery instanced meshes
      this.sceneryManager.update(this.physics.position);

      // 6. Update atmospheric environment (sun position follows vehicle)
      this.environmentManager.update(this.physics.position);

      // 7. Update car 3D model
      this.carModel.update(this.physics, this.environmentManager.isNight());

      // 8. Update procedural audio
      this.soundEngine.update(this.physics.speed, this.input.throttle, this.physics.isBraking);

      // 9. Update camera controller
      this.cameraController.update(dt, this.physics);

      // 10. Update HUD telemetry
      this.hud.update(this.physics, this.cameraController.currentMode);
    } else if (!this.hasStarted) {
      // Gentle cinematic showcase in start screen
      const dummyCar = {
        position: this.physics.position,
        heading: this.physics.heading,
        speed: 0
      };
      this.cameraController.currentMode = CAMERA_MODES.CINEMATIC;
      this.cameraController.update(dt, dummyCar);
      this.environmentManager.update(this.physics.position);
    }

    // Render frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SlowRoadsApp();
});
