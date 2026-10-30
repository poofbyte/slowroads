import * as THREE from 'three';

export class CarModel {
  constructor(scene) {
    this.scene = scene;

    // Car dimensions
    this.length = 4.4;
    this.width = 1.95;
    this.height = 1.25;
    this.wheelRadius = 0.38;
    this.wheelWidth = 0.28;
    this.wheelbase = 2.7; // Front to rear axle
    this.trackWidth = 1.7; // Left to right wheel spacing

    // Materials
    this.initMaterials();

    // Root container & chassis group
    this.root = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.root.add(this.chassisGroup);

    // Build vehicle components
    this.buildBody();
    this.buildWheels();
    this.buildLights();
    this.buildShadowBlob();

    this.scene.add(this.root);
  }

  initMaterials() {
    this.materials = {
      // Body paint: clean cream / slate minimalist modern EV look
      paint: new THREE.MeshStandardMaterial({
        color: 0xe6e4dd, // Off-white cream
        metalness: 0.25,
        roughness: 0.35,
        flatShading: true
      }),
      paintTrim: new THREE.MeshStandardMaterial({
        color: 0x24272c, // Dark graphite trim / diffuser
        metalness: 0.5,
        roughness: 0.5,
        flatShading: true
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x182028,
        metalness: 0.85,
        roughness: 0.15,
        transparent: true,
        opacity: 0.92,
        flatShading: true
      }),
      tire: new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.85,
        flatShading: true
      }),
      rim: new THREE.MeshStandardMaterial({
        color: 0xbfbfbf,
        metalness: 0.8,
        roughness: 0.2,
        flatShading: true
      }),
      headlightOff: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      headlightOn: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      taillightDim: new THREE.MeshBasicMaterial({
        color: 0x771111
      }),
      taillightBrake: new THREE.MeshBasicMaterial({
        color: 0xff1a1a
      })
    };
  }

  buildBody() {
    // 1. Lower Chassis
    const lowerBodyGeo = new THREE.BoxGeometry(this.width, 0.45, this.length);
    lowerBodyGeo.translate(0, 0.42, 0);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, this.materials.paint);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // 2. Cabin / Glass Greenhouse
    const cabinWidth = this.width * 0.82;
    const cabinLength = this.length * 0.52;
    const cabinHeight = 0.58;

    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    cabinGeo.translate(0, 0.42 + 0.22 + cabinHeight / 2, -0.15); // Offset toward rear
    const cabin = new THREE.Mesh(cabinGeo, this.materials.glass);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // 3. Roof cap
    const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.92, 0.08, cabinLength * 0.88);
    roofGeo.translate(0, 0.42 + 0.22 + cabinHeight + 0.04, -0.15);
    const roof = new THREE.Mesh(roofGeo, this.materials.paint);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // 4. Front Hood Slope
    const hoodGeo = new THREE.BoxGeometry(this.width * 0.92, 0.15, 1.1);
    hoodGeo.translate(0, 0.55, 1.5);
    const hood = new THREE.Mesh(hoodGeo, this.materials.paint);
    hood.rotation.x = 0.1;
    this.chassisGroup.add(hood);

    // 5. Rear Trunk / Ducktail Lip
    const trunkGeo = new THREE.BoxGeometry(this.width * 0.88, 0.12, 0.85);
    trunkGeo.translate(0, 0.56, -1.65);
    const trunk = new THREE.Mesh(trunkGeo, this.materials.paint);
    trunk.rotation.x = -0.06;
    this.chassisGroup.add(trunk);

    // 6. Aerodynamic bottom skirt
    const skirtGeo = new THREE.BoxGeometry(this.width * 0.98, 0.12, this.length * 0.95);
    skirtGeo.translate(0, 0.22, 0);
    const skirt = new THREE.Mesh(skirtGeo, this.materials.paintTrim);
    this.chassisGroup.add(skirt);
  }

  buildWheels() {
    this.wheels = [];
    const tireGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 14);
    tireGeo.rotateZ(Math.PI / 2); // Axis along X

    const rimGeo = new THREE.CylinderGeometry(this.wheelRadius * 0.65, this.wheelRadius * 0.65, this.wheelWidth * 1.05, 7);
    rimGeo.rotateZ(Math.PI / 2);

    const halfTrack = this.trackWidth / 2;
    const halfBase = this.wheelbase / 2;

    const wheelPositions = [
      { name: 'FL', x: -halfTrack, y: this.wheelRadius, z: halfBase, isFront: true },
      { name: 'FR', x: halfTrack, y: this.wheelRadius, z: halfBase, isFront: true },
      { name: 'RL', x: -halfTrack, y: this.wheelRadius, z: -halfBase, isFront: false },
      { name: 'RR', x: halfTrack, y: this.wheelRadius, z: -halfBase, isFront: false }
    ];

    for (const wp of wheelPositions) {
      // Steer pivot (for front wheels)
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wp.y, wp.z);

      // Roll pivot (for wheel rotation)
      const rollPivot = new THREE.Group();
      steerPivot.add(rollPivot);

      const tireMesh = new THREE.Mesh(tireGeo, this.materials.tire);
      tireMesh.castShadow = true;
      rollPivot.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, this.materials.rim);
      rollPivot.add(rimMesh);

      this.chassisGroup.add(steerPivot);

      this.wheels.push({
        name: wp.name,
        isFront: wp.isFront,
        steerPivot,
        rollPivot,
        basePos: new THREE.Vector3(wp.x, wp.y, wp.z)
      });
    }
  }

  buildLights() {
    // Front headlights (sleek dual LED bars)
    const hlGeo = new THREE.BoxGeometry(0.35, 0.08, 0.08);
    const hlY = 0.50;
    const hlZ = this.length / 2 + 0.02;

    const leftHL = new THREE.Mesh(hlGeo, this.materials.headlightOn);
    leftHL.position.set(-this.width * 0.36, hlY, hlZ);
    this.chassisGroup.add(leftHL);

    const rightHL = new THREE.Mesh(hlGeo, this.materials.headlightOn);
    rightHL.position.set(this.width * 0.36, hlY, hlZ);
    this.chassisGroup.add(rightHL);

    // Forward Spotlights (casting beams on the road at night)
    this.headlights = [];
    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight(0xfff5e6, 0, 80, Math.PI / 6, 0.4, 1.2);
      spot.position.set(side * 0.65, 0.5, this.length / 2);
      spot.target.position.set(side * 0.4, 0, this.length / 2 + 30);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.headlights.push(spot);
    }

    // Rear Taillight: continuous red LED light strip
    const tlGeo = new THREE.BoxGeometry(this.width * 0.85, 0.07, 0.06);
    this.taillightMesh = new THREE.Mesh(tlGeo, this.materials.taillightDim);
    this.taillightMesh.position.set(0, 0.58, -this.length / 2 - 0.02);
    this.chassisGroup.add(this.taillightMesh);
  }

  buildShadowBlob() {
    // Soft fake contact shadow blob under the car
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 128, 20, 64, 128, 64);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.6)');
    grad.addColorStop(0.6, 'rgba(10, 12, 16, 0.3)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(this.width * 1.35, this.length * 1.25);
    shadowGeo.rotateX(-Math.PI / 2);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.set(0, 0.04, 0);
    this.root.add(this.shadowMesh);
  }

  /**
   * Updates car model visuals from physics state
   */
  update(state, isNight = false) {
    // 1. Root position & rotation (ground contact frame)
    this.root.position.copy(state.position);
    this.root.quaternion.copy(state.quaternion);

    // 2. Chassis body dynamic lean (pitch from accel/braking, roll from turning)
    this.chassisGroup.rotation.x = state.pitch;
    this.chassisGroup.rotation.z = state.roll;

    // 3. Wheel steering & rotation
    for (const w of this.wheels) {
      if (w.isFront) {
        w.steerPivot.rotation.y = state.steeringAngle;
      }
      w.rollPivot.rotation.x = state.wheelRotation;
    }

    // 4. Taillight intensity (bright when braking or reversing)
    if (state.isBraking || state.isReversing) {
      this.taillightMesh.material = this.materials.taillightBrake;
    } else {
      this.taillightMesh.material = this.materials.taillightDim;
    }

    // 5. Night headlights
    const hlIntensity = isNight ? 2.5 : 0.0;
    for (const spot of this.headlights) {
      spot.intensity = hlIntensity;
    }
  }
}
