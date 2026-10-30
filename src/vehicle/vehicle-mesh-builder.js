import * as THREE from 'three';

/**
 * Procedural 3D Vehicle Mesh Builder
 * Constructs rich, detailed, low-poly 3D models for all vehicle types:
 * - Cybertruck (angular stainless steel exoskeleton, full-width LED lightbars)
 * - Modern Electric & Sports Sedans / Hypercars (aerodynamic glass canopy, diffuser)
 * - Heavy Commercial Trucks & Transit Buses (passenger windows, massive grilles, dual rear axles)
 * - Two-Wheelers: Supersport bikes & Scooters (exposed frames, handlebars, swingarms)
 */
export class VehicleMeshBuilder {
  static build(vehicleConfig, customColor = null, wheelStyle = 'aero') {
    const root = new THREE.Group();
    const chassisGroup = new THREE.Group();
    root.add(chassisGroup);

    const colorHex = customColor !== null ? customColor : vehicleConfig.defaultColor;

    // Materials
    const materials = {
      paint: new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.82,
        roughness: 0.28
      }),
      paintDark: new THREE.MeshStandardMaterial({
        color: 0x181a1e,
        roughness: 0.65,
        metalness: 0.35
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x141e28,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.88,
        transparent: true,
        opacity: 0.92
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: 0xe0e4e8,
        metalness: 0.95,
        roughness: 0.15
      }),
      tire: new THREE.MeshStandardMaterial({
        color: 0x1c1e22,
        roughness: 0.92,
        metalness: 0.05
      }),
      rim: new THREE.MeshStandardMaterial({
        color: wheelStyle === 'rugged' ? 0x222428 : 0xd0d4da,
        metalness: 0.88,
        roughness: 0.25
      }),
      brakeDisc: new THREE.MeshStandardMaterial({
        color: 0x8a8e94,
        metalness: 0.9,
        roughness: 0.3
      }),
      headlightLED: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      taillightDim: new THREE.MeshStandardMaterial({
        color: 0x6b0f0f,
        emissive: 0x4a0a0a,
        roughness: 0.3
      }),
      taillightBrake: new THREE.MeshStandardMaterial({
        color: 0xff1a1a,
        emissive: 0xff0000,
        emissiveIntensity: 2.2,
        roughness: 0.2
      })
    };

    const dims = vehicleConfig.dimensions;
    const type = vehicleConfig.vehicleType;
    const id = vehicleConfig.id;

    // 1. Build Chassis & Bodywork
    if (id === 'cybertruck') {
      this.buildCybertruckBody(chassisGroup, dims, materials);
    } else if (type === 'bus') {
      this.buildBusBody(chassisGroup, dims, materials);
    } else if (type === 'truck') {
      this.buildTruckBody(chassisGroup, dims, materials);
    } else if (type === 'bike' || type === 'scooter') {
      this.buildTwoWheelerBody(chassisGroup, dims, materials, type);
    } else {
      this.buildCarBody(chassisGroup, dims, materials, id);
    }

    // 2. Build Wheels & Suspension Pivots
    const wheels = this.buildWheels(chassisGroup, vehicleConfig, materials, wheelStyle);

    // 3. Build Headlights & Taillights
    const lights = this.buildLighting(chassisGroup, dims, materials, type);

    return {
      root,
      chassisGroup,
      wheels,
      taillightMesh: lights.taillightMesh,
      headlights: lights.headlights,
      materials
    };
  }

  static buildCarBody(group, dims, mats, id) {
    const isHypercar = (id === 'electric_hypercar' || id === 'sports_car');
    const isSUV = (id === 'suv_4x4' || id === 'model_x' || id === 'model_y');

    const bodyH = isHypercar ? 0.38 : (isSUV ? 0.65 : 0.48);
    const bodyW = dims.width;
    const bodyL = dims.length;

    // Main Lower Body
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
    bodyGeo.translate(0, 0.22 + bodyH * 0.5, 0);
    const bodyMesh = new THREE.Mesh(bodyGeo, mats.paint);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Panoramic Glass Canopy
    const cabinH = isHypercar ? 0.40 : (isSUV ? 0.68 : 0.52);
    const cabinL = bodyL * (isHypercar ? 0.45 : (isSUV ? 0.62 : 0.54));
    const cabinW = bodyW * 0.82;
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
    cabinGeo.translate(0, 0.22 + bodyH + cabinH * 0.5, -bodyL * 0.04);
    const cabinMesh = new THREE.Mesh(cabinGeo, mats.glass);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // Roof panel
    const roofGeo = new THREE.BoxGeometry(cabinW * 0.9, 0.05, cabinL * 0.85);
    roofGeo.translate(0, 0.22 + bodyH + cabinH + 0.025, -bodyL * 0.04);
    const roofMesh = new THREE.Mesh(roofGeo, mats.paint);
    group.add(roofMesh);

    // Aerodynamic Rear Diffuser & Lower Skirts
    const diffGeo = new THREE.BoxGeometry(bodyW * 0.94, 0.14, 0.75);
    diffGeo.translate(0, 0.24, -bodyL * 0.45);
    group.add(new THREE.Mesh(diffGeo, mats.paintDark));
  }

  static buildCybertruckBody(group, dims, mats) {
    const w = dims.width;
    const h = dims.height;
    const l = dims.length;

    // Angular Exoskeleton Body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.45, l);
    bodyGeo.translate(0, 0.38 + h * 0.225, 0);
    const body = new THREE.Mesh(bodyGeo, mats.paint);
    body.castShadow = true;
    group.add(body);

    // Angular Triangular Peak Roof (Iconic Cybertruck silhouette)
    const peakGeo = new THREE.CylinderGeometry(0.08, w * 0.86, h * 0.46, 3);
    peakGeo.rotateY(Math.PI / 2);
    peakGeo.translate(0, 0.38 + h * 0.45 + h * 0.23, -l * 0.05);
    const peak = new THREE.Mesh(peakGeo, mats.paint);
    peak.castShadow = true;
    group.add(peak);

    // Vault bed cover
    const vaultGeo = new THREE.BoxGeometry(w * 0.82, 0.06, l * 0.35);
    vaultGeo.translate(0, 0.38 + h * 0.45, -l * 0.28);
    group.add(new THREE.Mesh(vaultGeo, mats.paintDark));
  }

  static buildBusBody(group, dims, mats) {
    const w = dims.width;
    const h = dims.height;
    const l = dims.length;

    // Main Passenger Coach Box
    const busGeo = new THREE.BoxGeometry(w, h * 0.82, l);
    busGeo.translate(0, 0.42 + h * 0.41, 0);
    const bus = new THREE.Mesh(busGeo, mats.paint);
    bus.castShadow = true;
    bus.receiveShadow = true;
    group.add(bus);

    // Continuous Side Passenger Window Strips
    const winGeo = new THREE.BoxGeometry(w * 1.02, h * 0.32, l * 0.86);
    winGeo.translate(0, 0.42 + h * 0.52, -l * 0.02);
    group.add(new THREE.Mesh(winGeo, mats.glass));

    // Front Windshield
    const frontWinGeo = new THREE.BoxGeometry(w * 0.94, h * 0.38, 0.15);
    frontWinGeo.translate(0, 0.42 + h * 0.52, l * 0.49);
    group.add(new THREE.Mesh(frontWinGeo, mats.glass));

    // Roof AC Ventilation Pods
    const acGeo = new THREE.BoxGeometry(w * 0.6, 0.25, 2.8);
    acGeo.translate(0, 0.42 + h * 0.82 + 0.12, 0);
    group.add(new THREE.Mesh(acGeo, mats.paintDark));
  }

  static buildTruckBody(group, dims, mats) {
    const w = dims.width;
    const h = dims.height;
    const l = dims.length;

    // Elevated Cab
    const cabGeo = new THREE.BoxGeometry(w, h * 0.72, l * 0.55);
    cabGeo.translate(0, 0.45 + h * 0.36, l * 0.18);
    const cab = new THREE.Mesh(cabGeo, mats.paint);
    cab.castShadow = true;
    group.add(cab);

    // Windshield
    const winGeo = new THREE.BoxGeometry(w * 0.92, h * 0.32, l * 0.38);
    winGeo.translate(0, 0.45 + h * 0.48, l * 0.22);
    group.add(new THREE.Mesh(winGeo, mats.glass));

    // Massive Front Chrome Grille
    const grilleGeo = new THREE.BoxGeometry(w * 0.75, h * 0.42, 0.18);
    grilleGeo.translate(0, 0.45 + h * 0.24, l * 0.46);
    group.add(new THREE.Mesh(grilleGeo, mats.chrome));

    // Rear Chassis Rails / Fifth Wheel Coupler
    const frameGeo = new THREE.BoxGeometry(w * 0.82, 0.32, l * 0.48);
    frameGeo.translate(0, 0.48, -l * 0.24);
    group.add(new THREE.Mesh(frameGeo, mats.paintDark));
  }

  static buildTwoWheelerBody(group, dims, mats, type) {
    const w = dims.width;
    const h = dims.height;
    const l = dims.length;

    // Main Chassis Frame & Fuel Tank
    const tankGeo = new THREE.BoxGeometry(w * 0.55, h * 0.42, l * 0.42);
    tankGeo.translate(0, 0.48 + h * 0.25, l * 0.08);
    const tank = new THREE.Mesh(tankGeo, mats.paint);
    tank.castShadow = true;
    group.add(tank);

    // Rider Saddle Seat
    const seatGeo = new THREE.BoxGeometry(w * 0.48, 0.14, l * 0.35);
    seatGeo.translate(0, 0.48 + h * 0.34, -l * 0.18);
    group.add(new THREE.Mesh(seatGeo, mats.paintDark));

    // Exposed Engine Block / Battery
    const engGeo = new THREE.BoxGeometry(w * 0.52, h * 0.38, l * 0.38);
    engGeo.translate(0, 0.48, 0);
    group.add(new THREE.Mesh(engGeo, mats.paintDark));

    // Aerodynamic Fairing (for sportbike) or Windscreen (for scooter)
    if (type === 'bike') {
      const fairingGeo = new THREE.ConeGeometry(w * 0.42, l * 0.35, 4);
      fairingGeo.rotateX(Math.PI / 2);
      fairingGeo.translate(0, 0.48 + h * 0.28, l * 0.32);
      group.add(new THREE.Mesh(fairingGeo, mats.paint));
    }
  }

  static buildWheels(group, config, mats, style) {
    const wheels = [];
    const r = config.physics.wheelRadius;
    const w = config.vehicleType === 'bike' || config.vehicleType === 'scooter' ? 0.14 : 0.26;

    const tireGeo = new THREE.CylinderGeometry(r, r, w, 16);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(r * 0.68, r * 0.68, w * 1.05, 8);
    rimGeo.rotateZ(Math.PI / 2);

    const halfTrack = config.physics.trackWidth * 0.5;
    const halfBase = config.physics.wheelbase * 0.5;
    const isTwoWheeler = (config.vehicleType === 'bike' || config.vehicleType === 'scooter');

    let wheelConfigs = [];

    if (isTwoWheeler) {
      wheelConfigs = [
        { name: 'F', x: 0, y: r, z: halfBase, isFront: true },
        { name: 'R', x: 0, y: r, z: -halfBase, isFront: false }
      ];
    } else if (config.vehicleType === 'bus' || config.id === 'semi_truck') {
      // 6 Wheels (Front single pair, Rear dual axle)
      wheelConfigs = [
        { name: 'FL', x: -halfTrack, y: r, z: halfBase, isFront: true },
        { name: 'FR', x: halfTrack, y: r, z: halfBase, isFront: true },
        { name: 'RL1', x: -halfTrack, y: r, z: -halfBase + 0.6, isFront: false },
        { name: 'RR1', x: halfTrack, y: r, z: -halfBase + 0.6, isFront: false },
        { name: 'RL2', x: -halfTrack, y: r, z: -halfBase - 0.6, isFront: false },
        { name: 'RR2', x: halfTrack, y: r, z: -halfBase - 0.6, isFront: false }
      ];
    } else {
      // Standard 4 Wheels
      wheelConfigs = [
        { name: 'FL', x: -halfTrack, y: r, z: halfBase, isFront: true },
        { name: 'FR', x: halfTrack, y: r, z: halfBase, isFront: true },
        { name: 'RL', x: -halfTrack, y: r, z: -halfBase, isFront: false },
        { name: 'RR', x: halfTrack, y: r, z: -halfBase, isFront: false }
      ];
    }

    for (const cfg of wheelConfigs) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(cfg.x, cfg.y, cfg.z);

      const rollPivot = new THREE.Group();
      steerPivot.add(rollPivot);

      const tireMesh = new THREE.Mesh(tireGeo, mats.tire);
      tireMesh.castShadow = true;
      rollPivot.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, mats.rim);
      rollPivot.add(rimMesh);

      group.add(steerPivot);

      wheels.push({
        name: cfg.name,
        steerPivot,
        rollPivot,
        isFront: cfg.isFront
      });
    }

    return wheels;
  }

  static buildLighting(group, dims, mats, type) {
    const isTwoWheeler = (type === 'bike' || type === 'scooter');
    const w = dims.width;
    const l = dims.length;
    const h = dims.height;

    const headlights = [];

    // Front Headlights
    const hlGeo = new THREE.BoxGeometry(isTwoWheeler ? 0.22 : 0.34, 0.08, 0.06);
    const hlSides = isTwoWheeler ? [0] : [-1, 1];

    for (const side of hlSides) {
      const hlMesh = new THREE.Mesh(hlGeo, mats.headlightLED);
      hlMesh.position.set(side * w * 0.36, 0.52, l * 0.5 + 0.02);
      group.add(hlMesh);

      const spot = new THREE.SpotLight(0xfff5e6, 0, 110, Math.PI / 5.5, 0.35, 1.2);
      spot.position.set(side * w * 0.35, 0.55, l * 0.5);
      spot.target.position.set(side * w * 0.15, 0.1, l * 0.5 + 40);
      group.add(spot);
      group.add(spot.target);
      headlights.push(spot);
    }

    // Rear Taillight Bar
    const tlGeo = new THREE.BoxGeometry(isTwoWheeler ? 0.18 : (w * 0.88), 0.08, 0.06);
    const taillightMesh = new THREE.Mesh(tlGeo, mats.taillightDim);
    taillightMesh.position.set(0, 0.58, -l * 0.5 - 0.02);
    group.add(taillightMesh);

    return { taillightMesh, headlights };
  }
}
