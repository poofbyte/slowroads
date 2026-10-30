import * as THREE from 'three';

/**
 * Modern Low-Poly Minimalist Vehicle
 * Inspired by Slow Roads clean modern coupe design:
 * - Aerodynamic polygonal body with chamfered surfaces and sculpted diffuser
 * - Panoramic tinted glass greenhouse
 * - 4 Detailed alloy wheels with dynamic steering and camber
 * - Front LED daytime running strips + dual night projector spotlights
 * - Full-width rear glowing LED taillight bar (bright red brake/reverse glow)
 * - Dynamic contact shadow blob under tires
 */
export class CarModel {
  constructor(scene) {
    this.scene = scene;

    this.length = 4.45;
    this.width = 1.96;
    this.height = 1.28;
    this.wheelRadius = 0.36;
    this.wheelWidth = 0.28;
    this.wheelbase = 2.75;
    this.trackWidth = 1.68;

    this.initMaterials();

    this.root = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.root.add(this.chassisGroup);

    this.buildBody();
    this.buildWheels();
    this.buildLighting();
    this.buildContactShadow();

    this.scene.add(this.root);
  }

  initMaterials() {
    this.materials = {
      // Body paint: clean cream / slate minimalist modern EV look
      paint: new THREE.MeshStandardMaterial({
        color: 0xdedcd5, // Premium warm off-white cream
        metalness: 0.35,
        roughness: 0.28,
        flatShading: true
      }),
      paintDark: new THREE.MeshStandardMaterial({
        color: 0x22252a, // Deep charcoal graphite aero skirt
        metalness: 0.6,
        roughness: 0.45,
        flatShading: true
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x121820,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.94,
        flatShading: true
      }),
      tire: new THREE.MeshStandardMaterial({
        color: 0x181818,
        roughness: 0.9,
        flatShading: true
      }),
      rim: new THREE.MeshStandardMaterial({
        color: 0xc8c8c8,
        metalness: 0.85,
        roughness: 0.2,
        flatShading: true
      }),
      headlightLED: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      taillightDim: new THREE.MeshBasicMaterial({
        color: 0x881515
      }),
      taillightBrake: new THREE.MeshBasicMaterial({
        color: 0xff1e1e
      })
    };
  }

  buildBody() {
    // 1. Lower aerodynamic chassis tub
    const lowerGeo = new THREE.BoxGeometry(this.width, 0.44, this.length);
    lowerGeo.translate(0, 0.42, 0);
    const lowerMesh = new THREE.Mesh(lowerGeo, this.materials.paint);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    this.chassisGroup.add(lowerMesh);

    // 2. Sculpted front nose wedge
    const noseGeo = new THREE.BoxGeometry(this.width * 0.92, 0.22, 1.15);
    noseGeo.translate(0, 0.48, 1.6);
    const nose = new THREE.Mesh(noseGeo, this.materials.paint);
    nose.rotation.x = 0.12;
    this.chassisGroup.add(nose);

    // 3. Cabin / Panoramic Glass Greenhouse
    const cabinWidth = this.width * 0.82;
    const cabinLength = this.length * 0.54;
    const cabinHeight = 0.56;

    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    cabinGeo.translate(0, 0.42 + 0.22 + cabinHeight * 0.5, -0.16);
    const cabin = new THREE.Mesh(cabinGeo, this.materials.glass);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // 4. Roof panel
    const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.9, 0.06, cabinLength * 0.85);
    roofGeo.translate(0, 0.42 + 0.22 + cabinHeight + 0.03, -0.16);
    const roof = new THREE.Mesh(roofGeo, this.materials.paint);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // 5. Rear aero diffuser & lip spoiler
    const diffGeo = new THREE.BoxGeometry(this.width * 0.96, 0.16, 0.8);
    diffGeo.translate(0, 0.28, -1.8);
    const diff = new THREE.Mesh(diffGeo, this.materials.paintDark);
    this.chassisGroup.add(diff);

