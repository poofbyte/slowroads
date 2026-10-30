import * as THREE from 'three';
import { PRNG, SimplexNoise } from '../math/noise.js';

/**
 * Organic Clustered Scenery & Vegetation System
 * Features:
 * - Natural clustered forest groves and rock outcroppings via density noise
 * - Clean low-poly tree and boulder models optimized for Intel UHD Graphics
 * - Zero CPU overhead: rendered in 5 single draw calls via THREE.InstancedMesh
 * - Strict highway corridor exclusion (never spawns on the road)
 * - Dynamic seasonal foliage color updating
 */
export class SceneryManager {
  constructor(scene, roadManager, terrainManager, options = {}) {
    this.scene = scene;
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;
    this.seed = options.seed || 108;

    this.forestNoise = new SimplexNoise(this.seed + 777);
    this.rockNoise = new SimplexNoise(this.seed + 999);

    // Max instances per species
    this.maxPines = 2200;
    this.maxDeciduous = 2200;
    this.maxBirch = 1600;
    this.maxRocks = 1400;
    this.maxBushes = 1800;

    this.initMaterials();
    this.initGeometries();
    this.initInstancedMeshes();

    this.chunkItems = new Map();
    this.lastChunkCoord = { cx: null, cz: null };
  }

  initMaterials() {
    this.materials = {
      pineFoliage: new THREE.MeshStandardMaterial({
        color: 0x243e26,
        roughness: 0.9,
        flatShading: true
      }),
      pineTrunk: new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.95,
        flatShading: true
      }),
      deciduousFoliage: new THREE.MeshStandardMaterial({
        color: 0xd97c27, // Autumn gold/orange default
        roughness: 0.9,
        flatShading: true
      }),
      deciduousTrunk: new THREE.MeshStandardMaterial({
        color: 0x4a3423,
        roughness: 0.95,
        flatShading: true
      }),
      birchFoliage: new THREE.MeshStandardMaterial({
        color: 0xebb134, // Golden yellow
        roughness: 0.88,
        flatShading: true
      }),
      birchTrunk: new THREE.MeshStandardMaterial({
        color: 0xdcd8cb, // White birch bark
        roughness: 0.85,
        flatShading: true
      }),
      rock: new THREE.MeshStandardMaterial({
        color: 0x6b6255,
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true
      }),
      bush: new THREE.MeshStandardMaterial({
        color: 0xb56926,
        roughness: 0.95,
        flatShading: true
      })
    };
  }

  initGeometries() {
    this.geometries = {
      pine: this.buildPineGeometry(),
      deciduous: this.buildDeciduousGeometry(),
      birch: this.buildBirchGeometry(),
      rock: this.buildRockGeometry(),
      bush: this.buildBushGeometry()
    };
  }

  buildPineGeometry() {
    const geos = [];
    // Trunk
    const trunk = new THREE.CylinderGeometry(0.18, 0.32, 1.9, 5);
    trunk.translate(0, 0.95, 0);
    geos.push(trunk);

    // 4 Layered Cones
    const layers = [
      { r: 2.0, h: 2.4, y: 2.2 },
      { r: 1.6, h: 2.2, y: 3.5 },
      { r: 1.2, h: 1.9, y: 4.7 },
      { r: 0.7, h: 1.6, y: 5.7 }
    ];

    for (const l of layers) {
      const cone = new THREE.ConeGeometry(l.r, l.h, 6);
      cone.translate(0, l.y, 0);
      geos.push(cone);
    }

    return this.mergeGeometries(geos);
  }

  buildDeciduousGeometry() {
    const geos = [];
    const trunk = new THREE.CylinderGeometry(0.24, 0.42, 2.4, 5);
    trunk.translate(0, 1.2, 0);
    geos.push(trunk);

    // Clustered crown (3 intersecting low-poly spheres)
    const c1 = new THREE.IcosahedronGeometry(1.85, 0);
    c1.translate(0, 3.4, 0);
    geos.push(c1);

    const c2 = new THREE.IcosahedronGeometry(1.35, 0);
    c2.translate(0.65, 4.2, 0.4);
    geos.push(c2);

    const c3 = new THREE.IcosahedronGeometry(1.25, 0);
    c3.translate(-0.6, 3.9, -0.35);
    geos.push(c3);

    return this.mergeGeometries(geos);
  }

  buildBirchGeometry() {
    const geos = [];
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 2.8, 5);
    trunk.translate(0, 1.4, 0);
    geos.push(trunk);

    const crown = new THREE.IcosahedronGeometry(1.65, 0);
    crown.scale(1.0, 1.4, 1.0);
    crown.translate(0, 3.8, 0);
    geos.push(crown);

    return this.mergeGeometries(geos);
  }

  buildRockGeometry() {
    const geo = new THREE.DodecahedronGeometry(1.5, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const factor = 1.0 + Math.sin(x * 3.5 + y * 4.2) * 0.22;
      pos.setXYZ(i, x * factor, y * 0.72 * factor, z * factor);
    }
    geo.computeVertexNormals();
    return geo;
  }

  buildBushGeometry() {
    return new THREE.IcosahedronGeometry(0.95, 0);
  }

  mergeGeometries(geos) {
    let totalVerts = 0;
    let totalIndices = 0;

    for (const g of geos) {
      totalVerts += g.attributes.position.count;
      totalIndices += g.index ? g.index.count : g.attributes.position.count;
    }

    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedIndices = [];

    let vOffset = 0;

    for (const g of geos) {
      const p = g.attributes.position;
      const n = g.attributes.normal;
      const count = p.count;

      for (let i = 0; i < count; i++) {
        mergedPos[(vOffset + i) * 3] = p.getX(i);
        mergedPos[(vOffset + i) * 3 + 1] = p.getY(i);
        mergedPos[(vOffset + i) * 3 + 2] = p.getZ(i);

        if (n) {
          mergedNorm[(vOffset + i) * 3] = n.getX(i);
          mergedNorm[(vOffset + i) * 3 + 1] = n.getY(i);
          mergedNorm[(vOffset + i) * 3 + 2] = n.getZ(i);
        }
      }

      if (g.index) {
        for (let j = 0; j < g.index.count; j++) {
          mergedIndices.push(vOffset + g.index.getX(j));
        }
      } else {
        for (let j = 0; j < count; j++) {
          mergedIndices.push(vOffset + j);
        }
      }

      vOffset += count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    merged.setIndex(mergedIndices);
    merged.computeVertexNormals();
    return merged;
  }

  initInstancedMeshes() {
    this.instancedMeshes = {
      pine: new THREE.InstancedMesh(this.geometries.pine, this.materials.pineFoliage, this.maxPines),
      deciduous: new THREE.InstancedMesh(this.geometries.deciduous, this.materials.deciduousFoliage, this.maxDeciduous),
      birch: new THREE.InstancedMesh(this.geometries.birch, this.materials.birchFoliage, this.maxBirch),
      rock: new THREE.InstancedMesh(this.geometries.rock, this.materials.rock, this.maxRocks),
      bush: new THREE.InstancedMesh(this.geometries.bush, this.materials.bush, this.maxBushes)
    };

    for (const mesh of Object.values(this.instancedMeshes)) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }
  }

  setSeasonColors(seasonData) {
    if (seasonData.pineColor) this.materials.pineFoliage.color.set(seasonData.pineColor);
    if (seasonData.deciduousColor) this.materials.deciduousFoliage.color.set(seasonData.deciduousColor);
    if (seasonData.birchColor) this.materials.birchFoliage.color.set(seasonData.birchColor);
    if (seasonData.bushColor) this.materials.bush.color.set(seasonData.bushColor);
    if (seasonData.rockColor) this.materials.rock.color.set(seasonData.rockColor);
  }

  getChunkItems(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunkItems.has(key)) {
      return this.chunkItems.get(key);
    }

    const items = [];
    const chunkSeed = Math.abs((cx * 73856093) ^ (cz * 19349663) ^ this.seed);
    const prng = new PRNG(chunkSeed);

    const chunkSize = this.terrainManager.chunkSize;
    const originX = cx * chunkSize;
    const originZ = cz * chunkSize;

    // Organic forest density sampling via Perlin noise
    const forestDensity = (this.forestNoise.noise2D(originX * 0.003, originZ * 0.003) + 1.0) * 0.5;
    const rockDensity = (this.rockNoise.noise2D(originX * 0.004, originZ * 0.004) + 1.0) * 0.5;

    // 25 to 55 items per chunk depending on natural grove density
    const baseCount = Math.round(20 + forestDensity * 32);

    for (let i = 0; i < baseCount; i++) {
      const rx = prng.range(-chunkSize * 0.48, chunkSize * 0.48);
      const rz = prng.range(-chunkSize * 0.48, chunkSize * 0.48);
      const wx = originX + rx;
      const wz = originZ + rz;

      const roadInfo = this.roadManager.getClosestRoadPoint(wx, wz);
      // Strictly avoid road corridor
      if (roadInfo.distanceToCenter < this.roadManager.totalHalfWidth + 4.8) {
        continue;
      }

      const wy = this.terrainManager.getHeightAt(wx, wz);

      const roll = prng.next();
      let type;
      let scale = prng.range(0.85, 1.4);

      if (rockDensity > 0.65 && roll < 0.35) {
        type = 'rock';
        scale = prng.range(0.8, 1.7);
      } else if (roll < 0.36) {
        type = 'pine';
      } else if (roll < 0.68) {
        type = 'deciduous';
      } else if (roll < 0.84) {
        type = 'birch';
      } else {
        type = 'bush';
        scale = prng.range(0.7, 1.3);
      }

      const rotY = prng.range(0, Math.PI * 2);

      items.push({
        type,
        x: wx,
        y: wy,
        z: wz,
        rotY,
        scale
      });
    }

    this.chunkItems.set(key, items);
    return items;
  }

  update(carPosition) {
    const chunkSize = this.terrainManager.chunkSize;
    const currentChunkX = Math.floor(carPosition.x / chunkSize);
    const currentChunkZ = Math.floor(carPosition.z / chunkSize);

    if (this.lastChunkCoord.cx === currentChunkX && this.lastChunkCoord.cz === currentChunkZ) {
      return;
    }
    this.lastChunkCoord.cx = currentChunkX;
    this.lastChunkCoord.cz = currentChunkZ;

    const radius = this.terrainManager.viewDistance;
    const counts = { pine: 0, deciduous: 0, birch: 0, rock: 0, bush: 0 };
    const maxLimits = {
      pine: this.maxPines,
      deciduous: this.maxDeciduous,
      birch: this.maxBirch,
      rock: this.maxRocks,
      bush: this.maxBushes
    };

    const dummy = new THREE.Object3D();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz <= (radius + 0.5) * (radius + 0.5)) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const items = this.getChunkItems(cx, cz);

          for (const item of items) {
            const currentCount = counts[item.type];
            if (currentCount < maxLimits[item.type]) {
              dummy.position.set(item.x, item.y, item.z);
              dummy.rotation.set(0, item.rotY, 0);
              dummy.scale.set(item.scale, item.scale, item.scale);
              dummy.updateMatrix();

              this.instancedMeshes[item.type].setMatrixAt(currentCount, dummy.matrix);
              counts[item.type]++;
            }
          }
        }
      }
    }

    for (const [type, mesh] of Object.entries(this.instancedMeshes)) {
      mesh.count = counts[type];
      mesh.instanceMatrix.needsUpdate = true;
    }

    if (this.chunkItems.size > 140) {
      for (const key of this.chunkItems.keys()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - currentChunkX) > radius + 2 || Math.abs(cz - currentChunkZ) > radius + 2) {
          this.chunkItems.delete(key);
        }
      }
    }
  }
}
