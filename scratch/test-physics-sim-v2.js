import * as THREE from 'three';
import { RoadManager } from '../src/world/road.js';
import { TerrainManager } from '../src/world/terrain.js';
import { SceneryManager } from '../src/world/scenery.js';
import { VehiclePhysics } from '../src/vehicle/physics.js';
import { ImpactAndSkidFXManager } from '../src/vehicle/effects.js';
import { SoundEngine } from '../src/vehicle/audio.js';
import { VEHICLES } from '../src/vehicle/vehicles-data.js';

// Setup mock document & window
global.document = {
  createElement: (tag) => {
    return {
      width: 512,
      height: 512,
      getContext: () => ({
        fillStyle: '',
        fillRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }),
        putImageData: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        clearRect: () => {}
      }),
      appendChild: () => {},
      classList: { add: () => {}, remove: () => {} },
      style: {}
    };
  },
  body: {
    appendChild: () => {}
  },
  getElementById: () => null
};

global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  AudioContext: class MockAudioContext {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
      this.destination = {};
      this.state = 'running';
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: () => {},
          setTargetAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {}
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          setValueAtTime: () => {},
          setTargetAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: {
          setValueAtTime: () => {},
          setTargetAtTime: () => {}
        },
        Q: { setValueAtTime: () => {} },
        connect: () => {}
      };
    }
    createBuffer(ch, len, rate) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        connect: () => {},
        start: () => {}
      };
    }
    resume() {}
  }
};

console.log('[Test] Initializing scene, managers and vehicle physics...');
const scene = new THREE.Scene();
const road = new RoadManager(scene, { seed: 108 });
const terrain = new TerrainManager(scene, road, { seed: 108 });
const scenery = new SceneryManager(scene, road, terrain, { seed: 108 });

const physics = new VehiclePhysics(road, terrain, scenery);
physics.applyVehicleProfile(VEHICLES.model_3.physics);
physics.resetToNearestRoad();

console.log(`[Test] Start position: (${physics.position.x.toFixed(2)}, ${physics.position.y.toFixed(2)}, ${physics.position.z.toFixed(2)}), heading: ${physics.heading.toFixed(2)}`);

// Test 1: Accelerating forward
for (let i = 0; i < 40; i++) {
  physics.update(0.02, { throttle: 1, brake: 0, steer: 0, handbrake: false });
}
console.log(`[Test] Speed after forward throttle: ${(physics.speed * 3.6).toFixed(1)} km/h, Gear: ${physics.gear}, RPM: ${Math.round(physics.rpm)}`);
if (physics.speed <= 2.5) {
  throw new Error('Vehicle failed to accelerate forward!');
}

// Test 2: Steering test (Steering Right)
const startHeading = physics.heading;
for (let i = 0; i < 30; i++) {
  physics.update(0.02, { throttle: 0.5, brake: 0, steer: 1, handbrake: false });
}
console.log(`[Test] Heading after right steering: ${physics.heading.toFixed(3)} (Delta: ${(physics.heading - startHeading).toFixed(3)} rad)`);
if (physics.heading <= startHeading) {
  throw new Error('Steering right should increase heading!');
}

// Test 3: Braking & Stopping
for (let i = 0; i < 60; i++) {
  physics.update(0.02, { throttle: 0, brake: 1, steer: 0, handbrake: false });
}
console.log(`[Test] Speed after braking: ${(physics.speed * 3.6).toFixed(1)} km/h, Gear: ${physics.gear}`);

// Test 4: Reversing
for (let i = 0; i < 40; i++) {
  physics.update(0.02, { throttle: 0, brake: 1, steer: 0, handbrake: false });
}
console.log(`[Test] Speed after holding reverse: ${(physics.speed * 3.6).toFixed(1)} km/h, Gear: ${physics.gear}`);
if (physics.speed >= -1.0) {
  throw new Error('Holding brake/S did not reverse vehicle!');
}

// Test 5: Sound Engine
const sound = new SoundEngine();
sound.init();
sound.setEngineType('v8');
sound.update(physics.speed, 1, false, physics.slipRatio, physics.rpm);
sound.triggerCollisionSound(15.0);
console.log('[Test] SoundEngine passed test with V8 and collision sound synthesis');

// Test 6: Effects Manager
const fx = new ImpactAndSkidFXManager(scene);
fx.spawnCollisionImpact(new THREE.Vector3(0, 5, 0), 20.0);
fx.spawnTireSmokeAndSkid(new THREE.Vector3(1, 5, 0), physics.heading, false);
fx.update(0.02);
console.log(`[Test] FX manager active particles: ${fx.particles.length}`);
if (fx.particles.length === 0) {
  throw new Error('FX manager did not spawn particles!');
}

console.log('[Test] ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!');
