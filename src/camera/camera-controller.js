import * as THREE from 'three';

export const CAMERA_MODES = {
  CHASE: 'Chase',
  CLOSE_CHASE: 'Close Chase',
  HOOD: 'First Person / Cockpit',
  CINEMATIC: 'Cinematic'
};

/**
 * Vehicle-Adaptive Dynamic Camera Controller
 * Features:
 * - Adapts chase distances and heights automatically to cars, trucks, buses, and motorcycles
 * - First-person hood/cockpit views positioned according to vehicle dimensions
 * - Natural motorcycle leaning roll in corners
 * - Spring-damper smoothing with speed-dependent dynamic FOV breathing
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.modes = [
      CAMERA_MODES.CHASE,
      CAMERA_MODES.CLOSE_CHASE,
      CAMERA_MODES.HOOD,
      CAMERA_MODES.CINEMATIC
    ];
    this.modeIndex = 0;
    this.currentMode = this.modes[this.modeIndex];

    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
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
    const absSpeed = Math.abs(vehicleState.speed || 0);
    const speedRatio = Math.min(1.0, absSpeed / 42.0);

    // Adaptive vehicle scaling
    const isBus = vehicleState.vehicleType === 'bus';
    const isTruck = vehicleState.vehicleType === 'truck';
    const isTwoWheeler = vehicleState.vehicleType === 'bike' || vehicleState.vehicleType === 'scooter';

    const distScale = isBus ? 2.1 : (isTruck ? 1.7 : (isTwoWheeler ? 0.78 : 1.0));
    const heightScale = isBus ? 1.85 : (isTruck ? 1.55 : (isTwoWheeler ? 0.85 : 1.0));

    // Filtered heading with lag so camera smoothly sweeps around corners
    let headingDiff = carHeading - this.smoothHeading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
    this.smoothHeading += headingDiff * Math.min(1.0, dt * 7.5);

    const forwardX = Math.sin(this.smoothHeading);
    const forwardZ = Math.cos(this.smoothHeading);

    const targetPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    switch (this.currentMode) {
      case CAMERA_MODES.CHASE: {
        const distance = (6.2 + speedRatio * 1.6) * distScale;
        const height = (2.45 + speedRatio * 0.35) * heightScale;

        const yawAnticipation = (vehicleState.yawRate || 0) * 0.42;
        const camForwardX = Math.sin(this.smoothHeading + yawAnticipation);
        const camForwardZ = Math.cos(this.smoothHeading + yawAnticipation);

        targetPos.set(
          carPos.x - camForwardX * distance,
          carPos.y + height,
          carPos.z - camForwardZ * distance
        );

        targetLookAt.set(
          carPos.x + forwardX * (8.0 + speedRatio * 8.0),
          carPos.y + 1.25 * heightScale,
          carPos.z + forwardZ * (8.0 + speedRatio * 8.0)
        );
        break;
      }

      case CAMERA_MODES.CLOSE_CHASE: {
        const distance = (4.2 + speedRatio * 0.8) * distScale;
        const height = 1.65 * heightScale;

        targetPos.set(
          carPos.x - forwardX * distance,
          carPos.y + height,
          carPos.z - forwardZ * distance
        );

        targetLookAt.set(
          carPos.x + forwardX * 12.0,
          carPos.y + 1.15 * heightScale,
          carPos.z + forwardZ * 12.0
        );
        break;
      }

      case CAMERA_MODES.HOOD: {
        const carForwardX = Math.sin(carHeading);
        const carForwardZ = Math.cos(carHeading);

        const hoodForwardOffset = isBus ? 3.8 : (isTruck ? 1.8 : (isTwoWheeler ? 0.2 : 0.6));
        const hoodHeight = isBus ? 2.5 : (isTruck ? 2.1 : (isTwoWheeler ? 1.15 : 1.18));

        targetPos.set(
          carPos.x + carForwardX * hoodForwardOffset,
          carPos.y + hoodHeight,
          carPos.z + carForwardZ * hoodForwardOffset
        );

        targetLookAt.set(
          carPos.x + carForwardX * 45.0,
          carPos.y + hoodHeight * 0.9,
          carPos.z + carForwardZ * 45.0
        );
        break;
      }

      case CAMERA_MODES.CINEMATIC: {
        this.orbitAngle += dt * 0.18;
        const orbitDist = 9.0 * distScale;
        const orbitH = (2.5 + Math.sin(this.orbitAngle * 0.6) * 0.9) * heightScale;

        targetPos.set(
          carPos.x + Math.sin(this.orbitAngle) * orbitDist,
          carPos.y + orbitH,
          carPos.z + Math.cos(this.orbitAngle) * orbitDist
        );

        targetLookAt.set(carPos.x, carPos.y + 1.1 * heightScale, carPos.z);
        break;
      }
    }

    if (!this.initialized) {
      this.currentPos.copy(targetPos);
      this.currentLookAt.copy(targetLookAt);
      this.initialized = true;
    } else {
      const isHood = this.currentMode === CAMERA_MODES.HOOD;
      const springFreq = isHood ? 24.0 : 9.5;
      const lookFreq = isHood ? 26.0 : 11.5;

      this.currentPos.lerp(targetPos, Math.min(1.0, dt * springFreq));
      this.currentLookAt.lerp(targetLookAt, Math.min(1.0, dt * lookFreq));
    }

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // Motorcycle roll banking & road banking camera tilt
    if (this.currentMode !== CAMERA_MODES.CINEMATIC) {
      const rollFactor = isTwoWheeler ? 0.65 : 0.25;
      const bankInfluence = (vehicleState.roll || 0) * rollFactor;
      this.camera.rotation.z += bankInfluence;
    }

    // Dynamic FOV breathing
    const targetFov = this.baseFov + (this.currentMode !== CAMERA_MODES.CINEMATIC ? speedRatio * 12.0 : 0);
    this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, dt * 4.5);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
  }
}
