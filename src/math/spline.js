import * as THREE from 'three';

/**
 * Spline node representing a sample point along the road spine.
 */
export class SplineNode {
  constructor(position, tangent, normal, binormal, distance = 0, banking = 0) {
    this.position = position.clone();
    this.tangent = tangent.clone().normalize();
    this.normal = normal.clone().normalize();
    this.binormal = binormal.clone().normalize();
    this.distance = distance;
    this.banking = banking;
  }
}

/**
 * Catmull-Rom interpolation for 3D vectors
 */
export function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const v0 = (p2.x - p0.x) * 0.5;
  const v1 = (p3.x - p1.x) * 0.5;
  const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 +
            (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 +
            v0 * t + p1.x;

  const vy0 = (p2.y - p0.y) * 0.5;
  const vy1 = (p3.y - p1.y) * 0.5;
  const y = (2 * p1.y - 2 * p2.y + vy0 + vy1) * t3 +
            (-3 * p1.y + 3 * p2.y - 2 * vy0 - vy1) * t2 +
            vy0 * t + p1.y;

  const vz0 = (p2.z - p0.z) * 0.5;
  const vz1 = (p3.z - p1.z) * 0.5;
  const z = (2 * p1.z - 2 * p2.z + vz0 + vz1) * t3 +
            (-3 * p1.z + 3 * p2.z - 2 * vz0 - vz1) * t2 +
            vz0 * t + p1.z;

  return new THREE.Vector3(x, y, z);
}

/**
 * Catmull-Rom tangent derivative
 */
export function catmullRomTangent(p0, p1, p2, p3, t) {
  const t2 = t * t;

  const v0 = (p2.x - p0.x) * 0.5;
  const v1 = (p3.x - p1.x) * 0.5;
  const dx = 3 * (2 * p1.x - 2 * p2.x + v0 + v1) * t2 +
             2 * (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t +
             v0;

  const vy0 = (p2.y - p0.y) * 0.5;
  const vy1 = (p3.y - p1.y) * 0.5;
  const dy = 3 * (2 * p1.y - 2 * p2.y + vy0 + vy1) * t2 +
             2 * (-3 * p1.y + 3 * p2.y - 2 * vy0 - vy1) * t +
             vy0;

  const vz0 = (p2.z - p0.z) * 0.5;
  const vz1 = (p3.z - p1.z) * 0.5;
  const dz = 3 * (2 * p1.z - 2 * p2.z + vz0 + vz1) * t2 +
             2 * (-3 * p1.z + 3 * p2.z - 2 * vz0 - vz1) * t +
             vz0;

  return new THREE.Vector3(dx, dy, dz).normalize();
}

/**
 * Project a 2D point (x, z) onto a line segment (a, b) in XZ space.
 * Returns { t, distanceSq, closestPoint }
 */
export function projectPointOntoSegmentXZ(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;

  if (lenSq < 1e-8) {
    const dx = px - ax;
    const dz = pz - az;
    return { t: 0, distanceSq: dx * dx + dz * dz, x: ax, z: az };
  }

  let t = ((px - ax) * abx + (pz - az) * abz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + t * abx;
  const cz = az + t * abz;
  const dx = px - cx;
  const dz = pz - cz;

  return {
    t,
    distanceSq: dx * dx + dz * dz,
    x: cx,
    z: cz
  };
}
