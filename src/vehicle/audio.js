/**
 * Procedural Web Audio API sound synthesizer for Slow Roads.
 * Synthesizes:
 * - Vehicle engine profiles: Electric (EV), V8 muscle, Diesel heavy-duty, Superbike
 * - Tire roll & wind rush ambience
 * - Tire screech / drift noise when slipping
 * - Metallic crunch + low-end thud obstacle collision sounds
 * Completely self-contained with zero external audio asset dependencies.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.7;
    this.engineVolume = 0.65;
    this.windVolume = 0.55;
    this.engineType = 'ev'; // 'ev' | 'v8' | 'diesel' | 'bike'

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Engine Synthesizer
      this.initEngineSynth();

      // 2. Wind Rush Synthesizer
      this.initWindSynth();

      // 3. Tire Roll & Skid Screech Synthesizer
      this.initTireAndSkidSynth();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  initEngineSynth() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    // Primary Oscillator
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    // Secondary Harmonic Oscillator
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(100, this.ctx.currentTime);

    this.osc2Gain = this.ctx.createGain();
    this.osc2Gain.gain.setValueAtTime(0.45, this.ctx.currentTime);

    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.osc2Gain);
    this.osc2Gain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
  }

  initWindSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windSource.start();
  }

  initTireAndSkidSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Tire rolling road noise
    this.tireSource = this.ctx.createBufferSource();
    this.tireSource.buffer = noiseBuffer;
    this.tireSource.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(240, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(1.1, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.tireSource.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);
    this.tireSource.start();

    // High-pitched Tire Screech / Drift Synthesizer
    this.skidSource = this.ctx.createBufferSource();
    this.skidSource.buffer = noiseBuffer;
    this.skidSource.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1350, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.skidSource.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);
    this.skidSource.start();
  }

  setEngineType(engineType) {
    this.engineType = engineType || 'ev';
    if (!this.initialized || !this.ctx) return;

    if (this.engineType === 'ev') {
      this.osc1.type = 'sine';
      this.osc2.type = 'triangle';
      this.osc2Gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    } else if (this.engineType === 'v8') {
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'triangle';
      this.osc2Gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    } else if (this.engineType === 'diesel') {
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'square';
      this.osc2Gain.gain.setValueAtTime(0.38, this.ctx.currentTime);
    } else if (this.engineType === 'bike') {
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'sawtooth';
      this.osc2Gain.gain.setValueAtTime(0.42, this.ctx.currentTime);
    }
  }

  /**
   * Synthesize metallic obstacle crunch + low-end thud on collision
   */
  triggerCollisionSound(impactSpeedMs) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const intensity = Math.min(1.0, Math.max(0.2, impactSpeedMs / 25));

      // 1. Deep impact thud
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(120, now);
      thudOsc.frequency.exponentialRampToValueAtTime(24, now + 0.3);

      thudGain.gain.setValueAtTime(intensity * 0.8, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      thudOsc.connect(thudGain);
      thudGain.connect(this.masterGain);
      thudOsc.start(now);
      thudOsc.stop(now + 0.34);

      // 2. Metallic distortion crunch burst
      const crunchOsc = this.ctx.createOscillator();
      const crunchGain = this.ctx.createGain();
      crunchOsc.type = 'sawtooth';
      crunchOsc.frequency.setValueAtTime(260 + Math.random() * 80, now);
      crunchOsc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

      crunchGain.gain.setValueAtTime(intensity * 0.42, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      crunchOsc.connect(crunchGain);
      crunchGain.connect(this.masterGain);
      crunchOsc.start(now);
      crunchOsc.stop(now + 0.24);
    } catch (e) {
      // Ignore transient audio node errors
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Updates audio frequencies, gains, and screech based on vehicle state
   */
  update(speedMs, throttle, isBraking, slipRatio = 0, rpm = 1200) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const absSpeed = Math.abs(speedMs);
    const speedRatio = Math.min(1.0, absSpeed / 42.0);
    const now = this.ctx.currentTime;

    // 1. Engine pitch & filter modulation based on engine type
    let baseFreq = 48 + (rpm / 6500) * 140;

    if (this.engineType === 'ev') {
      baseFreq = 80 + speedRatio * 380 + (throttle > 0 ? 30 : 0);
      const filterFreq = 180 + speedRatio * 820 + (throttle > 0 ? 120 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
    } else if (this.engineType === 'diesel') {
      baseFreq = 22 + (rpm / 6500) * 72;
      const filterFreq = 120 + (rpm / 6500) * 450 + (throttle > 0 ? 180 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.05);
    } else if (this.engineType === 'bike') {
      baseFreq = 55 + (rpm / 6500) * 260;
      const filterFreq = 220 + (rpm / 6500) * 1100 + (throttle > 0 ? 350 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
    } else {
      // V8
      baseFreq = 32 + (rpm / 6500) * 135;
      const filterFreq = 160 + (rpm / 6500) * 750 + (throttle > 0 ? 240 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.05);
    }

    const targetEngineGain = (0.06 + speedRatio * 0.14 + (throttle > 0 ? 0.07 : 0)) * this.engineVolume;
    this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.06);

    // 2. Wind rush
    const windTargetGain = (speedRatio * speedRatio * 0.35) * this.windVolume;
    const windFreq = 350 + speedRatio * 800;
    this.windGain.gain.setTargetAtTime(windTargetGain, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(windFreq, now, 0.1);

    // 3. Tire roll rumble
    const tireTargetGain = (speedRatio * 0.12) * (isBraking ? 1.5 : 1.0);
    this.tireGain.gain.setTargetAtTime(tireTargetGain, now, 0.06);
    this.tireFilter.frequency.setTargetAtTime(180 + speedRatio * 600, now, 0.08);

    // 4. Tire Screech / Drift Noise
    const skidVol = Math.min(0.24, Math.max(0, (slipRatio - 0.28) * 0.55));
    this.skidGain.gain.setTargetAtTime(skidVol, now, 0.04);
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }
}
