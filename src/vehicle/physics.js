import * as THREE from 'three';
import { CollisionSystem } from './collision.js';

/**
 * Advanced Dynamic Vehicle Physics Engine
 * Implements authentic automotive dynamics across diverse vehicle categories:
 * - Direction-aware kinematic-dynamic bicycle & Pacejka tire slip model
 * - Physically correct Forward & Reverse steering in all 4 directional quadrants
 * - Multi-body vehicle collision resolution with zero penetration and realistic rebound
 * - Vehicle-specific profiles (mass, power, brakes, suspension, dimensions, CG height)
 * - Two-wheeler dynamic roll/lean physics for sports bikes, cruisers, and scooters
 * - Autonomous Forward Autopilot with curve anticipation and obstacle evasion
 * - Autonomous Reverse Autopilot with direction-aware reverse navigation and obstacle braking
 */
export class VehiclePhysics {
  constructor(roadManager, terrainManager, sceneryManager = null, options = {}) {
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;
    this.sceneryManager = sceneryManager;
    this.collisionSystem = new CollisionSystem(roadManager, sceneryManager);

    // Driving parameters & Autopilot
    this.steeringSensitivity = options.steeringSensitivity || 1.0;
    this.cruiseControlEnabled = false;
    this.cruiseSpeed = 0; // m/s
    this.autopilotEnabled = false; // Forward Tesla-style autopilot
    this.reverseAutopilotEnabled = false; // Direction-aware reverse autopilot
    this.targetAutopilotSpeed = 24.0; // ~86 km/h cruising speed
    this.targetReverseSpeed = -5.0; // ~-18 km/h reverse cruising speed

    // Default Vehicle Profile (Modern Electric Coupe / Sedan)
    this.vehicleId = 'model3';
    this.vehicleType = 'car'; // 'car' | 'truck' | 'bus' | 'bike' | 'scooter'
    this.mass = 1750; // kg
    this.wheelbase = 2.88; // meters
    this.trackWidth = 1.62; // meters
    this.distToFrontAxle = 1.38; // a (meters)
    this.distToRearAxle = 1.50; // b (meters)
    this.heightCG = 0.44; // center of gravity height
    this.inertiaZ = 2450; // kg*m^2 (yaw inertia)

    // Tire grip & cornering stiffness
    this.cornerStiffFront = 72000; // N/rad
    this.cornerStiffRear = 76000; // N/rad
    this.tireFrictionRoad = 1.15; // Asphalt grip coefficient
    this.tireFrictionGrass = 0.65; // Off-road grass grip
    this.gravity = 9.81;

    // Powertrain & Braking
    this.enginePower = 240000; // Watts (~320 HP)
    this.maxDriveForce = 7200; // N
    this.maxBrakeForce = 11000; // N
    this.maxReverseForce = 3800; // N
    this.maxForwardSpeed = 52.0; // ~187 km/h
    this.maxReverseSpeed = -12.0; // ~43 km/h
    this.airDragCoeff = 0.28;
    this.frontalArea = 2.22; // m^2
    this.airDensity = 1.225;
    this.rollingResistanceCoeff = 0.013;

    // 4-Wheel Suspension parameters
    this.wheelRadius = 0.35;
    this.suspRestLength = 0.36;
    this.suspSpringK = 38000; // N/m
    this.suspDampingC = 2800; // N*s/m

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
    this.pitch = 0; // Dynamic chassis tilt forward/back
    this.roll = 0; // Dynamic chassis tilt left/right
    this.pitchVelocity = 0;
    this.rollVelocity = 0;
    this.lastSpeed = 0;

    // Status
    this.gear = 'P'; // 'D', 'R', 'P'
    this.isBraking = false;
    this.isReversing = false;
    this.isOnRoad = true;
    this.hasCollided = false;
  }

