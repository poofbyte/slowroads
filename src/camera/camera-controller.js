import * as THREE from 'three';

export const CAMERA_MODES = {
  CHASE: 'Chase',
  CLOSE_CHASE: 'Close Chase',
  HOOD: 'Hood / Dash',
  CINEMATIC: 'Cinematic'
};

export class CameraController {
  constructor(camera, options = {}) {
    this.camera = camera;

    this.modes = [
      CAMERA_MODES.CHASE,
      CAMERA_MODES.CLOSE_CHASE,
      CAMERA_MODES.HOOD,
      CAMERA_MODES.CINEMATIC
    ];
    this.modeIndex = 0;
    this.currentMode = this.modes[this.modeIndex];

    // Camera smoothing targets
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Cinematic orbit angle
    this.orbitAngle = 0;

    // Dynamic FOV
    this.baseFov = 60;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();

    this.initialized = false;
  }

  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    this.currentMode = this.modes[this.modeIndex];
    return this.currentMode;
  }

  setMode(modeName) {
    const idx = this.modes.indexOf(modeName);
    if (idx !== -1) {
      this.modeIndex = idx;
      this.currentMode = modeName;
    }
  }

  update(dt, vehicleState) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.1);

    const carPos = vehicleState.position;
    const forwardX = Math.sin(vehicleState.heading);
    const forwardZ = Math.cos(vehicleState.heading);
    const forward = new THREE.Vector3(forwardX, 0, forwardZ).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const absSpeed = Math.abs(vehicleState.speed);
    const speedRatio = Math.min(1.0, absSpeed / 40.0);

    // 1. Calculate desired camera position & lookAt target for active mode
    switch (this.currentMode) {
      case CAMERA_MODES.CHASE: {
        // High chase perspective
        const distance = 6.4 + speedRatio * 1.4;
        const height = 2.6 + speedRatio * 0.4;
        this.targetPosition.set(
          carPos.x - forwardX * distance,
          carPos.y + height,
          carPos.z - forwardZ * distance
        );
        this.targetLookAt.set(
          carPos.x + forwardX * 6.0,
          carPos.y + 1.2,
          carPos.z + forwardZ * 6.0
        );
        break;
      }

      case CAMERA_MODES.CLOSE_CHASE: {
        // Lower, sportier rear chase
        const distance = 4.2 + speedRatio * 0.8;
        const height = 1.65;
        this.targetPosition.set(
          carPos.x - forwardX * distance,
          carPos.y + height,
          carPos.z - forwardZ * distance
        );
        this.targetLookAt.set(
          carPos.x + forwardX * 7.0,
          carPos.y + 1.1,
          carPos.z + forwardZ * 7.0
        );
        break;
      }

      case CAMERA_MODES.HOOD: {
        // Driver hood / dashboard view
        this.targetPosition.set(
          carPos.x + forwardX * 0.6,
          carPos.y + 1.15,
          carPos.z + forwardZ * 0.6
        );
        this.targetLookAt.set(
          carPos.x + forwardX * 35.0,
          carPos.y + 0.8,
          carPos.z + forwardZ * 35.0
        );
        break;
      }

      case CAMERA_MODES.CINEMATIC: {
        // Rotating panoramic orbit
        this.orbitAngle += dt * 0.16;
        const orbitDist = 8.5;
        const orbitH = 2.4 + Math.sin(this.orbitAngle * 0.7) * 0.8;
        this.targetPosition.set(
          carPos.x + Math.sin(this.orbitAngle) * orbitDist,
          carPos.y + orbitH,
          carPos.z + Math.cos(this.orbitAngle) * orbitDist
        );
        this.targetLookAt.set(
          carPos.x,
          carPos.y + 1.1,
          carPos.z
        );
        break;
      }
    }

    // 2. Smoothly damp camera position and lookAt
    if (!this.initialized) {
      this.camera.position.copy(this.targetPosition);
      this.currentLookAt.copy(this.targetLookAt);
      this.initialized = true;
    } else {
      const posLerpRate = (this.currentMode === CAMERA_MODES.HOOD) ? 24.0 : 8.5;
      const lookLerpRate = (this.currentMode === CAMERA_MODES.HOOD) ? 22.0 : 9.5;

      this.camera.position.lerp(this.targetPosition, dt * posLerpRate);
      this.currentLookAt.lerp(this.targetLookAt, dt * lookLerpRate);
    }

    this.camera.lookAt(this.currentLookAt);

    // 3. Dynamic speed-based FOV
    const targetFov = this.baseFov + (this.currentMode !== CAMERA_MODES.CINEMATIC ? speedRatio * 9.0 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 5.0);
    this.camera.updateProjectionMatrix();
  }
}
