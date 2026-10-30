import * as THREE from 'three';
import { SimplexNoise } from '../math/noise.js';
import { SplineNode, catmullRom, catmullRomTangent, projectPointOntoSegmentXZ } from '../math/spline.js';

export class RoadManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.seed = options.seed || 101;
    this.noise = new SimplexNoise(this.seed);
    this.elevationNoise = new SimplexNoise(this.seed + 9999);

    // Road dimensions
    this.roadWidth = 8.6; // 2 lanes (4.3m each)
    this.shoulderWidth = 1.4;
    this.totalHalfWidth = (this.roadWidth / 2) + this.shoulderWidth; // ~5.7m
    this.segmentLength = 12; // Length of individual spline step in meters
    this.lookAheadDistance = 650; // Generate ahead up to 650m
    this.cullBehindDistance = 250; // Remove segments >250m behind

    // Road control points and sampled nodes
    this.controlPoints = [];
    this.nodes = []; // Detailed sampled spline nodes
    this.segments = []; // Three.js mesh chunks

    // Road materials & canvas texture
    this.roadTexture = this.createRoadTexture();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: false,
      side: THREE.DoubleSide
    });

    this.shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a554a,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });

    // Roadside markers (instanced or grouped)
    this.markerMaterialWhite = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.4
    });
    this.markerMaterialReflector = new THREE.MeshBasicMaterial({
      color: 0xff8800
    });
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);

    // Initial state
    this.currentDistance = 0;
    this.heading = 0; // In radians
    this.currentPos = new THREE.Vector3(0, 5, 0);

    // Seed initial control points
    this.initRoad();
  }

  /**
   * Generates a procedural high-res asphalt texture with lanes and markings
   */
  createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base dark asphalt with subtle grain
    ctx.fillStyle = '#26282b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add asphalt noise grain
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    // Road markings
    const w = canvas.width;
    const h = canvas.height;

    // Outer solid white lines (edge markings)
    ctx.fillStyle = '#e5e3dc';
    const lineWidth = 10;
    const edgeOffset = 36;
    ctx.fillRect(edgeOffset, 0, lineWidth, h);
    ctx.fillRect(w - edgeOffset - lineWidth, 0, lineWidth, h);

    // Center dashed white/yellow line
    ctx.fillStyle = '#f0ebe0';
    const dashLength = 80;
    const dashGap = 65;
    const centerLineWidth = 8;
    const centerX = (w - centerLineWidth) / 2;

    for (let y = 0; y < h; y += dashLength + dashGap) {
      ctx.fillRect(centerX, y, centerLineWidth, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4); // Repeat along road length
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Initialize road with a straight opening runway and initial curve ahead
   */
  initRoad() {
    // Generate initial control points
    for (let i = 0; i < 15; i++) {
      this.generateNextControlPoint();
    }
    this.generateNodesUpTo(this.lookAheadDistance);
    this.buildMeshes();
  }

  /**
   * Generates the next spline control point based on noise curvature & terrain elevation
   */
  generateNextControlPoint() {
    const cpSpacing = 45; // meters between control points
    const s = this.currentDistance;

    // Curvature: smooth low frequency noise for gentle sweeping highway turns
    // Use multi-scale noise to produce wide bends with occasional tighter turns
    const curveNoise1 = this.noise.noise2D(s * 0.0018, 12.3);
    const curveNoise2 = this.noise.noise2D(s * 0.0055, 45.7) * 0.4;
    const curvature = (curveNoise1 + curveNoise2) * 0.016; // Angular delta per step

    this.heading += curvature * cpSpacing;

    // Step in XZ
    const dx = Math.sin(this.heading) * cpSpacing;
    const dz = Math.cos(this.heading) * cpSpacing;

    // Elevation: gentle rolling hills with occasional scenic climbs/overlooks
    const elevNoise1 = this.elevationNoise.fbm2D(
      (this.currentPos.x + dx) * 0.0018,
      (this.currentPos.z + dz) * 0.0018,
      3, 0.5, 2.0
    );
    const elevNoise2 = this.elevationNoise.noise2D(
      (this.currentPos.x + dx) * 0.0006,
      (this.currentPos.z + dz) * 0.0006
    );
    // Road sits at natural rolling hill height (base height 4m to 35m)
    const targetY = 6 + (elevNoise1 * 22) + (elevNoise2 * 14);

    this.currentPos.x += dx;
    this.currentPos.z += dz;
    this.currentPos.y = targetY;
    this.currentDistance += cpSpacing;

    this.controlPoints.push({
      position: this.currentPos.clone(),
      distance: this.currentDistance,
      heading: this.heading,
      curvature: curvature
    });
  }

  /**
   * Samples spline nodes between control points up to target distance
   */
  generateNodesUpTo(targetDist) {
    while (this.currentDistance < targetDist + 150) {
      this.generateNextControlPoint();
    }

    const cps = this.controlPoints;
    if (cps.length < 4) return;

    // Determine where we left off
    let lastNodeDist = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].distance : 0;

    // Find starting control point index
    let startIndex = 1;
    for (let i = 1; i < cps.length - 2; i++) {
      if (cps[i].distance <= lastNodeDist && cps[i + 1].distance > lastNodeDist) {
        startIndex = i;
        break;
      }
    }

    const stepSize = this.segmentLength;

    for (let i = startIndex; i < cps.length - 2; i++) {
      const p0 = cps[i - 1].position;
      const p1 = cps[i].position;
      const p2 = cps[i + 1].position;
      const p3 = cps[i + 2].position;

      const segDist = p1.distanceTo(p2);
      const steps = Math.max(2, Math.round(segDist / stepSize));

      for (let s = (i === startIndex && this.nodes.length > 0 ? 1 : 0); s <= steps; s++) {
        const t = s / steps;
        const pos = catmullRom(p0, p1, p2, p3, t);
        const tangent = catmullRomTangent(p0, p1, p2, p3, t);

        // Approximate curvature in XZ to calculate road banking
        const tNext = Math.min(1.0, t + 0.05);
        const tanNext = catmullRomTangent(p0, p1, p2, p3, tNext);
        const crossY = tangent.x * tanNext.z - tangent.z * tanNext.x;
        // Banking angle (camber) on curves (clamp to -0.12 to +0.12 rad, ~7 deg)
        const banking = Math.max(-0.12, Math.min(0.12, crossY * 4.5));

        // Binormal (perpendicular in horizontal plane + banking tilt)
        const baseNormal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3()
          .crossVectors(tangent, baseNormal)
          .normalize();

        // Apply banking rotation around tangent
        binormal.applyAxisAngle(tangent, banking);
        const normal = new THREE.Vector3()
          .crossVectors(binormal, tangent)
          .normalize();

        const nodeDist = (this.nodes.length > 0)
          ? this.nodes[this.nodes.length - 1].distance + (this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].position.distanceTo(pos) : 0)
          : 0;

        const node = new SplineNode(pos, tangent, normal, binormal, nodeDist, banking);
        this.nodes.push(node);
      }
    }
  }

  /**
   * Builds meshes for newly generated spline nodes
   */
  buildMeshes() {
    if (this.nodes.length < 2) return;

    // Find index of first unmeshed node
    let firstUnmeshed = 0;
    if (this.segments.length > 0) {
      const lastSeg = this.segments[this.segments.length - 1];
      firstUnmeshed = lastSeg.endNodeIndex;
    }

    const CHUNK_NODE_COUNT = 16; // Nodes per mesh chunk

    while (firstUnmeshed + CHUNK_NODE_COUNT <= this.nodes.length) {
      const endNode = firstUnmeshed + CHUNK_NODE_COUNT;
      this.createRoadSegmentMesh(firstUnmeshed, endNode);
      firstUnmeshed = endNode;
    }
  }

  /**
   * Creates a road geometry chunk between node indices [startIndex, endIndex]
   */
  createRoadSegmentMesh(startIndex, endIndex) {
    const nodeCount = endIndex - startIndex + 1;
    if (nodeCount < 2) return;

    const halfW = this.roadWidth / 2;
    const shldW = this.shoulderWidth;

    // Cross-section points:
    // 0: Left shoulder outer (-halfW - shldW)
    // 1: Left road edge (-halfW)
    // 2: Right road edge (+halfW)
    // 3: Right shoulder outer (+halfW + shldW)

    // Road surface mesh
    const roadVerts = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    // Shoulder mesh
    const shldVerts = [];
    const shldNormals = [];
    const shldIndices = [];

    let roadVertOffset = 0;
    let shldVertOffset = 0;

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.nodes[i];
      const p = node.position;
      const b = node.binormal;
      const n = node.normal;
      const v = node.distance / 12; // UV repeat rate

      // Road surface points (raised slightly by 0.05m to prevent z-fighting with terrain)
      const roadElev = 0.05;
      const leftRoad = new THREE.Vector3().copy(p).addScaledVector(b, -halfW).addScaledVector(n, roadElev);
      const rightRoad = new THREE.Vector3().copy(p).addScaledVector(b, halfW).addScaledVector(n, roadElev);

      // Road vertices
      roadVerts.push(leftRoad.x, leftRoad.y, leftRoad.z);
      roadVerts.push(rightRoad.x, rightRoad.y, rightRoad.z);

      roadNormals.push(n.x, n.y, n.z);
      roadNormals.push(n.x, n.y, n.z);

      roadUvs.push(0, v);
      roadUvs.push(1, v);

      if (i > startIndex) {
        const r0 = roadVertOffset - 2;
        const r1 = roadVertOffset - 1;
        const r2 = roadVertOffset;
        const r3 = roadVertOffset + 1;
        roadIndices.push(r0, r1, r2);
        roadIndices.push(r1, r3, r2);
      }
      roadVertOffset += 2;

      // Shoulder vertices (sloping slightly downward into the terrain)
      const leftShldOuter = new THREE.Vector3().copy(p).addScaledVector(b, -halfW - shldW).addScaledVector(n, -0.05);
      const rightShldOuter = new THREE.Vector3().copy(p).addScaledVector(b, halfW + shldW).addScaledVector(n, -0.05);

      // Left shoulder quad
      shldVerts.push(leftShldOuter.x, leftShldOuter.y, leftShldOuter.z);
      shldVerts.push(leftRoad.x, leftRoad.y, leftRoad.z);
      shldNormals.push(n.x, n.y, n.z);
      shldNormals.push(n.x, n.y, n.z);

      // Right shoulder quad
      shldVerts.push(rightRoad.x, rightRoad.y, rightRoad.z);
      shldVerts.push(rightShldOuter.x, rightShldOuter.y, rightShldOuter.z);
      shldNormals.push(n.x, n.y, n.z);
      shldNormals.push(n.x, n.y, n.z);

      if (i > startIndex) {
        // Left shoulder indices
        const ls0 = shldVertOffset - 4;
        const ls1 = shldVertOffset - 3;
        const ls2 = shldVertOffset;
        const ls3 = shldVertOffset + 1;
        shldIndices.push(ls0, ls1, ls2);
        shldIndices.push(ls1, ls3, ls2);

        // Right shoulder indices
        const rs0 = shldVertOffset - 2;
        const rs1 = shldVertOffset - 1;
        const rs2 = shldVertOffset + 2;
        const rs3 = shldVertOffset + 3;
        shldIndices.push(rs0, rs1, rs2);
        shldIndices.push(rs1, rs3, rs2);
      }
      shldVertOffset += 4;
    }

    // Build Three.js buffer geometries
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeBoundingSphere();
    roadGeo.computeBoundingBox();

    const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
    roadMesh.receiveShadow = true;

    const shldGeo = new THREE.BufferGeometry();
    shldGeo.setAttribute('position', new THREE.Float32BufferAttribute(shldVerts, 3));
    shldGeo.setAttribute('normal', new THREE.Float32BufferAttribute(shldNormals, 3));
    shldGeo.setIndex(shldIndices);
    shldGeo.computeBoundingSphere();
    shldGeo.computeBoundingBox();

    const shldMesh = new THREE.Mesh(shldGeo, this.shoulderMaterial);
    shldMesh.receiveShadow = true;

    const segmentGroup = new THREE.Group();
    segmentGroup.add(roadMesh);
    segmentGroup.add(shldMesh);

    // Add roadside marker posts every 24 meters along this segment
    const markerPosts = this.createMarkerPostsForRange(startIndex, endIndex);
    if (markerPosts) segmentGroup.add(markerPosts);

    this.scene.add(segmentGroup);

    this.segments.push({
      group: segmentGroup,
      startNodeIndex: startIndex,
      endNodeIndex: endIndex,
      startDistance: this.nodes[startIndex].distance,
      endDistance: this.nodes[endIndex].distance
    });
  }

  /**
   * Creates minimalist roadside delineator posts with reflectors
   */
  createMarkerPostsForRange(startIndex, endIndex) {
    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
    const reflGeo = new THREE.BoxGeometry(0.12, 0.22, 0.05);

    const postDist = 26; // Every ~26m
    let lastPostDist = 0;

    const halfW = this.roadWidth / 2 + this.shoulderWidth + 0.4;

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.nodes[i];
      if (node.distance - lastPostDist >= postDist) {
        lastPostDist = node.distance;

        // Place on left and right side
        for (const side of [-1, 1]) {
          const postPos = new THREE.Vector3()
            .copy(node.position)
            .addScaledVector(node.binormal, side * halfW)
            .addScaledVector(node.normal, 0.45);

          const postMesh = new THREE.Mesh(postGeo, this.markerMaterialWhite);
          postMesh.position.copy(postPos);
          postMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.normal);
          postMesh.castShadow = true;
          group.add(postMesh);

          // Reflector patch facing traffic
          const reflMesh = new THREE.Mesh(reflGeo, this.markerMaterialReflector);
          reflMesh.position.copy(postPos).addScaledVector(node.normal, 0.2).addScaledVector(node.tangent, -side * 0.05);
          reflMesh.quaternion.copy(postMesh.quaternion);
          group.add(reflMesh);
        }
      }
    }

    return group.children.length > 0 ? group : null;
  }

  /**
   * Updates road generation and culls old segments based on player position
   */
  update(carPosition) {
    // Find closest node to car
    const closest = this.getClosestNode(carPosition.x, carPosition.z);
    if (!closest) return;

    const carDist = closest.node.distance;

    // Check if we need more road ahead
    const farthestNode = this.nodes[this.nodes.length - 1];
    if (farthestNode && (farthestNode.distance - carDist < this.lookAheadDistance)) {
      this.generateNodesUpTo(carDist + this.lookAheadDistance);
      this.buildMeshes();
    }

    // Cull segments that are far behind the car
    while (this.segments.length > 0 && (carDist - this.segments[0].endDistance > this.cullBehindDistance)) {
      const oldSeg = this.segments.shift();
      this.scene.remove(oldSeg.group);

      // Dispose geometries
      oldSeg.group.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
        }
      });
    }

    // Clean up nodes that are very far behind
    if (this.nodes.length > 200 && this.segments.length > 0) {
      const minNodeIndex = this.segments[0].startNodeIndex;
      if (minNodeIndex > 50) {
        this.nodes.splice(0, minNodeIndex - 10);
        // Offset segment node indices
        const offset = minNodeIndex - 10;
        for (const seg of this.segments) {
          seg.startNodeIndex -= offset;
          seg.endNodeIndex -= offset;
        }
      }
    }
  }

  /**
   * Efficiently finds the closest spline node to an arbitrary 2D coordinate (x, z)
   */
  getClosestNode(x, z) {
    if (this.nodes.length === 0) return null;

    let closestNode = this.nodes[0];
    let closestIndex = 0;
    let minDistSq = Infinity;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const dx = node.position.x - x;
      const dz = node.position.z - z;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestNode = node;
        closestIndex = i;
      }
    }

    return { node: closestNode, index: closestIndex, distanceSq: minDistSq };
  }

  /**
   * Computes the exact interpolated point on the road spline closest to (x, z),
   * along with distance to road center, tangent, normal, and banking.
   */
  getClosestRoadPoint(x, z) {
    if (this.nodes.length < 2) {
      return {
        point: new THREE.Vector3(x, 0, z),
        distanceToCenter: 9999,
        normal: new THREE.Vector3(0, 1, 0),
        tangent: new THREE.Vector3(0, 0, 1),
        banking: 0,
        height: 0
      };
    }

    const { index } = this.getClosestNode(x, z);
    const start = Math.max(0, index - 3);
    const end = Math.min(this.nodes.length - 2, index + 3);

    let bestDistSq = Infinity;
    let bestPoint = new THREE.Vector3();
    let bestNormal = new THREE.Vector3(0, 1, 0);
    let bestTangent = new THREE.Vector3(0, 0, 1);
    let bestBanking = 0;

    for (let i = start; i <= end; i++) {
      const n0 = this.nodes[i];
      const n1 = this.nodes[i + 1];

      const proj = projectPointOntoSegmentXZ(
        x, z,
        n0.position.x, n0.position.z,
        n1.position.x, n1.position.z
      );

      if (proj.distanceSq < bestDistSq) {
        bestDistSq = proj.distanceSq;
        const y = THREE.MathUtils.lerp(n0.position.y, n1.position.y, proj.t);
        bestPoint.set(proj.x, y, proj.z);
        bestNormal.lerpVectors(n0.normal, n1.normal, proj.t).normalize();
        bestTangent.lerpVectors(n0.tangent, n1.tangent, proj.t).normalize();
        bestBanking = THREE.MathUtils.lerp(n0.banking, n1.banking, proj.t);
      }
    }

    return {
      point: bestPoint,
      distanceToCenter: Math.sqrt(bestDistSq),
      normal: bestNormal,
      tangent: bestTangent,
      banking: bestBanking,
      height: bestPoint.y
    };
  }
}
