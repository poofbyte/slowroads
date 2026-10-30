import * as THREE from 'three';
import { SimplexNoise } from '../math/noise.js';

/**
 * Grand Procedural Endless Terrain System
 * Features:
 * - Multi-scale mountain ridges and rolling valley topography
 * - Realistic highway cut-and-fill corridor blending
 * - Slope-based rock cliff generation
 * - Elevation-based highland coloring
 * - Seamless chunk streaming and memory geometry pooling
 */
export class TerrainManager {
  constructor(scene, roadManager, options = {}) {
    this.scene = scene;
    this.roadManager = roadManager;
    this.seed = options.seed || 108;

    this.macroNoise = new SimplexNoise(this.seed + 101);
    this.hillNoise = new SimplexNoise(this.seed + 202);
    this.ridgeNoise = new SimplexNoise(this.seed + 303);
    this.detailNoise = new SimplexNoise(this.seed + 404);

    // Chunk grid configuration
    this.chunkSize = 100; // 100m x 100m per chunk
    this.segments = 24; // 24x24 quads (efficient for Intel UHD 620)
    this.viewDistance = 3; // 7x7 chunks around player

    // Road corridor parameters
    this.roadHalfWidth = this.roadManager.totalHalfWidth; // ~6.2m
    this.blendDistance = 32.0; // Distance where road embankment blends into terrain

    this.chunks = new Map();
    this.geoPool = [];

    // Seasonal color palette
    this.seasonColors = {
      grass: new THREE.Color(0x93783a),
      grassDry: new THREE.Color(0xb59848),
      rock: new THREE.Color(0x6e6357),
      dirt: new THREE.Color(0x856b49)
    };

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
      side: THREE.DoubleSide
    });
  }

  setSeasonColors(seasonData) {
    if (seasonData.grass) this.seasonColors.grass.set(seasonData.grass);
    if (seasonData.grassDry) this.seasonColors.grassDry.set(seasonData.grassDry);
    if (seasonData.rock) this.seasonColors.rock.set(seasonData.rock);
    if (seasonData.dirt) this.seasonColors.dirt.set(seasonData.dirt);

    for (const chunk of this.chunks.values()) {
      this.colorizeChunk(chunk);
    }
  }

  /**
   * Multi-scale natural terrain elevation (mountains, ridges, rolling hills, meadows)
   */
  getRawHeight(x, z) {
    // 1. Distant sweeping mountain ridges (wavelength ~1200m)
    const macro = this.macroNoise.fbm2D(x * 0.0008, z * 0.0008, 3, 0.5, 2.0);

    // 2. Rolling hills and valleys (wavelength ~350m)
    const hills = this.hillNoise.fbm2D(x * 0.0028, z * 0.0028, 3, 0.5, 2.0);

    // 3. Ridged noise for sharp rocky crests and ridges
    const rVal = Math.abs(this.ridgeNoise.noise2D(x * 0.0016, z * 0.0016));
    const ridges = Math.pow(1.0 - rVal, 2.0);

    // 4. Subtle micro mounds
    const detail = this.detailNoise.noise2D(x * 0.008, z * 0.008) * 2.2;

    return 6.0 + (macro * 45.0) + (hills * 18.0) + (ridges * 24.0) + detail;
  }

  /**
   * Calculates blended terrain height with seamless highway cut & fill
   */
  getHeightAt(x, z) {
    const rawH = this.getRawHeight(x, z);
    const roadInfo = this.roadManager.getClosestRoadPoint(x, z);
    const d = roadInfo.distanceToCenter;

    // Roadbed surface
    if (d <= this.roadHalfWidth) {
      return roadInfo.height - 0.07;
    }

    // Corridor cut/fill embankment transition zone
    if (d < this.blendDistance) {
      const u = (d - this.roadHalfWidth) / (this.blendDistance - this.roadHalfWidth);
      // Quintic smoothstep for ultra-smooth slope blending
      const t = u * u * u * (u * (u * 6 - 15) + 10);
      const roadH = roadInfo.height - 0.07;
      return roadH * (1.0 - t) + rawH * t;
    }

    return rawH;
  }

  update(carPosition) {
    const currentChunkX = Math.floor(carPosition.x / this.chunkSize);
    const currentChunkZ = Math.floor(carPosition.z / this.chunkSize);

    const neededKeys = new Set();
    const r = this.viewDistance;

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz <= (r + 0.5) * (r + 0.5)) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const key = `${cx},${cz}`;
          neededKeys.add(key);

          if (!this.chunks.has(key)) {
            this.createChunk(cx, cz);
          }
        }
      }
    }

    // Cull distant chunks
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.mesh);
        this.geoPool.push(chunk.mesh.geometry);
        this.chunks.delete(key);
      }
    }
  }

  acquireGeometry() {
    if (this.geoPool.length > 0) {
      return this.geoPool.pop();
    }
    return new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      this.segments,
      this.segments
    );
  }

  createChunk(cx, cz) {
    const geo = this.acquireGeometry();
    const posAttr = geo.attributes.position;

    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;
    const segs = this.segments;

    let idx = 0;
    for (let iz = 0; iz <= segs; iz++) {
      const zFrac = iz / segs - 0.5;
      const worldZ = originZ + zFrac * this.chunkSize;

      for (let ix = 0; ix <= segs; ix++) {
        const xFrac = ix / segs - 0.5;
        const worldX = originX + xFrac * this.chunkSize;

        const h = this.getHeightAt(worldX, worldZ);
        posAttr.setXYZ(idx, worldX, h, worldZ);
        idx++;
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    const chunk = {
      cx,
      cz,
      key: `${cx},${cz}`,
      originX,
      originZ,
      geometry: geo,
      mesh: null
    };

    this.colorizeChunk(chunk);

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    chunk.mesh = mesh;
    this.chunks.set(chunk.key, chunk);

    return chunk;
  }

  colorizeChunk(chunk) {
    const geo = chunk.geometry;
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const count = posAttr.count;

    let colAttr = geo.attributes.color;
    if (!colAttr || colAttr.count !== count) {
      colAttr = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
      geo.setAttribute('color', colAttr);
    }

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const wx = posAttr.getX(i);
      const wy = posAttr.getY(i);
      const wz = posAttr.getZ(i);

      const ny = normAttr.getY(i);
      const slope = 1.0 - ny; // 0 = flat horizontal, 1 = vertical cliff

      const roadInfo = this.roadManager.getClosestRoadPoint(wx, wz);
      const roadDist = roadInfo.distanceToCenter;

      if (roadDist < this.roadHalfWidth + 3.2) {
        // Dirt / gravel road edge
        tempColor.copy(this.seasonColors.dirt);
      } else if (slope > 0.32) {
        // Steep rock face
        tempColor.copy(this.seasonColors.rock);
        tempColor.offsetHSL(0, 0, Math.sin(wx * 0.08 + wz * 0.08) * 0.05);
      } else {
        // Rolling grass with multi-frequency meadow patches
        const patch = (Math.sin(wx * 0.025) * Math.cos(wz * 0.025) + 1.0) * 0.5;
        tempColor.lerpColors(this.seasonColors.grass, this.seasonColors.grassDry, patch);

        // Subtle highland glow on tall peaks
        if (wy > 32) {
          tempColor.offsetHSL(0, -0.04, Math.min(0.14, (wy - 32) * 0.006));
        }
      }

      colAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    colAttr.needsUpdate = true;
  }
}