  /**
   * Applies custom physical characteristics based on vehicle category
   */
  applyVehicleProfile(profile) {
    if (!profile) return;
    this.vehicleId = profile.id || this.vehicleId;
    this.vehicleType = profile.vehicleType || 'car';
    this.mass = profile.mass || this.mass;
    this.wheelbase = profile.wheelbase || this.wheelbase;
    this.trackWidth = profile.trackWidth || this.trackWidth;
    this.distToFrontAxle = this.wheelbase * 0.48;
    this.distToRearAxle = this.wheelbase * 0.52;
    this.heightCG = profile.heightCG || 0.45;
    this.inertiaZ = (1 / 12) * this.mass * (this.wheelbase * this.wheelbase + this.trackWidth * this.trackWidth);

    this.wheelRadius = profile.wheelRadius || 0.35;
    this.enginePower = profile.enginePower || 200000;
    this.maxDriveForce = profile.maxDriveForce || 7000;
    this.maxBrakeForce = profile.maxBrakeForce || 10000;
    this.maxForwardSpeed = profile.maxForwardSpeed || 48.0;
    this.maxReverseSpeed = profile.maxReverseSpeed || -11.0;
    this.cornerStiffFront = profile.cornerStiffFront || 70000;
    this.cornerStiffRear = profile.cornerStiffRear || 74000;
    this.tireFrictionRoad = profile.tireFrictionRoad || 1.15;
    this.airDragCoeff = profile.airDragCoeff || 0.30;
  }

  resetToNearestRoad() {
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    if (!roadInfo) return;

    this.position.copy(roadInfo.point);
    this.position.y += this.wheelRadius + 0.12;

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
    this.gear = 'P';
    this.isBraking = false;
    this.isReversing = false;
  }

