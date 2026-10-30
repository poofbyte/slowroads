/**
 * Fast Simplex & Perlin-style Procedural Noise Generator
 * Includes 2D/3D Simplex noise, multi-octave fBm, and seeded PRNG.
 */

// Seeded PRNG (Mulberry32)
export class PRNG {
  constructor(seed = 1234567) {
    this.seed = seed;
  }

  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }
}

// 2D Simplex Noise Implementation
export class SimplexNoise {
  constructor(seed = 42) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    const prng = new PRNG(seed);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Shuffle using Fisher-Yates
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      const temp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  // Skewing and unskewing factors for 2D
  static F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  static G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

  // 2D Simplex Gradients
  static grad2 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1]
  ];

  noise2D(xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;

    // Skew the input space to determine which simplex cell we're in
    const s = (xin + yin) * SimplexNoise.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SimplexNoise.G2;
    const X0 = i - t; // Unskew the cell origin back to (x,y) space
    const Y0 = j - t;
    const x0 = xin - X0; // The x,y distances from the cell origin
    const y0 = yin - Y0;

    // Determine which simplex we are in (upper or lower triangle)
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + SimplexNoise.G2;
    const y1 = y0 - j1 + SimplexNoise.G2;
    const x2 = x0 - 1.0 + 2.0 * SimplexNoise.G2;
    const y2 = y0 - 1.0 + 2.0 * SimplexNoise.G2;

    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    // Calculate contribution from three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const g = SimplexNoise.grad2[gi0];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = SimplexNoise.grad2[gi1];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = SimplexNoise.grad2[gi2];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Fractional Brownian Motion (fBm) with multiple octaves
   */
  fbm2D(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
