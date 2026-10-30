import * as THREE from 'three';
import { SimplexNoise } from '../math/noise.js';

export class TerrainManager {
  constructor(scene, roadManager, options = {}) {
    this.scene = scene;
    this.roadManager = roadManager;
    this.seed = options.seed || 101;
    this.noise = new SimplexNoise(this.seed + 555);
    this.mountainNoise = new SimplexNoise(this.seed + 888);

    // Chunk configuration
    this.chunkSize = 96; // 96m x 96m per chunk
    this.segments = 24; // 24x24 segments per chunk (576 faces)
    this.viewDistance = 3; // Chunk radius around player (7x7 = 49 chunks)

    // Road corridor blending parameters
    this.roadHalfWidth = this.roadManager.totalHalfWidth; // ~5.7m
    this.blendDistance = 28.0; // Distance where road embankment blends fully into terrain

    // Active chunks: key = `${chunkX},${chunkZ}` -> ChunkData
    this.chunks = new Map();

    // Default season colors
    this.seasonColors = {
      grass: new THREE.Color(0x4a7c38),
      grassDry: new THREE.Color(0x6e8e42),
      rock: new THREE.Color(0x736d65),
      dirt: new THREE.Color(0x827055)
    };

    // Shared chunk material
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide
    });

    // Chunk pool for geometry reuse to prevent memory garbage collection stutter
    this.geoPool = [];
  }

  /**
   * Sets the terrain colors for different seasons (Summer, Autumn, Winter, etc.)
   */
  setSeasonColors(seasonData) {
    if (seasonData.grass) this.seasonColors.grass.set(seasonData.grass);
    if (seasonData.grassDry) this.seasonColors.grassDry.set(seasonData.grassDry);
    if (seasonData.rock) this.seasonColors.rock.set(seasonData.rock);
    if (seasonData.dirt) this.seasonColors.dirt.set(seasonData.dirt);

    // Refresh all chunk vertex colors
    for (const chunk of this.chunks.values()) {
      this.colorizeChunk(chunk);
    }
  }

  /**
   * Calculates raw natural terrain height at (x, z) before road blending
   */
  getRawHeight(x, z) {
    // Large rolling mountains & hills
    const n1 = this.noise.fbm2D(x * 0.0014, z * 0.0014, 4, 0.5, 2.0);
    // Medium hills & mounds
    const n2 = this.noise.noise2D(x * 0.004, z * 0.004) * 0.35;
    // Distant mountain ranges
    const m = Math.max(0, this.mountainNoise.fbm2D(x * 0.0006, z * 0.0006, 3, 0.5, 2.0));

    return 4.0 + (n1 * 34.0) + (n2 * 12.0) + (m * 42.0);
  }

  /**
   * Calculates final blended terrain height at any world (x, z) coordinate,
   * guaranteeing the road sits smoothly in a sculpted corridor cut/fill.
   */
  getHeightAt(x, z) {
    const rawHeight = this.getRawHeight(x, z);
    const roadInfo = this.roadManager.getClosestRoadPoint(x, z);
    const d = roadInfo.distanceToCenter;

    // Inside road ribbon
    if (d <= this.roadHalfWidth) {
      return roadInfo.height - 0.06;
    }

    // Embankment transition zone
    if (d < this.blendDistance) {
      const u = (d - this.roadHalfWidth) / (this.blendDistance - this.roadHalfWidth);
      // Smooth Hermite blend
      const t = u * u * (3.0 - 2.0 * u);
      const roadTargetH = roadInfo.height - 0.06;
      return roadTargetH * (1.0 - t) + rawHeight * t;
    }

    // Far from road
    return rawHeight;
  }

  /**
   * Updates chunks around the player position: spawns new ones and culls distant ones
   */
  update(carPosition) {
    const currentChunkX = Math.floor(carPosition.x / this.chunkSize);
    const currentChunkZ = Math.floor(carPosition.z / this.chunkSize);

    const neededKeys = new Set();

    // Determine chunks in radius
    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        // Manhattan or euclidean circle
        if (dx * dx + dz * dz <= (this.viewDistance + 0.5) * (this.viewDistance + 0.5)) {
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

    // Cull chunks outside radius
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.mesh);
        // Recycle geometry
        this.geoPool.push(chunk.mesh.geometry);
        this.chunks.delete(key);
      }
    }
  }

  /**
   * Acquires or allocates a PlaneGeometry for a chunk
   */
  acquireGeometry() {
    if (this.geoPool.length > 0) {
      return this.geoPool.pop();
    }
    const geo = new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      this.segments,
      this.segments
    );
    // Orient horizontally (XZ plane)
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  /**
   * Generates a new terrain chunk mesh at grid coordinates (cx, cz)
   */
  createChunk(cx, cz) {
    const geo = this.acquireGeometry();
    const posAttr = geo.attributes.position;
    const vertexCount = posAttr.count;

    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;

    // Reset base grid plane positions relative to chunk center
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

    // Build color attribute
    this.colorizeChunk(chunk);

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    chunk.mesh = mesh;
    this.chunks.set(chunk.key, chunk);

    return chunk;
  }

  /**
   * Applies vertex colors based on terrain slope, road proximity, and season
   */
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
    const upVector = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const wx = posAttr.getX(i);
      const wy = posAttr.getY(i);
      const wz = posAttr.getZ(i);

      const nx = normAttr.getX(i);
      const ny = normAttr.getY(i);
      const nz = normAttr.getZ(i);

      // Slope angle from vertical (cos theta = ny)
      const slope = 1.0 - ny; // 0 = flat, 1 = vertical cliff

      // Proximity to road
      const roadInfo = this.roadManager.getClosestRoadPoint(wx, wz);
      const roadDist = roadInfo.distanceToCenter;

      if (roadDist < this.roadHalfWidth + 3.0) {
        // Dirt/shoulder edge blend
        tempColor.copy(this.seasonColors.dirt);
      } else if (slope > 0.35) {
        // Steep rock cliff
        tempColor.copy(this.seasonColors.rock);
        // Slight noise variation
        tempColor.offsetHSL(0, 0, (Math.sin(wx * 0.1) * 0.04));
      } else {
        // Rolling grass with dry grass patches
        const grassMix = (Math.sin(wx * 0.03) * Math.cos(wz * 0.03) + 1.0) * 0.5;
        tempColor.lerpColors(this.seasonColors.grass, this.seasonColors.grassDry, grassMix);

        // Highlight high ridges slightly
        if (wy > 25) {
          tempColor.offsetHSL(0, -0.05, Math.min(0.12, (wy - 25) * 0.005));
        }
      }

      colAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    colAttr.needsUpdate = true;
  }
}