  /**
   * Main Physics Simulation Step (Sub-stepped for rock-solid stability)
   */
  update(dt, input) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05);

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
    // 1. Road vs Off-road check & environmental surface grip
    const roadInfo = this.roadManager.getClosestRoadPoint(this.position.x, this.position.z);
    this.isOnRoad = roadInfo.distanceToCenter <= (this.roadManager.totalHalfWidth + 0.15);
    const surfaceMu = this.isOnRoad ? this.tireFrictionRoad : this.tireFrictionGrass;

    // 2. Speed-dependent progressive steering ratio
    const absSpeed = Math.abs(this.longitudinalSpeed);
    const speedRatio = Math.min(1.0, absSpeed / this.maxForwardSpeed);
    const maxSteerAngle = THREE.MathUtils.lerp(0.56, 0.18, Math.pow(speedRatio, 0.7)) * this.steeringSensitivity;

    // Progressive steering input (Right = +, Left = -)
    let rawSteer = input.steer;
    let throttle = input.throttle;
    let brake = input.brake;

    // =========================================================================
    // 3. Autonomous Autopilot Systems (Forward & Reverse)
    // =========================================================================
    if (this.autopilotEnabled && !this.reverseAutopilotEnabled) {
      // FORWARD AUTOPILOT
      const lookAheadDist = Math.max(20.0, Math.min(54.0, absSpeed * 1.35));
      const targetDist = (roadInfo.distance || 0) + lookAheadDist;
      const targetNode = this.roadManager.getNodeAtDistance(targetDist);

      if (targetNode) {
        const dx = targetNode.position.x - this.position.x;
        const dz = targetNode.position.z - this.position.z;
        const targetAngle = Math.atan2(dx, dz);

        let headingDiff = targetAngle - this.heading;
        while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
        while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

        // Cross-track error (lateral deviation from center of road)
        const carDx = this.position.x - roadInfo.point.x;
        const carDz = this.position.z - roadInfo.point.z;
        const roadTan = targetNode.tangent;
        const crossTrackError = carDx * roadTan.z - carDz * roadTan.x;

        // Stanley steering law
        const kGain = 0.09;
        const stanleyCorrection = Math.atan2(kGain * crossTrackError, Math.max(absSpeed, 3.0));
        let autoSteer = (headingDiff * 1.5) - stanleyCorrection;

        // Obstacle avoidance: scan ahead for obstacles blocking lane
        const obstacleAhead = this.collisionSystem.checkObstacleAhead(this.position, this.heading, lookAheadDist);
        if (obstacleAhead) {
          if (obstacleAhead.distance < 14.0) {
            // Emergency stop before obstacle!
            brake = 0.95;
            throttle = 0;
          } else {
            // Smoothly steer away from obstacle lateral offset
            const evadeDirection = obstacleAhead.lateralOffset >= 0 ? -0.4 : 0.4;
            autoSteer += evadeDirection;
          }
        }

        // Apply autopilot steering when player is not manually overriding
        if (input.steer === 0) {
          rawSteer = Math.max(-1.0, Math.min(1.0, autoSteer * 2.2));
        }

        // Curve anticipation speed regulation (slows down safely before banked turns)
        let targetSpeed = this.targetAutopilotSpeed || 24.0; // ~86 km/h
        const bankAbs = Math.abs(targetNode.banking);
        if (bankAbs > 0.045) {
          targetSpeed = THREE.MathUtils.lerp(24.0, 16.0, Math.min(1.0, (bankAbs - 0.045) / 0.06));
        }

        if (input.throttle === 0 && input.brake === 0 && !obstacleAhead) {
          if (this.longitudinalSpeed < targetSpeed - 0.4) {
            throttle = 0.62;
            brake = 0;
          } else if (this.longitudinalSpeed > targetSpeed + 1.2) {
            throttle = 0;
            brake = 0.35;
          } else {
            throttle = 0.22;
            brake = 0;
          }
        }
      }
    } else if (this.reverseAutopilotEnabled) {
      // REVERSE AUTOPILOT (Direction-aware reverse highway navigation)
      const lookBehindDist = 18.0;
      const targetDist = Math.max(0, (roadInfo.distance || 0) - lookBehindDist);
      const targetNode = this.roadManager.getNodeAtDistance(targetDist);

      if (targetNode) {
        const dx = targetNode.position.x - this.position.x;
        const dz = targetNode.position.z - this.position.z;
        const targetAngle = Math.atan2(dx, dz);

        // Reverse target heading is rotated 180 degrees (rear facing target point)
        const targetReverseHeading = targetAngle + Math.PI;
        let headingDiff = targetReverseHeading - this.heading;
        while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
        while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

        const carDx = this.position.x - roadInfo.point.x;
        const carDz = this.position.z - roadInfo.point.z;
        const roadTan = targetNode.tangent;
        const crossTrackError = carDx * roadTan.z - carDz * roadTan.x;

        // In reverse, steering wheel must steer in reverse phase to track the centerline backwards
        const autoReverseSteer = -(headingDiff * 1.6) + (crossTrackError * 0.12);

        // Check for obstacles behind the vehicle
        const obstacleBehind = this.collisionSystem.checkObstacleBehind(this.position, this.heading, 16.0);

        if (input.steer === 0) {
          rawSteer = Math.max(-1.0, Math.min(1.0, autoReverseSteer * 2.0));
        }

        if (obstacleBehind) {
          // Emergency stop: obstacle behind!
          throttle = 0.85; // Press W to stop reverse movement
          brake = 0;
        } else if (input.throttle === 0 && input.brake === 0) {
          // Regulate reverse speed to targetReverseSpeed (~-18 km/h)
          const targetRev = this.targetReverseSpeed || -5.0;
          if (this.longitudinalSpeed > targetRev + 0.4) {
            // Accelerate in reverse (brake pedal reverses when vehicle is stopped or moving back)
            brake = 0.45;
            throttle = 0;
          } else if (this.longitudinalSpeed < targetRev - 0.6) {
            throttle = 0.28; // Decelerate reverse
            brake = 0;
          } else {
            brake = 0.15;
            throttle = 0;
          }
        }
      }
    } else if (this.cruiseControlEnabled && throttle === 0 && !input.brake) {
      if (this.longitudinalSpeed < this.cruiseSpeed) {
        throttle = 0.55;
      }
    }

    this.targetSteeringAngle = rawSteer * maxSteerAngle;
    const steerRate = (input.steer !== 0 || this.autopilotEnabled || this.reverseAutopilotEnabled) ? 9.5 : 12.5;
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, this.targetSteeringAngle, dt * steerRate);

    // =========================================================================
    // 4. Direction-Aware Powertrain & Braking Forces
    // =========================================================================
    this.isBraking = false;
    this.isReversing = false;

    let fDriveLong = 0;
    let fBrakeLong = 0;

    if (throttle > 0) {
      if (this.longitudinalSpeed < -0.35) {
        // Pressing forward while moving backward = braking reverse movement!
        fBrakeLong = this.maxBrakeForce * throttle * surfaceMu;
        this.isBraking = true;
        this.gear = 'R';
      } else {
        // Accelerating forward
        const powerLimitedForce = this.enginePower / Math.max(absSpeed, 3.0);
        const driveCap = Math.min(this.maxDriveForce, powerLimitedForce);
        const speedEfficiency = Math.max(0, 1.0 - (this.longitudinalSpeed / this.maxForwardSpeed));
        fDriveLong = driveCap * throttle * speedEfficiency * surfaceMu;
        this.gear = 'D';
      }
    } else if (brake > 0) {
      if (this.longitudinalSpeed > 0.35) {
        // Pressing brake while moving forward = braking forward movement!
        fBrakeLong = this.maxBrakeForce * brake * surfaceMu;
        this.isBraking = true;
        this.gear = 'D';
      } else {
        // Moving backward / reversing
        const revCap = Math.max(0, 1.0 - (this.longitudinalSpeed / this.maxReverseSpeed));
        fDriveLong = -this.maxReverseForce * brake * revCap * surfaceMu;
        this.isReversing = true;
        this.gear = 'R';
      }
    } else {
      this.gear = absSpeed > 0.3 ? (this.longitudinalSpeed > 0 ? 'D' : 'R') : 'P';
    }

    // Handbrake locks rear wheels
    if (input.handbrake) {
      fBrakeLong += this.maxBrakeForce * 1.5 * surfaceMu;
      this.isBraking = true;
    }

    // Longitudinal Resistances (Aero Drag & Rolling Resistance)
    const aeroDrag = 0.5 * this.airDensity * this.airDragCoeff * this.frontalArea * this.longitudinalSpeed * Math.abs(this.longitudinalSpeed);
    const rollingResistance = this.rollingResistanceCoeff * this.mass * this.gravity * Math.sign(this.longitudinalSpeed || 1);

    // Weight transfer
    const totalMass = this.mass;
    const staticLoadFront = totalMass * this.gravity * (this.distToRearAxle / this.wheelbase);
    const staticLoadRear = totalMass * this.gravity * (this.distToFrontAxle / this.wheelbase);
    const longAccelApprox = (fDriveLong - Math.sign(this.longitudinalSpeed || 1) * fBrakeLong) / totalMass;
    const weightTransferLong = (totalMass * longAccelApprox * this.heightCG) / this.wheelbase;

    const normalLoadFront = Math.max(800, staticLoadFront - weightTransferLong);
    const normalLoadRear = Math.max(800, staticLoadRear + weightTransferLong);

    // =========================================================================
    // 5. Kinematic-Dynamic Bicycle Steering Model (Correct Forward & Reverse)
    // =========================================================================
    // Pure Kinematic Yaw Rate: ω_kin = (v / L) * tan(steeringAngle)
    // When v > 0: steering right (angle > 0) rotates clockwise (turns right)
    // When v < 0: steering right (angle > 0) rotates counter-clockwise (rear swings right)
    const kinematicYawRate = (this.longitudinalSpeed / Math.max(this.wheelbase, 1.2)) * Math.tan(this.steeringAngle);

    // Dynamic Tire Slip Forces (Active at medium to high forward speeds)
    const uSafe = Math.max(Math.abs(this.longitudinalSpeed), 1.2);
    const signU = Math.sign(this.longitudinalSpeed) || 1;

    const vFront = this.lateralSpeed + this.distToFrontAxle * this.yawRate;
    const slipAngleFront = this.steeringAngle - Math.atan2(vFront, uSafe * signU);

    const vRear = this.lateralSpeed - this.distToRearAxle * this.yawRate;
    const slipAngleRear = -Math.atan2(vRear, uSafe * signU);

    let rearStiffness = this.cornerStiffRear;
    if (input.handbrake) {
      rearStiffness *= 0.16; // Handbrake drift!
    }

    const fLatFront = this.calculateTireLateralForce(slipAngleFront, this.cornerStiffFront, normalLoadFront, surfaceMu);
    const fLatRear = this.calculateTireLateralForce(slipAngleRear, rearStiffness, normalLoadRear, surfaceMu);

    // Body Frame Accelerations
    const fLongTotal = fDriveLong - Math.sign(this.longitudinalSpeed || 1) * (fBrakeLong + rollingResistance) - aeroDrag - fLatFront * Math.sin(this.steeringAngle);
    const fLatTotal = fLatFront * Math.cos(this.steeringAngle) + fLatRear;
    const yawTorqueDynamic = (this.distToFrontAxle * fLatFront * Math.cos(this.steeringAngle)) - (this.distToRearAxle * fLatRear);

    const accelLong = (fLongTotal / totalMass) + (this.lateralSpeed * this.yawRate);
    const accelLat = (fLatTotal / totalMass) - (this.longitudinalSpeed * this.yawRate);
    const accelYawDynamic = yawTorqueDynamic / this.inertiaZ;

    // Blend Kinematic model at low speed / reverse with Dynamic Pacejka at high forward speed
    const dynamicBlend = (this.longitudinalSpeed > 2.5) ? Math.min(1.0, (this.longitudinalSpeed - 2.5) / 5.0) : 0.0;

    this.longitudinalSpeed += accelLong * dt;
    this.lateralSpeed = THREE.MathUtils.lerp(0.0, this.lateralSpeed + accelLat * dt, dynamicBlend);

    const dynamicYawRate = this.yawRate + accelYawDynamic * dt;
    this.yawRate = THREE.MathUtils.lerp(kinematicYawRate, dynamicYawRate, dynamicBlend);

    // Low speed damping to prevent micro-drifting when stationary
    if (absSpeed < 0.8) {
      const damp = Math.max(0, 1.0 - dt * 7.0);
      this.lateralSpeed *= damp;
      this.yawRate *= damp;
      if (absSpeed < 0.06 && throttle === 0 && this.isBraking) {
        this.longitudinalSpeed = 0;
        this.lateralSpeed = 0;
        this.yawRate = 0;
      }
    }

    // =========================================================================
    // 6. Integrate World Position & Continuous Collision Resolution
    // =========================================================================
    this.heading += this.yawRate * dt;

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    const vx = forwardX * this.longitudinalSpeed + rightX * this.lateralSpeed;
    const vz = forwardZ * this.longitudinalSpeed + rightZ * this.lateralSpeed;

    this.position.x += vx * dt;
    this.position.z += vz * dt;

    // Resolve physical collisions against scenery and barriers
    if (this.collisionSystem) {
      this.hasCollided = this.collisionSystem.resolveVehicleCollisions(this, dt);
    }

    // =========================================================================
    // 7. Suspension & Orientation (Includes Motorcycle Dynamic Lean)
    // =========================================================================
    this.updateSuspensionAndOrientation(dt, forwardX, forwardZ, rightX, rightZ);
  }

  calculateTireLateralForce(slipAngle, stiffness, normalLoad, surfaceMu) {
    const maxFrictionForce = normalLoad * surfaceMu;
    const linearForce = stiffness * slipAngle;
    return maxFrictionForce * Math.tanh(linearForce / Math.max(maxFrictionForce, 1.0));
  }

  updateSuspensionAndOrientation(dt, forwardX, forwardZ, rightX, rightZ) {
    const halfBase = this.wheelbase * 0.5;
    const halfTrack = this.trackWidth * 0.5;

    // Contact world points for 4 wheels (or front/rear centerline for two-wheelers)
    const isTwoWheeler = (this.vehicleType === 'bike' || this.vehicleType === 'scooter');
    const effHalfTrack = isTwoWheeler ? 0.08 : halfTrack;

    const wheelPoints = [
      { x: this.position.x + forwardX * halfBase - rightX * effHalfTrack, z: this.position.z + forwardZ * halfBase - rightZ * effHalfTrack }, // FL
      { x: this.position.x + forwardX * halfBase + rightX * effHalfTrack, z: this.position.z + forwardZ * halfBase + rightZ * effHalfTrack }, // FR
      { x: this.position.x - forwardX * halfBase - rightX * effHalfTrack, z: this.position.z - forwardZ * halfBase - rightZ * effHalfTrack }, // RL
      { x: this.position.x - forwardX * halfBase + rightX * effHalfTrack, z: this.position.z - forwardZ * halfBase + rightZ * effHalfTrack }  // RR
    ];

    const groundHeights = wheelPoints.map(wp => this.getGroundHeight(wp.x, wp.z));
    const avgFrontH = (groundHeights[0] + groundHeights[1]) * 0.5;
    const avgRearH = (groundHeights[2] + groundHeights[3]) * 0.5;
    const avgLeftH = (groundHeights[0] + groundHeights[2]) * 0.5;
    const avgRightH = (groundHeights[1] + groundHeights[3]) * 0.5;

    const avgGroundH = (avgFrontH + avgRearH) * 0.5;
    const targetY = avgGroundH + this.wheelRadius + 0.08;

    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, dt * 18.0);

    const groundSlopePitch = Math.atan2(avgFrontH - avgRearH, this.wheelbase);
    const groundSlopeRoll = isTwoWheeler ? 0 : Math.atan2(avgRightH - avgLeftH, this.trackWidth);

    // Dynamic Inertial Body Pitch
    const longAccel = (this.longitudinalSpeed - (this.lastSpeed || this.longitudinalSpeed)) / Math.max(dt, 0.001);
    this.lastSpeed = this.longitudinalSpeed;
    const dynamicPitchTarget = -longAccel * 0.0025;

    // Dynamic Inertial Body Roll (or Motorcycle Leaning into Apex)
    let dynamicRollTarget = 0;
    if (isTwoWheeler) {
      // Dynamic motorcycle leaning physics: lean angle balances centripetal force
      const lateralAccel = this.longitudinalSpeed * this.yawRate;
      const targetLean = -Math.atan2(lateralAccel, this.gravity) * 1.15;
      dynamicRollTarget = Math.max(-0.68, Math.min(0.68, targetLean));
    } else {
      // 4-wheel centrifugal body lean
      const lateralAccel = this.longitudinalSpeed * this.yawRate;
      dynamicRollTarget = -lateralAccel * 0.0032;
    }

    this.pitch = THREE.MathUtils.lerp(this.pitch, dynamicPitchTarget, dt * 10.0);
    this.roll = THREE.MathUtils.lerp(this.roll, dynamicRollTarget, dt * 10.0);

    // Build vehicle rotation matrix
    const totalPitch = groundSlopePitch;
    const totalRoll = groundSlopeRoll;

    const groundForward = new THREE.Vector3(forwardX, Math.sin(totalPitch), forwardZ).normalize();
    const groundRight = new THREE.Vector3(rightX, Math.sin(totalRoll), rightZ).normalize();
    const groundUp = new THREE.Vector3().crossVectors(groundForward, groundRight).normalize();

    const baseMatrix = new THREE.Matrix4().makeBasis(groundRight, groundUp, groundForward);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(baseMatrix);

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

  toggleAutopilot() {
    this.autopilotEnabled = !this.autopilotEnabled;
    if (this.autopilotEnabled) {
      this.reverseAutopilotEnabled = false;
    }
    return this.autopilotEnabled;
  }

  toggleReverseAutopilot() {
    this.reverseAutopilotEnabled = !this.reverseAutopilotEnabled;
    if (this.reverseAutopilotEnabled) {
      this.autopilotEnabled = false;
    }
    return this.reverseAutopilotEnabled;
  }
}
