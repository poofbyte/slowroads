import * as THREE from 'three';

/**
 * 3D Impact Sparks, Smoke Debris & Persistent Tire Skidmarks Manager
 * High-performance, lightweight particle and instanced mesh pool
 * Optimized for 60 FPS on Intel UHD Graphics 620
 */
export class ImpactAndSkidFXManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared geometry for sparks (small glowing cubes) and smoke (soft spheres)
    this.sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    this.smokeGeo = new THREE.DodecahedronGeometry(0.28, 0);

    // Persistent 3D Tire Skidmark Decal Ribbon Pool
    this.maxSkids = 300;
    this.skidIndex = 0;
    const skidPlane = new THREE.PlaneGeometry(0.32, 1.2);
    skidPlane.rotateX(-Math.PI / 2);

    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x111318,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });

    this.skidInst = new THREE.InstancedMesh(skidPlane, skidMat, this.maxSkids);
    this.skidDummy = new THREE.Object3D();
    this.skidDummy.position.set(0, -999, 0);
    this.skidDummy.updateMatrix();

    for (let i = 0; i < this.maxSkids; i++) {
      this.skidInst.setMatrixAt(i, this.skidDummy.matrix);
    }
    this.skidInst.instanceMatrix.needsUpdate = true;
    this.scene.add(this.skidInst);
  }

  /**
   * Spawns a burst of glowing metallic sparks and smoke at the impact point
   */
  spawnCollisionImpact(worldPos, impactSpeedMs) {
    const count = Math.min(32, Math.max(10, Math.floor(impactSpeedMs * 1.2)));

    for (let i = 0; i < count; i++) {
      const isSmoke = (i % 3 === 0);
      const mat = new THREE.MeshBasicMaterial({
        color: isSmoke ? 0x94a3b8 : (Math.random() < 0.5 ? 0xfbbf24 : 0xf97316),
        transparent: true,
        opacity: isSmoke ? 0.6 : 0.95
      });

      const mesh = new THREE.Mesh(isSmoke ? this.smokeGeo : this.sparkGeo, mat);
      mesh.position.copy(worldPos);
      mesh.position.y += 0.3 + Math.random() * 0.4;

      const angle = Math.random() * Math.PI * 2;
      const spd = (isSmoke ? 2.0 : 5.5) + Math.random() * Math.min(14, impactSpeedMs * 0.5);
      const vel = new THREE.Vector3(
        Math.cos(angle) * spd,
        (isSmoke ? 2.0 : 4.0) + Math.random() * 5.0,
        Math.sin(angle) * spd
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel,
        isSmoke,
        life: isSmoke ? 0.7 : 0.42,
        maxLife: isSmoke ? 0.7 : 0.42
      });
    }
  }

  /**
   * Stamps a tire skidmark decal and optional smoke puff at wheel world position
   */
  spawnTireSmokeAndSkid(wheelWorldPos, heading, isOffRoad = false) {
    // Stamp decal on road surface
    this.skidDummy.position.set(wheelWorldPos.x, wheelWorldPos.y + 0.04, wheelWorldPos.z);
    this.skidDummy.rotation.set(0, -heading, 0);
    this.skidDummy.updateMatrix();

    this.skidInst.setMatrixAt(this.skidIndex, this.skidDummy.matrix);
    this.skidInst.instanceMatrix.needsUpdate = true;
    this.skidIndex = (this.skidIndex + 1) % this.maxSkids;

    // Subtle smoke or dust puff
    if (Math.random() < 0.35) {
      const mat = new THREE.MeshBasicMaterial({
        color: isOffRoad ? 0xa89070 : 0xcbd5e1,
        transparent: true,
        opacity: 0.3
      });

      const mesh = new THREE.Mesh(this.smokeGeo, mat);
      mesh.position.copy(wheelWorldPos);
      mesh.position.y += 0.15;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.9 + Math.random(), (Math.random() - 0.5) * 1.2),
        isSmoke: true,
        life: 0.38,
        maxLife: 0.38
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, dt);

      if (p.isSmoke) {
        const s = 1.0 + (1.0 - p.life / p.maxLife) * 1.8;
        p.mesh.scale.set(s, s, s);
      } else {
        p.vel.y -= 16.0 * dt; // Gravity
        p.mesh.rotation.x += 10.0 * dt;
        p.mesh.rotation.y += 10.0 * dt;
      }

      p.mesh.material.opacity = (p.life / p.maxLife) * (p.isSmoke ? 0.45 : 0.9);
    }
  }

  dispose() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.particles = [];

    if (this.skidInst) {
      this.scene.remove(this.skidInst);
      this.skidInst.geometry.dispose();
      this.skidInst.material.dispose();
    }
    this.sparkGeo.dispose();
    this.smokeGeo.dispose();
  }
}
