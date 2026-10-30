import * as THREE from 'three';
import { PRNG } from '../math/noise.js';

export class SceneryManager {
  constructor(scene, roadManager, terrainManager, options = {}) {
    this.scene = scene;
    this.roadManager = roadManager;
    this.terrainManager = terrainManager;
    this.seed = options.seed || 101;

    // Maximum instances per mesh
    this.maxPines = 1800;
    this.maxDeciduous = 1800;
    this.maxBirch = 1200;
    this.maxRocks = 1200;
    this.maxBushes = 1500;

    // Materials
    this.initMaterials();

    // Geometries
    this.initGeometries();

    // Instanced Meshes
    this.initInstancedMeshes();

    // Cache of chunk items: key `${cx},${cz}` -> array of item transforms
    this.chunkItems = new Map();
    this.lastChunkCoord = { cx: null, cz: null };
  }

  initMaterials() {
    this.materials = {
      pineFoliage: new THREE.MeshStandardMaterial({
        color: 0x224828,
        roughness: 0.9,
        flatShading: true
      }),
      pineTrunk: new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.95,
        flatShading: true
      }),
      deciduousFoliage: new THREE.MeshStandardMaterial({
        color: 0x3b6e2e,
        roughness: 0.9,
        flatShading: true
      }),
      deciduousTrunk: new THREE.MeshStandardMaterial({
        color: 0x4a3423,
        roughness: 0.95,
        flatShading: true
      }),
      birchFoliage: new THREE.MeshStandardMaterial({
        color: 0xd9822b, // Autumn gold/orange
        roughness: 0.9,
        flatShading: true
      }),
      birchTrunk: new THREE.MeshStandardMaterial({
        color: 0xd6d1c4, // Pale birch bark
        roughness: 0.85,
        flatShading: true
      }),
      rock: new THREE.MeshStandardMaterial({
        color: 0x6e6962,
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true
      }),
      bush: new THREE.MeshStandardMaterial({
        color: 0x4d7532,
        roughness: 0.95,
        flatShading: true
      })
    };
  }

  initGeometries() {
    // 1. Pine Tree (merged trunk + 3 cone foliage)
    const pineGeo = this.buildPineGeometry();

    // 2. Deciduous Tree (trunk + clustered low-poly crown)
    const decGeo = this.buildDeciduousGeometry();

    // 3. Birch Tree (slender trunk + golden autumn crown)
    const birchGeo = this.buildBirchGeometry();

    // 4. Low-poly boulder
    const rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
    // Perturb vertices slightly for organic faceted boulder look
    const rPos = rockGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const vx = rPos.getX(i);
      const vy = rPos.getY(i);
      const vz = rPos.getZ(i);
      const scale = 1.0 + (Math.sin(vx * 3 + vy * 5) * 0.18);
      rPos.setXYZ(i, vx * scale, vy * 0.75 * scale, vz * scale);
    }
    rockGeo.computeVertexNormals();

    // 5. Bush (small multi-faceted cluster)
    const bushGeo = new THREE.IcosahedronGeometry(0.8, 0);

    this.geometries = {
      pine: pineGeo,
      deciduous: decGeo,
      birch: birchGeo,
      rock: rockGeo,
      bush: bushGeo
    };
  }

  buildPineGeometry() {
    const geometries = [];

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.8, 5);
    trunkGeo.translate(0, 0.9, 0);
    geometries.push(trunkGeo);

    // Cones (3 layers)
    const cone1 = new THREE.ConeGeometry(1.8, 2.5, 6);
    cone1.translate(0, 2.4, 0);
    geometries.push(cone1);

    const cone2 = new THREE.ConeGeometry(1.4, 2.2, 6);
    cone2.translate(0, 3.6, 0);
    geometries.push(cone2);

    const cone3 = new THREE.ConeGeometry(0.9, 1.8, 6);
    cone3.translate(0, 4.7, 0);
    geometries.push(cone3);

    return this.mergeSimpleGeometries(geometries);
  }

  buildDeciduousGeometry() {
    const geometries = [];

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 2.2, 5);
    trunkGeo.translate(0, 1.1, 0);
    geometries.push(trunkGeo);

    // Crown: faceted icosahedron
    const crownGeo = new THREE.IcosahedronGeometry(2.0, 0);
    crownGeo.translate(0, 3.2, 0);
    geometries.push(crownGeo);

    return this.mergeSimpleGeometries(geometries);
  }

  buildBirchGeometry() {
    const geometries = [];

    // Slender trunk
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 5);
    trunkGeo.translate(0, 1.3, 0);
    geometries.push(trunkGeo);

    // Golden crown
    const crownGeo = new THREE.IcosahedronGeometry(1.7, 0);
    crownGeo.scale(1.0, 1.35, 1.0);
    crownGeo.translate(0, 3.6, 0);
    geometries.push(crownGeo);

    return this.mergeSimpleGeometries(geometries);
  }

  mergeSimpleGeometries(geos) {
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
    let iOffset = 0;

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
      mesh.count = 0; // Start with 0 visible
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }
  }

  /**
   * Updates seasonal foliage materials
   */
  setSeasonColors(seasonData) {
    if (seasonData.pineColor) this.materials.pineFoliage.color.set(seasonData.pineColor);
    if (seasonData.deciduousColor) this.materials.deciduousFoliage.color.set(seasonData.deciduousColor);
    if (seasonData.birchColor) this.materials.birchFoliage.color.set(seasonData.birchColor);
    if (seasonData.bushColor) this.materials.bush.color.set(seasonData.bushColor);
    if (seasonData.rockColor) this.materials.rock.color.set(seasonData.rockColor);
  }

  /**
   * Generates or retrieves scenery items for a chunk
   */
  getChunkItems(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunkItems.has(key)) {
      return this.chunkItems.get(key);
    }

    const items = [];
    // Seeded random for this chunk
    const chunkSeed = Math.abs((cx * 73856093) ^ (cz * 19349663) ^ this.seed);
    const prng = new PRNG(chunkSeed);

    const chunkSize = this.terrainManager.chunkSize;
    const originX = cx * chunkSize;
    const originZ = cz * chunkSize;

    // Density: ~24 items per chunk
    const itemCount = 26;

    for (let i = 0; i < itemCount; i++) {
      const rx = prng.range(-chunkSize * 0.48, chunkSize * 0.48);
      const rz = prng.range(-chunkSize * 0.48, chunkSize * 0.48);
      const wx = originX + rx;
      const wz = originZ + rz;

      // Check distance to road
      const roadInfo = this.roadManager.getClosestRoadPoint(wx, wz);
      // Keep clear of the road corridor
      if (roadInfo.distanceToCenter < this.roadManager.totalHalfWidth + 4.5) {
        continue;
      }

      // Check height & slope
      const wy = this.terrainManager.getHeightAt(wx, wz);

      // Choose type
      const roll = prng.next();
      let type;
      let scale = prng.range(0.8, 1.35);

      if (roll < 0.32) {
        type = 'pine';
      } else if (roll < 0.60) {
        type = 'deciduous';
      } else if (roll < 0.76) {
        type = 'birch';
      } else if (roll < 0.88) {
        type = 'bush';
        scale = prng.range(0.7, 1.4);
      } else {
        type = 'rock';
        scale = prng.range(0.7, 1.6);
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

  /**
   * Updates instanced mesh matrices based on active chunks around the vehicle
   */
  update(carPosition) {
    const chunkSize = this.terrainManager.chunkSize;
    const currentChunkX = Math.floor(carPosition.x / chunkSize);
    const currentChunkZ = Math.floor(carPosition.z / chunkSize);

    // Only recalculate when player moves across chunk boundaries or at start
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

    // Update instance counts and flag matrices for GPU upload
    for (const [type, mesh] of Object.entries(this.instancedMeshes)) {
      mesh.count = counts[type];
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Clean up cached chunks far away
    if (this.chunkItems.size > 150) {
      for (const key of this.chunkItems.keys()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - currentChunkX) > radius + 2 || Math.abs(cz - currentChunkZ) > radius + 2) {
          this.chunkItems.delete(key);
        }
      }
    }
  }
}
