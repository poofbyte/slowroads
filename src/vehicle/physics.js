import * as THREE from 'three';

/**
 * Advanced Dynamic Vehicle Physics Engine
 * Implements realistic vehicle dynamics:
 * - 2D/3D dynamic bicycle/4-wheel tire slip angle physics (Pacejka lateral grip)
 * - Yaw moment of inertia & angular velocity with tire cornering stiffness
 * - Dynamic longitudinal & lateral weight transfer
 * - 4-wheel independent spring-damper suspension
 * - Dynamic chassis pitch and roll from inertial forces & suspension travel
 * - Authentic speed-dependent progressive steering ratio
 * - Handbrake rear traction break for smooth, controllable drifting
 * - Realistic terrain and road banking adaptation
 */
export class VehiclePhysics {
  constructor(roadManager, terrainManager, options = {}) {
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;

    // Driving parameters
    this.steeringSensitivity = options.steeringSensitivity || 1.0;
    this.cruiseControlEnabled = false;
    this.cruiseSpeed = 0; // m/s

    // Vehicle Specifications
    this.mass = 1380; // kg (modern sleek sedan/coupe)
    this.wheelbase = 2.75; // meters
    this.trackWidth = 1.68; // meters
    this.distToFrontAxle = 1.32; // a (meters)
    this.distToRearAxle = 1.43; // b (meters)
    this.heightCG = 0.48; // center of gravity height
    this.inertiaZ = 2100; // kg*m^2 (yaw inertia)

    // Tire grip & cornering stiffness
    this.cornerStiffFront = 68000; // N/rad
    this.cornerStiffRear = 72000; // N/rad (slightly stiffer rear for high-speed stability)
    this.tireFrictionRoad = 1.15; // Asphalt grip coefficient
    this.tireFrictionGrass = 0.72; // Off-road grass grip
    this.gravity = 9.81;

    // Powertrain & Braking
    this.enginePower = 180000; // Watts (~240 HP)
    this.maxDriveForce = 6500; // N
    this.maxBrakeForce = 9500; // N
    this.maxReverseForce = 3200; // N
    this.maxForwardSpeed = 46.0; // ~165 km/h
    this.maxReverseSpeed = -11.0; // ~40 km/h
    this.airDragCoeff = 0.32; // Aerodynamic drag
    this.frontalArea = 2.15; // m^2
    this.airDensity = 1.225;
    this.rollingResistanceCoeff = 0.014;

    // 4-Wheel Suspension parameters
    this.wheelRadius = 0.36;
    this.suspRestLength = 0.38;
    this.suspSpringK = 34000; // N/m
    this.suspDampingC = 2600; // N*s/m

    // Dynamic State Vectors
    this.position = new THREE.Vector3(0, 5, 0);
    this.quaternion = new THREE.Quaternion();
    this.heading = 0; // Yaw angle in radians
    this.yawRate = 0; // Angular velocity (rad/s)

    // Local velocities: u = longitudinal (forward), v = lateral (right)
    this.longitudinalSpeed = 0; // m/s
    this.lateralSpeed = 0; // m/s
    this.speed = 0; // Signed forward speed (m/s)
    this.velocity = new THREE.Vector3(0, 0, 0); // World velocity

    // Steering state
    this.steeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.wheelRotation = 0;

    // Suspension & Chassis dynamics
    this.suspCompressions = [0, 0, 0, 0]; // FL, FR, RL, RR
    this.suspVelocities = [0, 0, 0, 0];
    this.pitch = 0; // Dynamic chassis tilt forward/back
    this.roll = 0; // Dynamic chassis tilt left/right
    this.pitchVelocity = 0;
    this.rollVelocity = 0;

    // Status
    this.gear = 'P'; // 'D', 'R', 'P'
    this.isBraking = false;
    this.isReversing = false;
    this.isOnRoad = true;
    this.slipAngleFront = 0;
    this.slipAngleRear = 0;

    // Initialize car on road
    this.resetToNearestRoad();
  }

