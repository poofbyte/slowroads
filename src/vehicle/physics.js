import * as THREE from 'three';

export class VehiclePhysics {
  constructor(roadManager, terrainManager, options = {}) {
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;

    // Driving settings
    this.steeringSensitivity = options.steeringSensitivity || 1.0;
    this.cruiseControlEnabled = false;
    this.cruiseSpeed = 0; // m/s

    // Vehicle state
    this.position = new THREE.Vector3(0, 5, 0);
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0; // m/s (positive = forward, negative = reverse)
    this.heading = 0; // Yaw angle in radians

    // Wheel & body dynamic state
    this.steeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.wheelRotation = 0;
    this.pitch = 0; // Chassis dynamic lean
    this.roll = 0;
    this.targetPitch = 0;
    this.targetRoll = 0;

    // Gear state: 'D' (Drive), 'R' (Reverse), 'P' (Park)
    this.gear = 'P';
    this.isBraking = false;
    this.isReversing = false;
    this.isOnRoad = true;

    // Vehicle specifications
    this.maxForwardSpeed = 44.0; // ~158 km/h on asphalt
    this.maxOffroadSpeed = 26.0; // ~94 km/h on grass/terrain
    this.maxReverseSpeed = -10.0; // ~36 km/h in reverse
    this.accelRate = 12.0; // m/s²
    this.brakeRate = 24.0; // m/s²
    this.handbrakeRate = 32.0;
    this.coastDrag = 2.5; // Gentle slowing down when coasting
    this.airDrag = 0.0018;

    this.wheelRadius = 0.38;
    this.wheelbase = 2.7;
    this.trackWidth = 1.7;

    // Initialize car on the starting road point
    this.resetToNearestRoad();
  }

  /**
   * Resets the vehicle onto the nearest road segment facing forward
   */
  resetToNearestRoad() {
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    if (!roadInfo) return;

    // Center of road + clearance
    this.position.copy(roadInfo.point);
    this.position.y += this.wheelRadius + 0.05;

    // Orient forward along road tangent
    const tangent = roadInfo.tangent;
    this.heading = Math.atan2(tangent.x, tangent.z);

    // Build quaternion aligned with road normal and tangent
    const forward = tangent.clone().normalize();
    const up = roadInfo.normal.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
    this.quaternion.setFromRotationMatrix(rotMatrix);

    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.steeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.pitch = 0;
    this.roll = 0;
    this.gear = 'P';
    this.isBraking = false;
    this.isReversing = false;
  }

