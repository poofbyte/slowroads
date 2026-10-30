import * as THREE from 'three';
import { SimplexNoise } from '../math/noise.js';
import { SplineNode, catmullRom, catmullRomTangent, projectPointOntoSegmentXZ } from '../math/spline.js';

/**
 * Continuous C2 Highway Generation System
 * Generates endless smooth highway ribbons with realistic civil-engineering geometry:
 * - Clothoid-smoothed horizontal curvature (no sudden kinks or erratic turns)
 * - Flowing vertical crests and sags (maximum grade ~6%)
 * - Crowned road cross-section (center raised for drainage)
 * - Realistic super-elevation / banking on curves
 * - High-resolution procedural asphalt shader texture with markings
 * - Roadside guardrails along curves and drop-offs
 * - Delineator guide posts with reflective markers
 */
export class RoadManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.seed = options.seed || 108;
    this.noise = new SimplexNoise(this.seed);
    this.elevationNoise = new SimplexNoise(this.seed + 8888);

    // Road Dimensions
    this.roadWidth = 9.2; // 2 wide cruising lanes (4.6m each)
    this.shoulderWidth = 1.6; // Gravel run-off shoulder
    this.totalHalfWidth = (this.roadWidth / 2) + this.shoulderWidth; // ~6.2m
    this.crownHeight = 0.04; // Centerline crowning

    // Streaming parameters
    this.stepSize = 10; // Meters between detailed spline samples
    this.lookAheadDistance = 750; // Generate ahead up to 750m
    this.cullBehindDistance = 280; // Remove segments >280m behind

    // Road spline state
    this.controlPoints = [];
    this.nodes = [];
    this.segments = [];

    // Road materials
    this.roadTexture = this.createRoadTexture();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.78,
      metalness: 0.12,
      side: THREE.DoubleSide
    });

    this.shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e5648,
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true
    });

    // Guardrail materials
    this.guardrailMaterial = new THREE.MeshStandardMaterial({
      color: 0xb5b8ba,
      metalness: 0.85,
      roughness: 0.35,
      flatShading: true
    });

    this.postMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4d50,
      metalness: 0.6,
      roughness: 0.5
    });

    this.markerMaterialWhite = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.35
    });

    this.markerMaterialAmber = new THREE.MeshBasicMaterial({
      color: 0xffaa00
    });

    // Initial spline generation
    this.currentDistance = 0;
    this.currentPos = new THREE.Vector3(0, 6, 0);
    this.currentHeading = 0;
    this.targetHeading = 0;
    this.currentCurvature = 0;

    this.initRoad();
  }

  /**
   * Generates a high-res procedural asphalt texture with accurate highway markings
   */
  createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Rich dark charcoal asphalt base
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Multi-frequency asphalt grain
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    // Solid outer white edge lines (crisp 18px width)
    ctx.fillStyle = '#f0eee8';
    const edgeLineWidth = 20;
    const edgeOffset = 55;
    ctx.fillRect(edgeOffset, 0, edgeLineWidth, h);
    ctx.fillRect(w - edgeOffset - edgeLineWidth, 0, edgeLineWidth, h);

    // Center dashed white/yellow line (authentic 3:9 dash ratio)
    ctx.fillStyle = '#f5efe0';
    const centerLineWidth = 14;
    const dashLength = 140;
    const dashGap = 160;
    const centerX = (w - centerLineWidth) / 2;

    for (let y = 0; y < h; y += dashLength + dashGap) {
      ctx.fillRect(centerX, y, centerLineWidth, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4); // Repeat every ~16m
    texture.anisotropy = 8;
    return texture;
  }

  initRoad() {
    // Control point before start (for tangent continuity)
    this.controlPoints.push({
      position: new THREE.Vector3(0, 6, -50),
      distance: -50,
      heading: 0,
      curvature: 0
    });
    // Control point at start (0, 6, 0)
    this.controlPoints.push({
      position: new THREE.Vector3(0, 6, 0),
      distance: 0,
      heading: 0,
      curvature: 0
    });
    this.currentPos.set(0, 6, 0);
    this.currentDistance = 0;
    this.currentHeading = 0;

    // Generate initial 20 control points for a smooth opening highway stretch
    for (let i = 0; i < 20; i++) {
      this.generateNextControlPoint();
    }
    this.generateNodesUpTo(this.lookAheadDistance);
    this.buildMeshes();
  }

  /**
   * Generates the next spline control point using clothoid curvature smoothing
   */
  generateNextControlPoint() {
    const cpSpacing = 50; // meters between control points
    const s = this.currentDistance;

    // Smooth multi-scale low-frequency curvature for flowing highway bends
    const curveNoise1 = this.noise.noise2D(s * 0.0012, 10.5);
    const curveNoise2 = this.noise.noise2D(s * 0.0035, 30.2) * 0.35;
    const rawCurvature = (curveNoise1 + curveNoise2) * 0.013; // Max ~0.017 rad/m (radius ~250m)

    // Smooth curvature transition (clothoid spiral effect)
    this.currentCurvature = THREE.MathUtils.lerp(this.currentCurvature, rawCurvature, 0.45);
    this.currentHeading += this.currentCurvature * cpSpacing;

    // Step in horizontal plane
    const dx = Math.sin(this.currentHeading) * cpSpacing;
    const dz = Math.cos(this.currentHeading) * cpSpacing;

    // Flowing highway elevation profile (gentle rolling grades < 6.5%)
    const elevMacro = this.elevationNoise.fbm2D(
      (this.currentPos.x + dx) * 0.0014,
      (this.currentPos.z + dz) * 0.0014,
      3, 0.5, 2.0
    );
    const elevValley = this.elevationNoise.noise2D(
      (this.currentPos.x + dx) * 0.0005,
      (this.currentPos.z + dz) * 0.0005
    );

    // Target road elevation: scenic hills and gentle dips (8m to 38m)
    const targetY = 8.0 + (elevMacro * 26.0) + (elevValley * 16.0);

    this.currentPos.x += dx;
    this.currentPos.z += dz;
    this.currentPos.y = targetY;
    this.currentDistance += cpSpacing;

    this.controlPoints.push({
      position: this.currentPos.clone(),
      distance: this.currentDistance,
      heading: this.currentHeading,
      curvature: this.currentCurvature
    });
  }

  /**
   * Interpolates smooth continuous Catmull-Rom spline nodes
   */
  generateNodesUpTo(targetDist) {
    while (this.currentDistance < targetDist + 180) {
      this.generateNextControlPoint();
    }

    const cps = this.controlPoints;
    if (cps.length < 4) return;

    let lastNodeDist = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].distance : 0;

    let startIndex = 1;
    for (let i = 1; i < cps.length - 2; i++) {
      if (cps[i].distance <= lastNodeDist && cps[i + 1].distance > lastNodeDist) {
        startIndex = i;
        break;
      }
    }

    const stepMeters = this.stepSize;

    for (let i = startIndex; i < cps.length - 2; i++) {
      const p0 = cps[i - 1].position;
      const p1 = cps[i].position;
      const p2 = cps[i + 1].position;
      const p3 = cps[i + 2].position;

      const segDist = p1.distanceTo(p2);
      const steps = Math.max(3, Math.round(segDist / stepMeters));

      for (let s = (i === startIndex && this.nodes.length > 0 ? 1 : 0); s <= steps; s++) {
        const t = s / steps;
        const pos = catmullRom(p0, p1, p2, p3, t);
        const tangent = catmullRomTangent(p0, p1, p2, p3, t);

        // Curvature and authentic super-elevation / banking
        const tNext = Math.min(1.0, t + 0.04);
        const tanNext = catmullRomTangent(p0, p1, p2, p3, tNext);
        const crossY = tangent.x * tanNext.z - tangent.z * tanNext.x;
        // Super-elevation angle: banked into turns (up to ~6.5 degrees)
        const banking = Math.max(-0.11, Math.min(0.11, crossY * 4.2));

        const baseNormal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, baseNormal).normalize();
        binormal.applyAxisAngle(tangent, banking);
        const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

        const nodeDist = (this.nodes.length > 0)
          ? this.nodes[this.nodes.length - 1].distance + this.nodes[this.nodes.length - 1].position.distanceTo(pos)
          : 0;

        const node = new SplineNode(pos, tangent, normal, binormal, nodeDist, banking);
        node.hasGuardrail = Math.abs(banking) > 0.045; // Guardrail on curves or high embankments
        this.nodes.push(node);
      }
    }
  }

  buildMeshes() {
    if (this.nodes.length < 2) return;

    let firstUnmeshed = 0;
    if (this.segments.length > 0) {
      firstUnmeshed = this.segments[this.segments.length - 1].endNodeIndex;
    }

    const CHUNK_SIZE = 16;
    while (firstUnmeshed + CHUNK_SIZE <= this.nodes.length) {
      const endNode = firstUnmeshed + CHUNK_SIZE;
      this.createSegmentMesh(firstUnmeshed, endNode);
      firstUnmeshed = endNode;
    }
  }

  createSegmentMesh(startIndex, endIndex) {
    const nodeCount = endIndex - startIndex + 1;
    if (nodeCount < 2) return;

    const halfW = this.roadWidth / 2;
    const shldW = this.shoulderWidth;
    const crown = this.crownHeight;

    // Road vertices (3 cross-section points per slice: Left, Center Crown, Right)
    const roadVerts = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    // Shoulder vertices (Left shoulder, Right shoulder)
    const shldVerts = [];
    const shldNormals = [];
    const shldIndices = [];

    let roadOffset = 0;
    let shldOffset = 0;

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.nodes[i];
      const p = node.position;
      const b = node.binormal;
      const n = node.normal;
      const v = node.distance / 16; // UV texture repeat

      // 1. Road Surface (Crowned center)
      const roadElev = 0.06;
      const ptLeft = new THREE.Vector3().copy(p).addScaledVector(b, -halfW).addScaledVector(n, roadElev);
      const ptCenter = new THREE.Vector3().copy(p).addScaledVector(n, roadElev + crown);
      const ptRight = new THREE.Vector3().copy(p).addScaledVector(b, halfW).addScaledVector(n, roadElev);

      roadVerts.push(ptLeft.x, ptLeft.y, ptLeft.z);
      roadVerts.push(ptCenter.x, ptCenter.y, ptCenter.z);
      roadVerts.push(ptRight.x, ptRight.y, ptRight.z);

      roadNormals.push(n.x, n.y, n.z);
      roadNormals.push(n.x, n.y, n.z);
      roadNormals.push(n.x, n.y, n.z);

      roadUvs.push(0.0, v);
      roadUvs.push(0.5, v);
      roadUvs.push(1.0, v);

      if (i > startIndex) {
        // Left half quad
        const l0 = roadOffset - 3;
        const c0 = roadOffset - 2;
        const l1 = roadOffset;
        const c1 = roadOffset + 1;
        roadIndices.push(l0, c0, l1);
        roadIndices.push(c0, c1, l1);

        // Right half quad
        const r0 = roadOffset - 1;
        const r1 = roadOffset + 2;
        roadIndices.push(c0, r0, c1);
        roadIndices.push(r0, r1, c1);
      }
      roadOffset += 3;

      // 2. Gravel Shoulders (sloping gently into terrain embankment)
      const shldLeftOuter = new THREE.Vector3().copy(p).addScaledVector(b, -halfW - shldW).addScaledVector(n, -0.06);
      const shldRightOuter = new THREE.Vector3().copy(p).addScaledVector(b, halfW + shldW).addScaledVector(n, -0.06);

      shldVerts.push(shldLeftOuter.x, shldLeftOuter.y, shldLeftOuter.z);
      shldVerts.push(ptLeft.x, ptLeft.y, ptLeft.z);
      shldVerts.push(ptRight.x, ptRight.y, ptRight.z);
      shldVerts.push(shldRightOuter.x, shldRightOuter.y, shldRightOuter.z);

      shldNormals.push(n.x, n.y, n.z);
      shldNormals.push(n.x, n.y, n.z);
      shldNormals.push(n.x, n.y, n.z);
      shldNormals.push(n.x, n.y, n.z);

      if (i > startIndex) {
        // Left shoulder quad
        const sL0 = shldOffset - 4;
        const sL1 = shldOffset - 3;
        const sL2 = shldOffset;
        const sL3 = shldOffset + 1;
        shldIndices.push(sL0, sL1, sL2);
        shldIndices.push(sL1, sL3, sL2);

        // Right shoulder quad
        const sR0 = shldOffset - 2;
        const sR1 = shldOffset - 1;
        const sR2 = shldOffset + 2;
        const sR3 = shldOffset + 3;
        shldIndices.push(sR0, sR1, sR2);
        shldIndices.push(sR1, sR3, sR2);
      }
      shldOffset += 4;
    }

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

    // Add Guardrails on curves or drop-offs
    const guardrails = this.buildGuardrailsForRange(startIndex, endIndex);
    if (guardrails) segmentGroup.add(guardrails);

    // Add Roadside Delineator guide posts with reflectors
    const markers = this.buildMarkersForRange(startIndex, endIndex);
    if (markers) segmentGroup.add(markers);

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
   * Generates realistic low-poly steel w-beam guardrails along curves
   */
  buildGuardrailsForRange(startIndex, endIndex) {
    const group = new THREE.Group();
    const halfW = this.roadWidth / 2 + this.shoulderWidth * 0.85;

    // Determine if segment has significant curve
    let hasCurve = false;
    for (let i = startIndex; i <= endIndex; i++) {
      if (Math.abs(this.nodes[i].banking) > 0.04) {
        hasCurve = true;
        break;
      }
    }
    if (!hasCurve) return null;

    // Build guardrail ribbon and support posts
    const postGeo = new THREE.BoxGeometry(0.12, 0.75, 0.12);
    const railHeight = 0.52;

    const leftVerts = [];
    const rightVerts = [];
    const leftIndices = [];
    const rightIndices = [];

    let railOffset = 0;

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.nodes[i];
      const p = node.position;
      const b = node.binormal;
      const n = node.normal;

      // Left and right rail top/bottom edges
      const lBot = new THREE.Vector3().copy(p).addScaledVector(b, -halfW).addScaledVector(n, railHeight - 0.16);
      const lTop = new THREE.Vector3().copy(p).addScaledVector(b, -halfW).addScaledVector(n, railHeight + 0.16);
      const rBot = new THREE.Vector3().copy(p).addScaledVector(b, halfW).addScaledVector(n, railHeight - 0.16);
      const rTop = new THREE.Vector3().copy(p).addScaledVector(b, halfW).addScaledVector(n, railHeight + 0.16);

      leftVerts.push(lBot.x, lBot.y, lBot.z, lTop.x, lTop.y, lTop.z);
      rightVerts.push(rBot.x, rBot.y, rBot.z, rTop.x, rTop.y, rTop.z);

      if (i > startIndex) {
        const o0 = railOffset - 2;
        const o1 = railOffset - 1;
        const o2 = railOffset;
        const o3 = railOffset + 1;

        leftIndices.push(o0, o1, o2);
        leftIndices.push(o1, o3, o2);

        rightIndices.push(o0, o1, o2);
        rightIndices.push(o1, o3, o2);
      }
      railOffset += 2;

      // Guardrail posts every 2 nodes
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          const postPos = new THREE.Vector3().copy(p).addScaledVector(b, side * halfW).addScaledVector(n, railHeight * 0.5);
          const postMesh = new THREE.Mesh(postGeo, this.postMaterial);
          postMesh.position.copy(postPos);
          postMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
          postMesh.castShadow = true;
          group.add(postMesh);
        }
      }
    }

    const leftGeo = new THREE.BufferGeometry();
    leftGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftVerts, 3));
    leftGeo.setIndex(leftIndices);
    leftGeo.computeVertexNormals();

    const rightGeo = new THREE.BufferGeometry();
    rightGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightVerts, 3));
    rightGeo.setIndex(rightIndices);
    rightGeo.computeVertexNormals();

    group.add(new THREE.Mesh(leftGeo, this.guardrailMaterial));
    group.add(new THREE.Mesh(rightGeo, this.guardrailMaterial));

    return group;
  }

  buildMarkersForRange(startIndex, endIndex) {
    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.95, 6);
    const reflGeo = new THREE.BoxGeometry(0.12, 0.24, 0.05);

    const postDist = 28; // Every ~28m
    let lastPostDist = 0;
    const halfW = this.roadWidth / 2 + this.shoulderWidth + 0.35;

    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.nodes[i];
      if (node.distance - lastPostDist >= postDist) {
        lastPostDist = node.distance;

        for (const side of [-1, 1]) {
          const postPos = new THREE.Vector3()
            .copy(node.position)
            .addScaledVector(node.binormal, side * halfW)
            .addScaledVector(node.normal, 0.48);

          const postMesh = new THREE.Mesh(postGeo, this.markerMaterialWhite);
          postMesh.position.copy(postPos);
          postMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.normal);
          postMesh.castShadow = true;
          group.add(postMesh);

          // Reflector tab
          const reflMesh = new THREE.Mesh(reflGeo, this.markerMaterialAmber);
          reflMesh.position.copy(postPos).addScaledVector(node.normal, 0.22).addScaledVector(node.tangent, -side * 0.04);
          reflMesh.quaternion.copy(postMesh.quaternion);
          group.add(reflMesh);
        }
      }
    }

    return group.children.length > 0 ? group : null;
  }

  update(carPosition) {
    const closest = this.getClosestNode(carPosition.x, carPosition.z);
    if (!closest) return;

    const carDist = closest.node.distance;

    // Extend road ahead
    const farthestNode = this.nodes[this.nodes.length - 1];
    if (farthestNode && (farthestNode.distance - carDist < this.lookAheadDistance)) {
      this.generateNodesUpTo(carDist + this.lookAheadDistance);
      this.buildMeshes();
    }

    // Cull segments behind vehicle
    while (this.segments.length > 0 && (carDist - this.segments[0].endDistance > this.cullBehindDistance)) {
      const oldSeg = this.segments.shift();
      this.scene.remove(oldSeg.group);

      oldSeg.group.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
        }
      });
    }

    // Clean up old nodes
    if (this.nodes.length > 220 && this.segments.length > 0) {
      const minNodeIndex = this.segments[0].startNodeIndex;
      if (minNodeIndex > 60) {
        this.nodes.splice(0, minNodeIndex - 12);
        const offset = minNodeIndex - 12;
        for (const seg of this.segments) {
          seg.startNodeIndex -= offset;
          seg.endNodeIndex -= offset;
        }
      }
    }
  }

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
    const start = Math.max(0, index - 4);
    const end = Math.min(this.nodes.length - 2, index + 4);

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