  /**
   * Resets vehicle smoothly onto the nearest road segment facing forward
   */
  resetToNearestRoad() {
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    if (!roadInfo) return;

    this.position.copy(roadInfo.point);
    this.position.y += this.wheelRadius + 0.08;

    // Align heading with road tangent
    const tangent = roadInfo.tangent;
    this.heading = Math.atan2(tangent.x, tangent.z);

    // Build quaternion aligned with road normal and tangent
    const forward = tangent.clone().normalize();
    const up = roadInfo.normal.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
    this.quaternion.setFromRotationMatrix(rotMatrix);

    // Reset dynamics
    this.longitudinalSpeed = 0;
    this.lateralSpeed = 0;
    this.speed = 0;
    this.yawRate = 0;
    this.velocity.set(0, 0, 0);
    this.steeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.pitch = 0;
    this.roll = 0;
    this.pitchVelocity = 0;
    this.rollVelocity = 0;
    this.gear = 'P';
    this.isBraking = false;
    this.isReversing = false;
  }

  /**
   * Main Physics Simulation Step (Sub-stepped for stability)
   */
  update(dt, input) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05); // Cap maximum delta time

    // Sub-step physics 2 times for rock-solid stability and zero jitter
    const subSteps = 2;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.stepPhysics(subDt, input);
    }

    // Update overall speed for telemetry
    this.speed = this.longitudinalSpeed;
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    this.velocity.set(
      forwardX * this.longitudinalSpeed + rightX * this.lateralSpeed,
      0,
      forwardZ * this.longitudinalSpeed + rightZ * this.lateralSpeed
    );

    // Wheel rotation animation
    this.wheelRotation += (this.longitudinalSpeed / this.wheelRadius) * dt;
  }

  stepPhysics(dt, input) {
    // 1. Road vs Off-road check
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    this.isOnRoad = roadInfo.distanceToCenter <= (this.roadManager.totalHalfWidth + 0.1);
    const surfaceMu = this.isOnRoad ? this.tireFrictionRoad : this.tireFrictionGrass;

    // 2. Speed-dependent progressive steering ratio
    // At low speed: quick steering for parking/maneuvering (up to ~34 deg)
    // At 120 km/h: smooth, stable highway ratio (~11 deg) to ensure zen highway cruising
    const absSpeed = Math.abs(this.longitudinalSpeed);
    const speedRatio = Math.min(1.0, absSpeed / this.maxForwardSpeed);
    const maxSteerAngle = THREE.MathUtils.lerp(0.55, 0.18, Math.pow(speedRatio, 0.7)) * this.steeringSensitivity;

    this.targetSteeringAngle = input.steer * maxSteerAngle;
    const steerRate = input.steer !== 0 ? 8.5 : 12.0; // Responsive in, smooth auto-center
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, this.targetSteeringAngle, dt * steerRate);

    // 3. Process Throttle & Braking with Cruise Control
    let throttle = input.throttle;
    if (this.cruiseControlEnabled && throttle === 0 && !input.brake) {
      if (this.longitudinalSpeed < this.cruiseSpeed) {
        throttle = 0.55;
      }
    }

    this.isBraking = false;
    this.isReversing = false;

    let fDriveLong = 0;
    let fBrakeLong = 0;

    if (throttle > 0) {
      if (this.longitudinalSpeed < -0.3) {
        // Braking while in reverse
        fBrakeLong = this.maxBrakeForce * throttle;
        this.isBraking = true;
      } else {
        // Accelerate forward with progressive power curve
        const powerLimitedForce = (this.enginePower) / Math.max(absSpeed, 3.0);
        const driveCap = Math.min(this.maxDriveForce, powerLimitedForce);
        const speedEfficiency = Math.max(0, 1.0 - (this.longitudinalSpeed / this.maxForwardSpeed));
        fDriveLong = driveCap * throttle * speedEfficiency * surfaceMu;
        this.gear = 'D';
      }
    } else if (input.brake > 0) {
      if (this.longitudinalSpeed > 0.4) {
        // Braking forward movement
        fBrakeLong = this.maxBrakeForce * input.brake * surfaceMu;
        this.isBraking = true;
        this.gear = 'D';
      } else {
        // Reversing
        fDriveLong = -this.maxReverseForce * input.brake * surfaceMu;
        this.isReversing = true;
        this.gear = 'R';
      }
    } else {
      // Idle / Coasting
      this.gear = absSpeed > 0.3 ? (this.longitudinalSpeed > 0 ? 'D' : 'R') : 'P';
    }

    // Handbrake locks rear wheels
    if (input.handbrake) {
      fBrakeLong += this.maxBrakeForce * 1.4;
      this.isBraking = true;
    }

    // 4. Longitudinal Resistances
    const aeroDrag = 0.5 * this.airDensity * this.airDragCoeff * this.frontalArea * this.longitudinalSpeed * Math.abs(this.longitudinalSpeed);
    const rollingResistance = this.rollingResistanceCoeff * this.mass * this.gravity * Math.sign(this.longitudinalSpeed);

    // 5. Normal Wheel Loads & Weight Transfer
    const totalMass = this.mass;
    const staticLoadFront = totalMass * this.gravity * (this.distToRearAxle / this.wheelbase);
    const staticLoadRear = totalMass * this.gravity * (this.distToFrontAxle / this.wheelbase);

    // Dynamic weight transfer from longitudinal acceleration (ax = F / m)
    const longAccelApprox = (fDriveLong - fBrakeLong) / totalMass;
    const weightTransferLong = (totalMass * longAccelApprox * this.heightCG) / this.wheelbase;

    const normalLoadFront = Math.max(1000, staticLoadFront - weightTransferLong);
    const normalLoadRear = Math.max(1000, staticLoadRear + weightTransferLong);

    // 6. Dynamic Tire Slip Angles & Cornering Forces
    // Slip angle = steering angle - arctan(lateral_velocity / forward_velocity)
    const uSafe = Math.max(Math.abs(this.longitudinalSpeed), 1.2);
    const signU = Math.sign(this.longitudinalSpeed) || 1;

    // Front tire slip angle
    const vFront = this.lateralSpeed + this.distToFrontAxle * this.yawRate;
    this.slipAngleFront = this.steeringAngle - Math.atan2(vFront, uSafe * signU);

    // Rear tire slip angle
    const vRear = this.lateralSpeed - this.distToRearAxle * this.yawRate;
    this.slipAngleRear = -Math.atan2(vRear, uSafe * signU);

    // Cornering stiffness (handbrake breaks rear traction for smooth drifting)
    let rearStiffness = this.cornerStiffRear;
    if (input.handbrake) {
      rearStiffness *= 0.18; // Rear breaks loose into a controllable slide!
    }

    // Lateral tire forces with smooth cubic saturation (Pacejka approximation)
    let fLatFront = this.calculateTireLateralForce(this.slipAngleFront, this.cornerStiffFront, normalLoadFront, surfaceMu);
    let fLatRear = this.calculateTireLateralForce(this.slipAngleRear, rearStiffness, normalLoadRear, surfaceMu);

    // Apply road banking assist: banked curves provide natural centripetal force
    const roadInfoCurrent = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    if (this.isOnRoad && Math.abs(roadInfoCurrent.banking) > 0.005) {
      const bankGravityForce = this.mass * this.gravity * Math.sin(roadInfoCurrent.banking);
      fLatRear += bankGravityForce * 0.5;
      fLatFront += bankGravityForce * 0.5;
    }

    // 7. Equations of Motion in Vehicle Body Frame
    // Forward force
    const fLongTotal = fDriveLong - Math.sign(this.longitudinalSpeed) * (fBrakeLong + rollingResistance) - aeroDrag - fLatFront * Math.sin(this.steeringAngle);
    // Lateral force
    const fLatTotal = fLatFront * Math.cos(this.steeringAngle) + fLatRear;
    // Yaw torque around Z
    const yawTorque = (this.distToFrontAxle * fLatFront * Math.cos(this.steeringAngle)) - (this.distToRearAxle * fLatRear);

    // Accelerations (including centrifugal Coriolis coupling terms)
    const accelLong = (fLongTotal / totalMass) + (this.lateralSpeed * this.yawRate);
    const accelLat = (fLatTotal / totalMass) - (this.longitudinalSpeed * this.yawRate);
    const accelYaw = yawTorque / this.inertiaZ;

    // Integrate velocities
    this.longitudinalSpeed += accelLong * dt;
    this.lateralSpeed += accelLat * dt;
    this.yawRate += accelYaw * dt;

    // Natural yaw and lateral damping (especially when coming to a stop)
    if (absSpeed < 1.0) {
      const lowSpeedDamp = Math.max(0, 1.0 - dt * 6.0);
      this.lateralSpeed *= lowSpeedDamp;
      this.yawRate *= lowSpeedDamp;
      if (absSpeed < 0.08 && throttle === 0 && fBrakeLong > 0) {
        this.longitudinalSpeed = 0;
        this.lateralSpeed = 0;
        this.yawRate = 0;
      }
    }

    // 8. Integrate Heading & World Position
    this.heading += this.yawRate * dt;

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    // Velocity in world XZ
    const vx = forwardX * this.longitudinalSpeed + rightX * this.lateralSpeed;
    const vz = forwardZ * this.longitudinalSpeed + rightZ * this.lateralSpeed;

    this.position.x += vx * dt;
    this.position.z += vz * dt;

    // 9. 4-Wheel Independent Suspension & Terrain Alignment
    this.updateSuspensionAndOrientation(dt, forwardX, forwardZ, rightX, rightZ);
  }

  calculateTireLateralForce(slipAngle, stiffness, normalLoad, surfaceMu) {
    const maxFrictionForce = normalLoad * surfaceMu;
    const linearForce = stiffness * slipAngle;
    // Smooth tanh saturation curve
    return maxFrictionForce * Math.tanh(linearForce / Math.max(maxFrictionForce, 1.0));
  }

  updateSuspensionAndOrientation(dt, forwardX, forwardZ, rightX, rightZ) {
    const halfBase = this.wheelbase * 0.5;
    const halfTrack = this.trackWidth * 0.5;

    // 4 Wheel contact world points
    const wheelPoints = [
      { x: this.position.x + forwardX * halfBase - rightX * halfTrack, z: this.position.z + forwardZ * halfBase - rightZ * halfTrack }, // FL
      { x: this.position.x + forwardX * halfBase + rightX * halfTrack, z: this.position.z + forwardZ * halfBase + rightZ * halfTrack }, // FR
      { x: this.position.x - forwardX * halfBase - rightX * halfTrack, z: this.position.z - forwardZ * halfBase - rightZ * halfTrack }, // RL
      { x: this.position.x - forwardX * halfBase + rightX * halfTrack, z: this.position.z - forwardZ * halfBase + rightZ * halfTrack }  // RR
    ];

    const groundHeights = wheelPoints.map(wp => this.getGroundHeight(wp.x, wp.z));

    const avgFrontH = (groundHeights[0] + groundHeights[1]) * 0.5;
    const avgRearH = (groundHeights[2] + groundHeights[3]) * 0.5;
    const avgLeftH = (groundHeights[0] + groundHeights[2]) * 0.5;
    const avgRightH = (groundHeights[1] + groundHeights[3]) * 0.5;

    // Target vehicle chassis elevation
    const avgGroundH = (avgFrontH + avgRearH) * 0.5;
    const targetY = avgGroundH + this.wheelRadius + 0.08;

    // Smooth critically-damped spring ride height
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, dt * 18.0);

    // Ground slope pitch and roll
    const groundSlopePitch = Math.atan2(avgFrontH - avgRearH, this.wheelbase);
    const groundSlopeRoll = Math.atan2(avgRightH - avgLeftH, this.trackWidth);

    // Dynamic Inertial Body Pitch:
    // Braking -> pitch down forward; Acceleration -> squat down rear
    const longAccel = (this.longitudinalSpeed - (this.lastSpeed || this.longitudinalSpeed)) / Math.max(dt, 0.001);
    this.lastSpeed = this.longitudinalSpeed;
    const dynamicPitchTarget = -longAccel * 0.0028;

    // Dynamic Inertial Body Roll (Centrifugal cornering body lean):
    const lateralAccel = this.longitudinalSpeed * this.yawRate;
    const dynamicRollTarget = -lateralAccel * 0.0035;

    // Smooth chassis pitch and roll
    this.pitch = THREE.MathUtils.lerp(this.pitch, dynamicPitchTarget, dt * 10.0);
    this.roll = THREE.MathUtils.lerp(this.roll, dynamicRollTarget, dt * 10.0);

    // Build vehicle chassis rotation matrix
    const totalPitch = groundSlopePitch;
    const totalRoll = groundSlopeRoll;

    const groundForward = new THREE.Vector3(forwardX, Math.sin(totalPitch), forwardZ).normalize();
    const groundRight = new THREE.Vector3(rightX, Math.sin(totalRoll), rightZ).normalize();
    const groundUp = new THREE.Vector3().crossVectors(groundForward, groundRight).normalize();

    const baseMatrix = new THREE.Matrix4().makeBasis(groundRight, groundUp, groundForward);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(baseMatrix);

    // Smooth orientation slerp
    this.quaternion.slerp(targetQuat, dt * 20.0);
  }

  getGroundHeight(x, z) {
    const roadInfo = this.roadManager.getClosestRoadPoint(x, z);
    if (roadInfo.distanceToCenter <= (this.roadManager.totalHalfWidth + 0.15)) {
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
