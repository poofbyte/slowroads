/**
 * Procedural Web Audio API sound synthesizer for Slow Roads recreation.
 * Synthesizes engine tone, rushing ambient wind, and road contact rumble.
 * Completely self-contained with no external audio file dependencies.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.7;
    this.engineVolume = 0.65;
    this.windVolume = 0.55;

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

      // 3. Tire Roll Synthesizer
      this.initTireSynth();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  initEngineSynth() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Oscillator 1: Fundamental tone (Triangle)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.setValueAtTime(52, this.ctx.currentTime);

    // Oscillator 2: Sub-harmonic (Sine)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(26, this.ctx.currentTime);

    // Filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
  }

  initWindSynth() {
    // Generate 2 seconds of white noise in a buffer
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

  initTireSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    this.tireSource = this.ctx.createBufferSource();
    this.tireSource.buffer = noiseBuffer;
    this.tireSource.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'lowpass';
    this.tireFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.tireSource.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    this.tireSource.start();
  }

  /**
   * Resumes audio context if suspended (browser user-gesture policy)
   */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Updates audio frequencies and gains based on vehicle speed and throttle
   */
  update(speedMs, throttle, isBraking) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const absSpeed = Math.abs(speedMs);
    const speedRatio = Math.min(1.0, absSpeed / 40.0); // 0 to 1 (at ~144 km/h)
    const now = this.ctx.currentTime;

    // 1. Engine pitch & filter modulation
    // Idle 50Hz, top speed 220Hz
    const baseFreq = 50 + speedRatio * 165 + (throttle > 0 ? 25 : 0);
    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.osc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);

    // Filter opening with speed
    const cutoff = 150 + speedRatio * 650 + (throttle > 0 ? 150 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

    const targetEngineGain = (0.07 + speedRatio * 0.16 + (throttle > 0 ? 0.08 : 0)) * this.engineVolume;
    this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.08);

    // 2. Wind rush: proportional to speed
    const windTargetGain = (speedRatio * speedRatio * 0.38) * this.windVolume;
    const windFreq = 350 + speedRatio * 850;
    this.windGain.gain.setTargetAtTime(windTargetGain, now, 0.12);
    this.windFilter.frequency.setTargetAtTime(windFreq, now, 0.12);

    // 3. Tire rumble
    const tireTargetGain = (speedRatio * 0.14) * (isBraking ? 1.8 : 1.0);
    this.tireGain.gain.setTargetAtTime(tireTargetGain, now, 0.06);
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