    // 6. Side lower skirts
    const skirtGeo = new THREE.BoxGeometry(this.width * 1.02, 0.12, this.length * 0.92);
    skirtGeo.translate(0, 0.22, 0);
    const skirt = new THREE.Mesh(skirtGeo, this.materials.paintDark);
    this.chassisGroup.add(skirt);
  }

  buildWheels() {
    this.wheels = [];

    const tireGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 16);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(this.wheelRadius * 0.68, this.wheelRadius * 0.68, this.wheelWidth * 1.06, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const halfTrack = this.trackWidth * 0.5;
    const halfBase = this.wheelbase * 0.5;

    const wheelConfigs = [
      { name: 'FL', x: -halfTrack, y: this.wheelRadius, z: halfBase, isFront: true },
      { name: 'FR', x: halfTrack, y: this.wheelRadius, z: halfBase, isFront: true },
      { name: 'RL', x: -halfTrack, y: this.wheelRadius, z: -halfBase, isFront: false },
      { name: 'RR', x: halfTrack, y: this.wheelRadius, z: -halfBase, isFront: false }
    ];

    for (const cfg of wheelConfigs) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(cfg.x, cfg.y, cfg.z);

      const rollPivot = new THREE.Group();
      steerPivot.add(rollPivot);

      const tireMesh = new THREE.Mesh(tireGeo, this.materials.tire);
      tireMesh.castShadow = true;
      rollPivot.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, this.materials.rim);
      rollPivot.add(rimMesh);

      this.chassisGroup.add(steerPivot);

      this.wheels.push({
        name: cfg.name,
        isFront: cfg.isFront,
        steerPivot,
        rollPivot
      });
    }
  }

  buildLighting() {
    // Front LED Light Strip
    const ledGeo = new THREE.BoxGeometry(0.38, 0.07, 0.08);
    for (const side of [-1, 1]) {
      const led = new THREE.Mesh(ledGeo, this.materials.headlightLED);
      led.position.set(side * this.width * 0.38, 0.48, this.length * 0.5 + 0.02);
      this.chassisGroup.add(led);
    }

    // Forward Spotlights (Active in Night mode)
    this.headlights = [];
    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight(0xfff6e8, 0, 95, Math.PI / 6, 0.35, 1.2);
      spot.position.set(side * 0.68, 0.52, this.length * 0.5);
      spot.target.position.set(side * 0.35, 0.1, this.length * 0.5 + 35);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.headlights.push(spot);
    }

    // Rear Continuous LED Taillight Bar
    const tlGeo = new THREE.BoxGeometry(this.width * 0.88, 0.07, 0.06);
    this.taillightMesh = new THREE.Mesh(tlGeo, this.materials.taillightDim);
    this.taillightMesh.position.set(0, 0.56, -this.length * 0.5 - 0.02);
    this.chassisGroup.add(this.taillightMesh);
  }

  buildContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 128, 25, 64, 128, 64);
    grad.addColorStop(0, 'rgba(8, 10, 14, 0.65)');
    grad.addColorStop(0.65, 'rgba(8, 10, 14, 0.25)');
    grad.addColorStop(1, 'rgba(8, 10, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(this.width * 1.35, this.length * 1.22);
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.set(0, 0.03, 0);
    this.root.add(this.shadowMesh);
  }

  update(state, isNight = false) {
    this.root.position.copy(state.position);
    this.root.quaternion.copy(state.quaternion);

    // Chassis dynamic inertial pitch & roll
    this.chassisGroup.rotation.x = state.pitch;
    this.chassisGroup.rotation.z = state.roll;

    // Wheel steering & rotation
    for (const w of this.wheels) {
      if (w.isFront) {
        w.steerPivot.rotation.y = state.steeringAngle;
      }
      w.rollPivot.rotation.x = state.wheelRotation;
    }

    // Taillight glow on braking or reversing
    if (state.isBraking || state.isReversing) {
      this.taillightMesh.material = this.materials.taillightBrake;
    } else {
      this.taillightMesh.material = this.materials.taillightDim;
    }

    // Night headlights
    const hlIntensity = isNight ? 2.8 : 0.0;
    for (const spot of this.headlights) {
      spot.intensity = hlIntensity;
    }
  }
}
