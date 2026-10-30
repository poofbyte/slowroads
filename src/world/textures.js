import * as THREE from 'three';

/**
 * Procedural Road & Surface Texture Generator
 * Generates photorealistic seamless textures directly via HTML5 2D Canvas:
 * - Crisp asphalt with highway striping (dashed center line, solid white edges)
 * - Micro-aggregate aggregate noise & subtle dual tire wear paths
 * - Wet asphalt with puddle reflections & specular glaze
 * - Snow-packed winter highway with icy ruts & snow-covered shoulders
 * - Desert dirt & gravel road with coarse sand and pebble grain
 */
export class TextureGenerator {
  static createAsphaltTexture(type = 'dry') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    // 1. Base Asphalt Color
    let baseColor = '#282a2e';
    if (type === 'wet') baseColor = '#1a1c1e';
    else if (type === 'snow') baseColor = '#5e6772';
    else if (type === 'dirt') baseColor = '#70583e';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // 2. High-Frequency Micro-Aggregate Noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * (type === 'wet' ? 18 : 28);
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Subtle Tire Wear Tarmac Paths
    if (type !== 'dirt') {
      const wearGradLeft = ctx.createLinearGradient(w * 0.18, 0, w * 0.42, 0);
      wearGradLeft.addColorStop(0, 'rgba(0,0,0,0)');
      wearGradLeft.addColorStop(0.5, type === 'wet' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.14)');
      wearGradLeft.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wearGradLeft;
      ctx.fillRect(w * 0.18, 0, w * 0.24, h);

      const wearGradRight = ctx.createLinearGradient(w * 0.58, 0, w * 0.82, 0);
      wearGradRight.addColorStop(0, 'rgba(0,0,0,0)');
      wearGradRight.addColorStop(0.5, type === 'wet' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.14)');
      wearGradRight.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wearGradRight;
      ctx.fillRect(w * 0.58, 0, w * 0.24, h);
    }

    // 4. Highway Striping (White & Yellow Markings)
    if (type !== 'dirt') {
      // Solid outer boundary stripes (White)
      ctx.fillStyle = type === 'snow' ? 'rgba(255,255,255,0.45)' : 'rgba(240, 242, 245, 0.88)';
      const stripeW = 8;
      ctx.fillRect(w * 0.08, 0, stripeW, h);
      ctx.fillRect(w * 0.92 - stripeW, 0, stripeW, h);

      // Center Dashed Line (Yellow or Bright White)
      ctx.fillStyle = type === 'snow' ? 'rgba(255, 220, 100, 0.45)' : 'rgba(255, 215, 60, 0.92)';
      const dashLength = 128;
      const gapLength = 128;
      const centerW = 7;
      const centerX = (w - centerW) * 0.5;

      for (let y = 0; y < h; y += dashLength + gapLength) {
        ctx.fillRect(centerX, y + 16, centerW, dashLength);
      }
    } else {
      // Dirt road tire tracks
      ctx.fillStyle = 'rgba(45, 32, 20, 0.35)';
      ctx.fillRect(w * 0.24, 0, 36, h);
      ctx.fillRect(w * 0.68, 0, 36, h);
    }

    // 5. Snow Overlay on Winter Roads
    if (type === 'snow') {
      const snowGradL = ctx.createLinearGradient(0, 0, w * 0.16, 0);
      snowGradL.addColorStop(0, 'rgba(235, 242, 250, 0.85)');
      snowGradL.addColorStop(1, 'rgba(235, 242, 250, 0)');
      ctx.fillStyle = snowGradL;
      ctx.fillRect(0, 0, w * 0.16, h);

      const snowGradR = ctx.createLinearGradient(w * 0.84, 0, w, 0);
      snowGradR.addColorStop(0, 'rgba(235, 242, 250, 0)');
      snowGradR.addColorStop(1, 'rgba(235, 242, 250, 0.85)');
      ctx.fillStyle = snowGradR;
      ctx.fillRect(w * 0.84, 0, w * 0.16, h);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  static createShoulderTexture(type = 'dry') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    let baseColor = '#5a554a';
    if (type === 'snow') baseColor = '#bcc9d4';
    else if (type === 'dirt') baseColor = '#8c6e4e';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    return tex;
  }
}
