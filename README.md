# Slow Roads — Local Recreation

A relaxing, single-player, browser-based 3D endless driving game recreation inspired by [Slow Roads](https://slowroads.io/).

Built with **Three.js**, modern ES modules, and **Vite**. Self-contained with zero external API dependencies, running 100% locally.

---

## Features

### 1. Endless Procedural World
- **Highway Spine & Spline Routing**: Procedurally generated continuous Catmull-Rom road spline with gentle highway curvature, rolling elevations, and realistic road camber/banking on bends.
- **Corridor Cut/Fill Blending**: Natural terrain seamlessly flattens and blends into the road shoulders, preventing gaps or floating pavement.
- **Instanced Low-Poly Scenery**: Thousands of pine trees, deciduous trees, autumn birches, rocks, bushes, and roadside delineator posts rendered with minimal draw calls via `THREE.InstancedMesh`.
- **Dynamic Chunk Streaming**: Infinite ahead-of-time generation and behind-the-vehicle chunk disposal with zero garbage-collection stutter.

### 2. Seasons & Atmospheres
Switch between 5 atmospheric presets anytime via the Settings modal or at the Start Screen:
- **Autumn** (Signature look): Warm amber sky, golden hour sunlight, rust/crimson foliage, and warm haze.
- **Summer**: Vivid blue sky, bright sun, emerald hills, and lush green forests.
- **Winter**: Frosted snowy terrain, crisp cool light, and misty pale horizons.
- **Sunset**: Twilight violet-to-orange gradient sky, long dramatic shadows, and dusk mist.
- **Night**: Midnight navy starfield with moonlight; vehicle headlights illuminate the asphalt and reflect off roadside markers.

### 3. Realistic, Relaxing Vehicle Kinematics
- Smooth, responsive arcade handling tuned specifically for peaceful cruising.
- **Speed-Sensitive Steering**: Agile steering at low speeds with automatic damping at highway speeds (up to 160 km/h) for effortless lane keeping.
- **4-Wheel Terrain Suspension**: Samples ground elevation at all 4 wheels, adapting vehicle pitch, roll, and height to slopes and embankments.
- **Dynamic Body Lean**: Chassis pitch on acceleration/braking and roll on cornering.
- **Cruise Control**: Optional auto-throttle mode to lock in cruising speed and focus purely on steering.
- **Road Reset (`R`)**: Instantly resets the vehicle onto the nearest road segment facing forward.

### 4. Audio Synthesizer (Web Audio API)
- Purely procedural audio — no external audio files required:
  - Multi-harmonic engine drone with frequency and filter modulation tied to RPM and speed.
  - Wind rush white noise that swells with vehicle velocity.
  - Tire contact rumble on pavement.

### 5. Multi-Mode Camera Controller
Cycle with the **`C`** key:
1. **Chase View**: Elevated rear perspective with dynamic high-speed FOV expansion.
2. **Close Chase**: Sporty low-angle rear view.
3. **Hood / Dash**: Immersive first-person perspective over the front hood.
4. **Cinematic Orbit**: Sweeping 360° panoramic rotation around the cruising car.

### 6. Minimalist Glassmorphic Interface
- Speedometer with digital readout, `KM/H` / `MPH` switch, gear indicator (`D`, `R`, `P`), and road surface status.
- **Zen Mode (`H`)**: Hides the entire UI for distraction-free screenshot-worthy driving.
- Settings panel for graphics presets, steering sensitivity, audio volume, and controls.

---

## Controls

| Key | Action |
| --- | --- |
| **W** / **&uarr;** | Accelerate |
| **S** / **&darr;** | Brake / Reverse |
| **A** / **&larr;** | Steer Left |
| **D** / **&rarr;** | Steer Right |
| **Space** | Handbrake |
| **C** | Cycle Camera View (Chase, Close, Hood, Orbit) |
| **R** | Reset Vehicle to Road |
| **H** | Toggle / Hide HUD (Zen Mode) |
| **M** | Mute / Unmute Sound |
| **Esc** | Pause / Settings Menu |

---

## Running Locally

```bash
# Install dependencies (if not already installed)
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your desktop browser.
