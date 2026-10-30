import './style.css';
import * as THREE from 'three';

import { RoadManager } from './world/road.js';
import { TerrainManager } from './world/terrain.js';
import { SceneryManager } from './world/scenery.js';
import { EnvironmentManager, TIMES_OF_DAY, WEATHER_TYPES } from './world/environment.js';
import { ENVIRONMENTS } from './world/environments-data.js';
import { VEHICLES } from './vehicle/vehicles-data.js';
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

    this.currentVehicleId = 'model_3';
    this.currentEnvironmentId = 'mountains';
    this.currentWeatherId = 'clear';
    this.currentTimeId = 'morning';

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
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.2,
      950
    );

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initWorld() {
    this.roadManager = new RoadManager(this.scene, { seed: 108 });
    this.terrainManager = new TerrainManager(this.scene, this.roadManager, { seed: 108 });
    this.sceneryManager = new SceneryManager(this.scene, this.roadManager, this.terrainManager, { seed: 108 });

    this.environmentManager = new EnvironmentManager(
      this.scene,
      this.renderer,
      this.roadManager,
      this.terrainManager,
      this.sceneryManager
    );

    const startPos = new THREE.Vector3(0, 5, 0);
    this.terrainManager.update(startPos);
    this.sceneryManager.update(startPos);
  }

  initVehicle() {
    this.carModel = new CarModel(this.scene, this.currentVehicleId);

    // Pass sceneryManager so physical collisions are resolved against all trees and rocks
    this.physics = new VehiclePhysics(this.roadManager, this.terrainManager, this.sceneryManager, {
      steeringSensitivity: 1.0
    });

    const initProfile = VEHICLES[this.currentVehicleId].physics;
    this.physics.applyVehicleProfile(initProfile);

    this.physics.resetToNearestRoad();
    this.carModel.update(this.physics, this.environmentManager.isNight());

    this.cameraController = new CameraController(this.camera);
    this.cameraController.update(0.016, this.physics);
  }

  initAudio() {
    this.soundEngine = new SoundEngine();
  }

  initUI() {
    this.hud = new HUD({
      onOpenGarage: () => {
        this.settingsModal.open('garage');
      },
      onToggleAutopilot: () => {
        return this.toggleAutopilot();
      },
      onToggleReverseAutopilot: () => {
        return this.toggleReverseAutopilot();
      },
      onToggleCamera: () => {
        const mode = this.cameraController.cycleMode();
        this.hud.showToast(`Camera: ${mode}`);
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

    this.settingsModal = new SettingsModal({
      onStart: (chosenEnv) => {
        this.hasStarted = true;
        this.changeEnvironment(chosenEnv);
        this.soundEngine.init();
        this.soundEngine.resume();
        const envName = ENVIRONMENTS[chosenEnv] ? ENVIRONMENTS[chosenEnv].name : 'Mountains';
        this.hud.showToast(`Driving Started • ${envName}`);
      },
      onVehicleChange: (vehicleId, color, wheelStyle) => {
        this.changeVehicle(vehicleId, color, wheelStyle);
      },
      onColorChange: (colorHex) => {
        this.carModel.setPaintColor(colorHex);
      },
      onWheelStyleChange: (wheelStyle) => {
        this.carModel.setVehicle(this.currentVehicleId, null, wheelStyle);
      },
      onEnvironmentChange: (envId) => {
        this.changeEnvironment(envId);
      },
      onWeatherChange: (weatherId) => {
        this.changeWeather(weatherId);
      },
      onTimeOfDayChange: (timeId, autoCycle) => {
        this.changeTimeOfDay(timeId, autoCycle);
      },
      onToggleAutoDayNight: (enabled) => {
        this.environmentManager.autoDayNightCycle = enabled;
        this.hud.showToast(enabled ? '24h Auto Day-Night Active' : 'Fixed Time Active');
      },
      onSteeringChange: (val) => {
        this.physics.steeringSensitivity = val;
      },
      onUnitChange: (unit) => {
        this.hud.speedUnit = unit;
      },
      onToggleAutopilot: () => {
        return this.toggleAutopilot();
      },
      onToggleReverseAutopilot: () => {
        return this.toggleReverseAutopilot();
      },
      getAutopilotStates: () => {
        return {
          forward: this.physics.autopilotEnabled,
          reverse: this.physics.reverseAutopilotEnabled
        };
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

  changeVehicle(vehicleId, color = null, wheelStyle = 'aero') {
    const config = VEHICLES[vehicleId];
    if (!config) return;
    this.currentVehicleId = vehicleId;

    this.physics.applyVehicleProfile(config.physics);
    this.carModel.setVehicle(vehicleId, color, wheelStyle);
    this.hud.showToast(`Vehicle: ${config.name}`);
  }

  changeEnvironment(envId) {
    const env = ENVIRONMENTS[envId];
    if (!env) return;
    this.currentEnvironmentId = envId;

    this.terrainManager.setSeasonColors(env.terrain);
    this.sceneryManager.setSeasonColors(env.scenery);

    if (env.defaultWeather) {
      this.changeWeather(env.defaultWeather);
    }
    if (env.defaultTime) {
      this.changeTimeOfDay(env.defaultTime, false);
    }

    this.resetVehicle();
    this.hud.showToast(`Environment: ${env.name}`);
  }

  changeWeather(weatherId) {
    const w = WEATHER_TYPES[weatherId];
    if (!w) return;
    this.currentWeatherId = weatherId;

    this.environmentManager.applyWeather(weatherId);
    this.physics.tireFrictionRoad = 1.15 * w.gripMultiplier;
    this.hud.showToast(`Weather: ${w.name}`);
  }

  changeTimeOfDay(timeId, autoCycle = false) {
    const tod = TIMES_OF_DAY[timeId];
    if (!tod) return;
    this.currentTimeId = timeId;

    this.environmentManager.autoDayNightCycle = autoCycle;
    this.environmentManager.applyTimeOfDay(timeId);
    this.hud.showToast(`Time: ${tod.name}`);
  }

  toggleAutopilot() {
    const enabled = this.physics.toggleAutopilot();
    if (enabled) {
      this.hud.showToast('Forward Autopilot: ENGAGED (T) • Lane Centering');
    } else {
      this.hud.showToast('Forward Autopilot: DISENGAGED (T) • Manual Control');
    }
    return enabled;
  }

  toggleReverseAutopilot() {
    const enabled = this.physics.toggleReverseAutopilot();
    if (enabled) {
      this.hud.showToast('Reverse Autopilot: ENGAGED (Y) • Backing Up Along Highway');
    } else {
      this.hud.showToast('Reverse Autopilot: DISENGAGED (Y) • Manual Control');
    }
    return enabled;
  }

  resetVehicle() {
    this.physics.resetToNearestRoad();
    this.carModel.update(this.physics, this.environmentManager.isNight());
    this.cameraController.update(0.016, this.physics);
    this.hud.showToast('Vehicle Reset to Road (R)');
  }

  applyQuality(quality) {
    if (quality === 'low') {
      this.renderer.setPixelRatio(0.85);
      this.terrainManager.viewDistance = 2;
      this.renderer.shadowMap.enabled = false;
      this.hud.showToast('Graphics: Low (Intel UHD 620 Max 60 FPS)');
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(1.0);
      this.terrainManager.viewDistance = 3;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.mapSize.set(1536, 1536);
      this.hud.showToast('Graphics: Medium (Balanced)');
    } else if (quality === 'high') {
      this.renderer.setPixelRatio(1.25);
      this.terrainManager.viewDistance = 4;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.mapSize.set(2048, 2048);
      this.hud.showToast('Graphics: High (Crisp Shadows)');
    }
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyT') {
        this.toggleAutopilot();
      } else if (e.code === 'KeyY') {
        this.toggleReverseAutopilot();
      } else if (e.code === 'KeyG') {
        this.settingsModal.open('garage');
      } else if (e.code === 'KeyC') {
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

    window.addEventListener('pointerdown', () => {
      if (this.soundEngine) this.soundEngine.resume();
    }, { once: true });
  }

  processDrivingInput() {
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp']) ? 1 : 0;
    const backward = (this.keys['KeyS'] || this.keys['ArrowDown']) ? 1 : 0;

    let steer = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steer -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steer += 1;

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
      this.processDrivingInput();
      this.physics.update(dt, this.input);

      this.roadManager.update(this.physics.position);
      this.terrainManager.update(this.physics.position);
      this.sceneryManager.update(this.physics.position);
      this.environmentManager.update(this.physics.position, dt);
      this.carModel.update(this.physics, this.environmentManager.isNight());
      this.soundEngine.update(this.physics.speed, this.input.throttle, this.physics.isBraking);
      this.cameraController.update(dt, this.physics);

      const vehName = VEHICLES[this.currentVehicleId] ? VEHICLES[this.currentVehicleId].name : 'Vehicle';
      const envName = ENVIRONMENTS[this.currentEnvironmentId] ? ENVIRONMENTS[this.currentEnvironmentId].name : 'Alpine Pass';
      const timeName = TIMES_OF_DAY[this.environmentManager.currentTimeOfDay] ? TIMES_OF_DAY[this.environmentManager.currentTimeOfDay].name : 'Morning';
      const weatherName = WEATHER_TYPES[this.environmentManager.currentWeather] ? WEATHER_TYPES[this.environmentManager.currentWeather].name : 'Clear';

      this.hud.update(
        this.physics,
        this.cameraController.currentMode,
        vehName,
        envName,
        `${timeName} • ${weatherName}`
      );
    } else if (!this.hasStarted) {
      const dummyCar = {
        position: this.physics.position,
        heading: this.physics.heading,
        speed: 0
      };
      this.cameraController.currentMode = CAMERA_MODES.CINEMATIC;
      this.cameraController.update(dt, dummyCar);
      this.environmentManager.update(this.physics.position, dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

function boot() {
  try {
    window.slowRoadsApp = new SlowRoadsApp();
    console.log('[SlowRoads Simulator] Advanced Simulator initialized successfully');
  } catch (err) {
    console.error('[SlowRoads Simulator] Startup error:', err);
    const errBox = document.createElement('div');
    errBox.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;background:rgba(20,22,26,0.96);color:#ff5555;padding:24px;border-radius:12px;font-family:monospace;font-size:14px;z-index:999999;box-shadow:0 10px 40px rgba(0,0,0,0.5);border:1px solid #ff4444;white-space:pre-wrap;line-height:1.5;';
    errBox.innerHTML = `<strong>Slow Roads Initialization Error:</strong>\n\n${err.stack || err.message}`;
    document.body.appendChild(errBox);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
