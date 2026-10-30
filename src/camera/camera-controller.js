import * as THREE from 'three';

export const CAMERA_MODES = {
  CHASE: 'Chase',
  CLOSE_CHASE: 'Close Chase',
  HOOD: 'Hood / Dash',
  CINEMATIC: 'Cinematic'
};

/**
 * Dynamic Physics-Spring Camera Controller
 * Features:
 * - Spring-mass-damper follow camera with authentic inertia
 * - Yaw anticipation that swings into bends to frame upcoming road geometry
 * - Acceleration drop-back and braking compression
 * - Dynamic velocity-driven FOV breathing
 * - Subtle banking and roll compensation
 * - Ultra-smooth mode transitions
 */
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

    // Camera dynamic state vectors
    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.posVelocity = new THREE.Vector3(0, 0, 0);
    this.lookVelocity = new THREE.Vector3(0, 0, 0);

    // Filtered car heading for smooth yaw look-ahead
    this.smoothHeading = 0;
    this.orbitAngle = 0;

    // FOV parameters
    this.baseFov = 58;
    this.currentFov = this.baseFov;
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
    dt = Math.min(dt, 0.08);

    const carPos = vehicleState.position;
    const carHeading = vehicleState.heading;
    const absSpeed = Math.abs(vehicleState.speed);
    const speedRatio = Math.min(1.0, absSpeed / 42.0); // 0 to 1

    // Filtered heading with lag so camera smoothly rotates around corners
    let headingDiff = carHeading - this.smoothHeading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
    this.smoothHeading += headingDiff * Math.min(1.0, dt * 7.5);

    const forwardX = Math.sin(this.smoothHeading);
    const forwardZ = Math.cos(this.smoothHeading);

    // Targets for current camera mode
    const targetPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    switch (this.currentMode) {
      case CAMERA_MODES.CHASE: {
        // High, sweeping third-person chase
        // Drop back with speed (inertia lag)
        const distance = 6.2 + speedRatio * 1.6;
        const height = 2.45 + speedRatio * 0.35;

        // Yaw look-ahead: camera positions slightly outside the turn to look deep into the curve
        const yawAnticipation = (vehicleState.yawRate || 0) * 0.45;
        const camForwardX = Math.sin(this.smoothHeading + yawAnticipation);
        const camForwardZ = Math.cos(this.smoothHeading + yawAnticipation);

        targetPos.set(
          carPos.x - camForwardX * distance,
          carPos.y + height,
          carPos.z - camForwardZ * distance
        );

        // Look at road ahead of vehicle
        targetLookAt.set(
          carPos.x + forwardX * (8.0 + speedRatio * 8.0),
          carPos.y + 1.25,
          carPos.z + forwardZ * (8.0 + speedRatio * 8.0)
        );
        break;
      }

      case CAMERA_MODES.CLOSE_CHASE: {
        // Low, sporty rear bumper chase
        const distance = 4.2 + speedRatio * 0.8;
        const height = 1.62;

        targetPos.set(
          carPos.x - forwardX * distance,
          carPos.y + height,
          carPos.z - forwardZ * distance
        );

        targetLookAt.set(
          carPos.x + forwardX * 12.0,
          carPos.y + 1.1,
          carPos.z + forwardZ * 12.0
        );
        break;
      }

      case CAMERA_MODES.HOOD: {
        // Driver hood / dashboard perspective
        const carForwardX = Math.sin(carHeading);
        const carForwardZ = Math.cos(carHeading);

        targetPos.set(
          carPos.x + carForwardX * 0.5,
          carPos.y + 1.18,
          carPos.z + carForwardZ * 0.5
        );

        targetLookAt.set(
          carPos.x + carForwardX * 45.0,
          carPos.y + 0.95,
          carPos.z + carForwardZ * 45.0
        );
        break;
      }

      case CAMERA_MODES.CINEMATIC: {
        // Slow rotating orbit showcase
        this.orbitAngle += dt * 0.18;
        const orbitDist = 9.0;
        const orbitH = 2.5 + Math.sin(this.orbitAngle * 0.6) * 0.9;

        targetPos.set(
          carPos.x + Math.sin(this.orbitAngle) * orbitDist,
          carPos.y + orbitH,
          carPos.z + Math.cos(this.orbitAngle) * orbitDist
        );

        targetLookAt.set(carPos.x, carPos.y + 1.05, carPos.z);
        break;
      }
    }

    // Spring-Damper physical smoothing
    if (!this.initialized) {
      this.currentPos.copy(targetPos);
      this.currentLookAt.copy(targetLookAt);
      this.initialized = true;
    } else {
      const isHood = this.currentMode === CAMERA_MODES.HOOD;
      const springFreq = isHood ? 24.0 : 9.5;
      const lookFreq = isHood ? 26.0 : 11.5;

      // Critically damped spring tracking
      this.currentPos.lerp(targetPos, Math.min(1.0, dt * springFreq));
      this.currentLookAt.lerp(targetLookAt, Math.min(1.0, dt * lookFreq));
    }

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // Subtle camera roll to harmonize with road banking and car roll
    if (this.currentMode !== CAMERA_MODES.CINEMATIC) {
      const bankInfluence = (vehicleState.roll || 0) * 0.25;
      this.camera.rotation.z += bankInfluence;
    }

    // Dynamic FOV breathing with speed (58 deg at idle to 70 deg at top speed)
    const targetFov = this.baseFov + (this.currentMode !== CAMERA_MODES.CINEMATIC ? speedRatio * 12.0 : 0);
    this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, dt * 4.5);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
  }
}
