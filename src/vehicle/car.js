import * as THREE from 'three';
import { VEHICLES } from './vehicles-data.js';
import { VehicleMeshBuilder } from './vehicle-mesh-builder.js';

/**
 * Universal Vehicle Model & Visuals Manager
 * Supports dynamic real-time swapping between all 18 vehicle models and customization
 */
export class CarModel {
  constructor(scene, initialVehicleId = 'model_3') {
    this.scene = scene;
    this.currentVehicleId = initialVehicleId;
    this.currentColor = null;
    this.currentWheelStyle = 'aero';

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.buildContactShadow();
    this.setVehicle(initialVehicleId);
  }

  setVehicle(vehicleId, customColor = null, wheelStyle = 'aero') {
    const config = VEHICLES[vehicleId] || VEHICLES.model_3;
    this.currentVehicleId = config.id;
    if (customColor !== null) this.currentColor = customColor;
    if (wheelStyle) this.currentWheelStyle = wheelStyle;

    // Dispose old chassis group if present
    if (this.builtData && this.builtData.root) {
      this.root.remove(this.builtData.root);
      this.builtData.root.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
        }
      });
    }

    // Build new procedural vehicle model
    this.builtData = VehicleMeshBuilder.build(config, this.currentColor, this.currentWheelStyle);
    this.root.add(this.builtData.root);

    this.chassisGroup = this.builtData.chassisGroup;
    this.wheels = this.builtData.wheels;
    this.taillightMesh = this.builtData.taillightMesh;
    this.headlights = this.builtData.headlights;
    this.materials = this.builtData.materials;
  }

  setPaintColor(colorHex) {
    this.currentColor = colorHex;
    if (this.materials && this.materials.paint) {
      this.materials.paint.color.set(colorHex);
    }
  }

  toggleHeadlights() {
    this.headlightsForcedOn = !this.headlightsForcedOn;
    return this.headlightsForcedOn;
  }

  buildContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 128, 20, 64, 128, 64);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.65)');
    grad.addColorStop(0.65, 'rgba(10, 12, 16, 0.25)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(2.6, 5.2);
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

    // Chassis dynamic inertial pitch & roll (motorcycle lean is baked in state.roll)
    if (this.chassisGroup) {
      this.chassisGroup.rotation.x = state.pitch;
      this.chassisGroup.rotation.z = state.roll;
    }

    // Wheel steering & rotation
    if (this.wheels) {
      for (const w of this.wheels) {
        if (w.isFront) {
          w.steerPivot.rotation.y = -state.steeringAngle;
        }
        w.rollPivot.rotation.x = state.wheelRotation;
      }
    }

    // Taillight glow on braking or reversing
    if (this.taillightMesh) {
      if (state.isBraking || state.isReversing) {
        this.taillightMesh.material = this.materials.taillightBrake;
      } else {
        this.taillightMesh.material = this.materials.taillightDim;
      }
    }

    // Night or manual headlights
    const hlActive = isNight || this.headlightsForcedOn;
    const hlIntensity = hlActive ? 2.8 : 0.0;
    if (this.headlights) {
      for (const spot of this.headlights) {
        spot.intensity = hlIntensity;
      }
    }
  }
}
