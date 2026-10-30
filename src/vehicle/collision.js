import * as THREE from 'three';

/**
 * Robust Real-Time Collision System
 * Features:
 * - Multi-sphere continuous collision detection for arbitrary vehicle sizes
 * - Scenery collision: Solid tree trunks, large boulders, and rock outcroppings
 * - Guardrail & roadside barrier physical collision on mountain/curved roads
 * - Penetration push-out: Zero obstacle penetration, vehicles never get stuck
 * - Direction-aware impulse response in both Forward and Reverse
 * - Autopilot obstacle detection queries for both forward path and reverse path
 */
export class CollisionSystem {
  constructor(roadManager, sceneryManager) {
    this.roadManager = roadManager;
    this.sceneryManager = sceneryManager;
    this.lastCollisionTime = 0;
  }

  /**
   * Resolves vehicle collisions against scenery obstacles and road barriers
   * @param {Object} vehicle - VehiclePhysics instance
   * @param {number} dt - delta time
   * @returns {boolean} true if collision occurred
   */
  resolveVehicleCollisions(vehicle, dt) {
    const halfBase = vehicle.wheelbase * 0.5;
    const halfWidth = vehicle.trackWidth * 0.5;
    const forwardX = Math.sin(vehicle.heading);
    const forwardZ = Math.cos(vehicle.heading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    // Multi-sphere vehicle collision capsule (Front, Center, Rear)
    const sphereRadius = Math.max(0.65, halfWidth * 0.95);
    const spheres = [
      { x: vehicle.position.x + forwardX * (halfBase + 0.35), z: vehicle.position.z + forwardZ * (halfBase + 0.35), isFront: true },
      { x: vehicle.position.x, z: vehicle.position.z, isCenter: true },
      { x: vehicle.position.x - forwardX * (halfBase + 0.35), z: vehicle.position.z - forwardZ * (halfBase + 0.35), isRear: true }
    ];

    let collided = false;

    // 1. Guardrail & Road Barrier Collision (on curved/banked segments)
    const roadInfo = this.roadManager.getClosestRoadPoint(vehicle.position.x, vehicle.position.z);
    if (roadInfo && Math.abs(roadInfo.banking) > 0.035) {
      const railLimit = this.roadManager.totalHalfWidth + 0.15;
      if (roadInfo.distanceToCenter > railLimit) {
        // Vehicle struck the guardrail!
        const lateralDist = roadInfo.distanceToCenter;
        const penetration = lateralDist - railLimit;

        // Normal points from guardrail back towards road centerline
        const toRoadX = (roadInfo.point.x - vehicle.position.x) / (lateralDist || 1);
        const toRoadZ = (roadInfo.point.z - vehicle.position.z) / (lateralDist || 1);

        // Push vehicle back onto road
        vehicle.position.x += toRoadX * (penetration + 0.08);
        vehicle.position.z += toRoadZ * (penetration + 0.08);

        let collisionInfo = null;

        // Rebound lateral velocity
        const vDotN = vehicle.velocity.x * toRoadX + vehicle.velocity.z * toRoadZ;
        if (vDotN < 0) {
          const restitution = 0.25;
          vehicle.velocity.x -= (1 + restitution) * vDotN * toRoadX;
          vehicle.velocity.z -= (1 + restitution) * vDotN * toRoadZ;
          vehicle.lateralSpeed *= -0.3;
          vehicle.longitudinalSpeed *= 0.82; // Friction drag against metal guardrail

          collisionInfo = {
            type: 'guardrail',
            impactSpeedMs: Math.abs(vehicle.speed || vehicle.longitudinalSpeed),
            contactPos: new THREE.Vector3(vehicle.position.x, vehicle.position.y + 0.35, vehicle.position.z)
          };
          collided = collisionInfo;
        }
      }
    }

    // 2. Scenery Obstacles: Trees, Boulders & Rocks
    if (this.sceneryManager && this.sceneryManager.terrainManager) {
      const chunkSize = this.sceneryManager.terrainManager.chunkSize;
      const currentChunkX = Math.floor(vehicle.position.x / chunkSize);
      const currentChunkZ = Math.floor(vehicle.position.z / chunkSize);

      // Check current chunk and 8 immediate neighboring chunks
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const key = `${cx},${cz}`;
          const items = this.sceneryManager.chunkItems.get(key);
          if (!items) continue;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // Only solid objects have collisions (trees & rocks)
            if (item.type === 'bush') continue;

            const isRock = item.type === 'rock';
            const obstacleRadius = isRock ? (1.1 * item.scale) : (0.52 * item.scale);
            const combinedRadius = sphereRadius + obstacleRadius;
            const combinedRadiusSq = combinedRadius * combinedRadius;

            // Check against each vehicle sphere
            for (const sp of spheres) {
              const diffX = sp.x - item.x;
              const diffZ = sp.z - item.z;
              const distSq = diffX * diffX + diffZ * diffZ;

              if (distSq < combinedRadiusSq) {
                const dist = Math.sqrt(distSq) || 0.001;
                const penetration = combinedRadius - dist;
                const normX = diffX / dist;
                const normZ = diffZ / dist;

                // Push vehicle away from obstacle immediately (no penetration!)
                vehicle.position.x += normX * (penetration + 0.04);
                vehicle.position.z += normZ * (penetration + 0.04);

                // Project vehicle velocity onto collision normal
                const vx = forwardX * vehicle.longitudinalSpeed + rightX * vehicle.lateralSpeed;
                const vz = forwardZ * vehicle.longitudinalSpeed + rightZ * vehicle.lateralSpeed;
                const velAlongNormal = vx * normX + vz * normZ;

                // Only bounce if vehicle is moving towards the obstacle
                if (velAlongNormal < 0) {
                  const restitution = isRock ? 0.28 : 0.18; // Boulders are slightly bouncier
                  const impulseX = -(1 + restitution) * velAlongNormal * normX;
                  const impulseZ = -(1 + restitution) * velAlongNormal * normZ;

                  // Update world velocity
                  const newVx = (vx + impulseX) * 0.65;
                  const newVz = (vz + impulseZ) * 0.65;

                  // Project back into vehicle longitudinal and lateral frame
                  vehicle.longitudinalSpeed = newVx * forwardX + newVz * forwardZ;
                  vehicle.lateralSpeed = newVx * rightX + newVz * rightZ;

                  // Angular yaw deflection: hitting obstacle on front/rear pivots the car away
                  if (sp.isFront) {
                    const cross = forwardX * normZ - forwardZ * normX;
                    vehicle.yawRate += cross * 2.8;
                  } else if (sp.isRear) {
                    const cross = forwardX * normZ - forwardZ * normX;
                    vehicle.yawRate -= cross * 2.8;
                  }

                  // Suspension impact jolt
                  vehicle.pitch += (sp.isFront ? -0.06 : 0.06);

                  collided = {
                    type: isRock ? 'Boulder' : 'Tree',
                    impactSpeedMs: Math.abs(vehicle.speed || vehicle.longitudinalSpeed),
                    contactPos: new THREE.Vector3(item.x, vehicle.position.y + 0.4, item.z)
                  };
                }
              }
            }
          }
        }
      }
    }

    if (collided) {
      this.lastCollisionTime = performance.now();
      vehicle.lastCollision = collided;
    } else {
      vehicle.lastCollision = null;
    }
    return collided;
  }

  /**
   * Forward obstacle lookahead query used by Autopilot to brake or avoid objects
   */
  checkObstacleAhead(carPos, carHeading, lookDist = 32.0, scanWidth = 3.8) {
    if (!this.sceneryManager || !this.sceneryManager.terrainManager) return null;
    const forwardX = Math.sin(carHeading);
    const forwardZ = Math.cos(carHeading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    const chunkSize = this.sceneryManager.terrainManager.chunkSize;
    const cx = Math.floor(carPos.x / chunkSize);
    const cz = Math.floor(carPos.z / chunkSize);

    let closestObstacle = null;
    let closestDist = lookDist;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const items = this.sceneryManager.chunkItems.get(key);
        if (!items) continue;

        for (const item of items) {
          if (item.type === 'bush') continue;
          const toObsX = item.x - carPos.x;
          const toObsZ = item.z - carPos.z;

          // Longitudinal distance along vehicle forward axis
          const longDist = toObsX * forwardX + toObsZ * forwardZ;
          if (longDist > 2.0 && longDist < closestDist) {
            // Lateral offset from centerline
            const latDist = Math.abs(toObsX * rightX + toObsZ * rightZ);
            if (latDist < scanWidth) {
              closestDist = longDist;
              closestObstacle = {
                distance: longDist,
                lateralOffset: toObsX * rightX + toObsZ * rightZ,
                x: item.x,
                z: item.z,
                type: item.type
              };
            }
          }
        }
      }
    }

    return closestObstacle;
  }

  /**
   * Reverse obstacle query used by Reverse Autopilot
   */
  checkObstacleBehind(carPos, carHeading, lookDist = 18.0, scanWidth = 3.5) {
    if (!this.sceneryManager || !this.sceneryManager.terrainManager) return null;
    const forwardX = Math.sin(carHeading);
    const forwardZ = Math.cos(carHeading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    const chunkSize = this.sceneryManager.terrainManager.chunkSize;
    const cx = Math.floor(carPos.x / chunkSize);
    const cz = Math.floor(carPos.z / chunkSize);

    let closestObstacle = null;
    let closestDist = lookDist;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const items = this.sceneryManager.chunkItems.get(key);
        if (!items) continue;

        for (const item of items) {
          if (item.type === 'bush') continue;
          const toObsX = item.x - carPos.x;
          const toObsZ = item.z - carPos.z;

          // Distance behind vehicle (negative forward projection)
          const rearDist = -(toObsX * forwardX + toObsZ * forwardZ);
          if (rearDist > 1.5 && rearDist < closestDist) {
            const latDist = Math.abs(toObsX * rightX + toObsZ * rightZ);
            if (latDist < scanWidth) {
              closestDist = rearDist;
              closestObstacle = {
                distance: rearDist,
                lateralOffset: toObsX * rightX + toObsZ * rightZ,
                x: item.x,
                z: item.z,
                type: item.type
              };
            }
          }
        }
      }
    }

    return closestObstacle;
  }
}