  /**
   * Step physics simulation forward by deltaTime seconds
   */
  update(dt, input) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.1); // Clamp large delta spikes

    // 1. Process steering input with speed-sensitive damping
    const absSpeed = Math.abs(this.speed);
    // As speed increases, max steering angle decreases for smooth cruising
    const speedFactor = Math.max(0.22, 1.0 - (absSpeed / this.maxForwardSpeed) * 0.72);
    const maxSteerRad = 0.52 * speedFactor * this.steeringSensitivity;

    this.targetSteeringAngle = input.steer * maxSteerRad;
    // Smooth steering lerp (auto-centering when input released)
    const steerSpeed = input.steer !== 0 ? 9.0 : 12.0;
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, this.targetSteeringAngle, dt * steerSpeed);

    // 2. Determine surface type (Road vs Off-road Grass)
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    this.isOnRoad = roadInfo.distanceToCenter <= (this.roadManager.totalHalfWidth + 0.2);

    const currentMaxSpeed = this.isOnRoad ? this.maxForwardSpeed : this.maxOffroadSpeed;
    const surfaceFriction = this.isOnRoad ? 1.0 : 1.45;

    // 3. Process Throttle & Braking / Reverse
    this.isBraking = false;
    this.isReversing = false;

    // Cruise control support
    let throttle = input.throttle;
    if (this.cruiseControlEnabled && throttle === 0 && !input.brake) {
      if (this.speed < this.cruiseSpeed) {
        throttle = 0.6;
      }
    }

    if (throttle > 0) {
      // Accelerate forward
      if (this.speed < -0.5) {
        // Braking while in reverse
        this.speed += this.brakeRate * dt;
        this.isBraking = true;
      } else {
        // Accelerate forward
        const accelEff = Math.max(0.2, 1.0 - (this.speed / currentMaxSpeed));
        this.speed += this.accelRate * throttle * accelEff * dt;
        this.speed = Math.min(this.speed, currentMaxSpeed);
        this.gear = 'D';
      }
    } else if (input.brake > 0) {
      // Brake or Reverse
      if (this.speed > 0.6) {
        // Braking forward movement
        this.speed -= this.brakeRate * input.brake * dt;
        this.isBraking = true;
        this.gear = 'D';
      } else {
        // Reverse
        this.speed -= this.accelRate * 0.65 * input.brake * dt;
        this.speed = Math.max(this.speed, this.maxReverseSpeed);
        this.isReversing = true;
        this.gear = 'R';
      }
    } else {
      // Coasting: gentle friction deceleration
      if (Math.abs(this.speed) > 0.05) {
        const drag = (this.coastDrag * surfaceFriction + this.speed * this.speed * this.airDrag) * dt;
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - drag);
          this.gear = this.speed > 0.2 ? 'D' : 'P';
        } else {
          this.speed = Math.min(0, this.speed + drag);
          this.gear = this.speed < -0.2 ? 'R' : 'P';
        }
      } else {
        this.speed = 0;
        this.gear = 'P';
      }
    }

    // Handbrake
    if (input.handbrake) {
      this.isBraking = true;
      const hbDecel = this.handbrakeRate * dt;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - hbDecel);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + hbDecel);
    }

    // 4. Update Heading (Yaw) from Steering
    if (Math.abs(this.speed) > 0.05) {
      // Turn rate proportional to speed and steering angle
      const turnRate = (this.speed / this.wheelbase) * Math.sin(this.steeringAngle);
      this.heading += turnRate * dt;
    }

    // Forward direction in horizontal plane
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // 5. Move vehicle position in XZ
    this.position.x += forwardX * this.speed * dt;
    this.position.z += forwardZ * this.speed * dt;

    // 6. Ground contact & suspension sampling at 4 wheel points
    const halfBase = this.wheelbase / 2;
    const halfTrack = this.trackWidth / 2;
    const rightX = forwardZ;
    const rightZ = -forwardX;

    // Sample 4 wheel contact elevations
    const fl_h = this.getGroundHeight(
      this.position.x + forwardX * halfBase - rightX * halfTrack,
      this.position.z + forwardZ * halfBase - rightZ * halfTrack
    );
    const fr_h = this.getGroundHeight(
      this.position.x + forwardX * halfBase + rightX * halfTrack,
      this.position.z + forwardZ * halfBase + rightZ * halfTrack
    );
    const rl_h = this.getGroundHeight(
      this.position.x - forwardX * halfBase - rightX * halfTrack,
      this.position.z - forwardZ * halfBase - rightZ * halfTrack
    );
    const rr_h = this.getGroundHeight(
      this.position.x - forwardX * halfBase + rightX * halfTrack,
      this.position.z - forwardZ * halfBase + rightZ * halfTrack
    );

    const avgFrontH = (fl_h + fr_h) * 0.5;
    const avgRearH = (rl_h + rr_h) * 0.5;
    const avgLeftH = (fl_h + rl_h) * 0.5;
    const avgRightH = (fr_h + rr_h) * 0.5;

    // Base target Y elevation
    const targetY = (avgFrontH + avgRearH) * 0.5 + this.wheelRadius;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, dt * 14.0);

    // Ground slope pitch and roll
    const slopePitch = Math.atan2(avgFrontH - avgRearH, this.wheelbase);
    const slopeRoll = Math.atan2(avgRightH - avgLeftH, this.trackWidth);

    // Construct ground orientation quaternion
    const groundForward = new THREE.Vector3(forwardX, Math.sin(slopePitch), forwardZ).normalize();
    const groundRight = new THREE.Vector3(rightX, Math.sin(slopeRoll), rightZ).normalize();
    const groundUp = new THREE.Vector3().crossVectors(groundForward, groundRight).normalize();

    const targetMatrix = new THREE.Matrix4().makeBasis(groundRight, groundUp, groundForward);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMatrix);

    // Smooth orientation slerp
    this.quaternion.slerp(targetQuat, dt * 16.0);

    // 7. Dynamic Chassis Body Pitch & Roll (Suspension Reaction)
    // Acceleration -> rear squat (negative pitch); Braking -> front dive (positive pitch)
    let accelEffect = 0;
    if (throttle > 0) accelEffect = -0.04 * (this.speed < currentMaxSpeed ? 1 : 0);
    if (this.isBraking) accelEffect = 0.065;
    this.targetPitch = accelEffect;

    // Centrifugal roll when cornering (car body tilts outwards)
    const lateralG = (this.speed * this.speed * Math.sin(this.steeringAngle)) / 80.0;
    this.targetRoll = Math.max(-0.08, Math.min(0.08, lateralG * 0.05));

    this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, dt * 8.0);
    this.roll = THREE.MathUtils.lerp(this.roll, this.targetRoll, dt * 8.0);

    // 8. Wheel spin animation
    this.wheelRotation += (this.speed / this.wheelRadius) * dt;

    // Linear velocity vector for audio & camera
    this.velocity.set(forwardX * this.speed, 0, forwardZ * this.speed);
  }

  /**
   * Helper to sample ground elevation at (x, z)
   */
  getGroundHeight(x, z) {
    const roadInfo = this.roadManager.getClosestRoadPoint(x, z);
    if (roadInfo.distanceToCenter <= (this.roadManager.totalHalfWidth + 0.1)) {
      return roadInfo.height;
    }
    return this.terrainManager.getHeightAt(x, z);
  }

  getSpeedKmH() {
    return Math.abs(Math.round(this.speed * 3.6));
  }

  getSpeedMph() {
    return Math.abs(Math.round(this.speed * 2.237));
  }
}
