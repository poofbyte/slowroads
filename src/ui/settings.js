/**
 * Slow Roads Refined Settings & Start Modal
 * Clean, airy glassmorphic design with quiet minimalist aesthetics
 */
export class SettingsModal {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isOpen = false;
    this.currentSeason = 'autumn';
    this.graphicsQuality = 'high';
    this.steeringSens = 1.0;
    this.speedUnit = 'kmh';

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    // Settings Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-overlay';
    this.overlay.className = 'sr-dialog-overlay hidden';

    this.overlay.innerHTML = `
      <div class="sr-dialog-panel">
        <header class="sr-dialog-head">
          <div class="sr-dialog-title">settings</div>
          <button class="sr-dialog-close" id="btn-close-settings" title="Close (Esc)">&times;</button>
        </header>

        <div class="sr-dialog-body">
          <!-- Atmosphere & Season -->
          <section class="sr-section">
            <span class="sr-section-title">Atmosphere</span>
            <div class="sr-pill-group" id="season-selector">
              <button class="sr-pill active" data-season="autumn">Autumn</button>
              <button class="sr-pill" data-season="summer">Summer</button>
              <button class="sr-pill" data-season="winter">Winter</button>
              <button class="sr-pill" data-season="sunset">Sunset</button>
              <button class="sr-pill" data-season="night">Night</button>
            </div>
          </section>

          <!-- Handling & Controls -->
          <section class="sr-section">
            <span class="sr-section-title">Handling</span>

            <div class="sr-field-row">
              <span class="sr-field-label">Steering Sensitivity</span>
              <div class="sr-slider-wrap">
                <input type="range" id="slider-steer-sens" min="0.5" max="2.0" step="0.1" value="1.0" class="sr-range">
                <span class="sr-range-val" id="val-steer-sens">1.0x</span>
              </div>
            </div>

            <div class="sr-field-row">
              <span class="sr-field-label">Speed Unit</span>
              <div class="sr-pill-group sr-pill-group-sm">
                <button class="sr-pill active" id="btn-unit-kmh">km/h</button>
                <button class="sr-pill" id="btn-unit-mph">mph</button>
              </div>
            </div>

            <div class="sr-field-row">
              <span class="sr-field-label">Cruise Control</span>
              <button class="sr-pill" id="btn-toggle-cruise-modal">Toggle</button>
            </div>
          </section>

          <!-- Graphics Quality -->
          <section class="sr-section">
            <span class="sr-section-title">Graphics Quality</span>
            <div class="sr-pill-group" id="quality-selector">
              <button class="sr-pill" data-quality="medium">Medium</button>
              <button class="sr-pill active" data-quality="high">High</button>
              <button class="sr-pill" data-quality="ultra">Ultra</button>
            </div>
          </section>

          <!-- Audio -->
          <section class="sr-section">
            <span class="sr-section-title">Acoustics</span>
            <div class="sr-field-row">
              <span class="sr-field-label">Master Volume</span>
              <div class="sr-slider-wrap">
                <input type="range" id="slider-volume" min="0" max="100" step="5" value="70" class="sr-range">
                <span class="sr-range-val" id="val-volume">70%</span>
              </div>
            </div>
          </section>

          <!-- Controls Guide -->
          <section class="sr-section sr-controls-section">
            <span class="sr-section-title">Controls Reference</span>
            <div class="sr-guide-grid">
              <div class="guide-item"><kbd>W</kbd> or <kbd>&uarr;</kbd><span>accelerate</span></div>
              <div class="guide-item"><kbd>S</kbd> or <kbd>&darr;</kbd><span>brake / reverse</span></div>
              <div class="guide-item"><kbd>A</kbd> or <kbd>&larr;</kbd><span>steer left</span></div>
              <div class="guide-item"><kbd>D</kbd> or <kbd>&rarr;</kbd><span>steer right</span></div>
              <div class="guide-item"><kbd>Space</kbd><span>handbrake / drift</span></div>
              <div class="guide-item"><kbd>C</kbd><span>cycle camera view</span></div>
              <div class="guide-item"><kbd>R</kbd><span>reset to nearest road</span></div>
              <div class="guide-item"><kbd>H</kbd><span>zen mode (hide HUD)</span></div>
              <div class="guide-item"><kbd>M</kbd><span>mute / unmute audio</span></div>
              <div class="guide-item"><kbd>Esc</kbd><span>pause / settings</span></div>
            </div>
          </section>
        </div>

        <footer class="sr-dialog-foot">
          <button class="sr-btn-flat" id="btn-reset-modal">reset to road (R)</button>
          <button class="sr-btn-action" id="btn-resume">resume driving</button>
        </footer>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Start Screen Overlay
    this.startScreen = document.createElement('div');
    this.startScreen.id = 'start-screen';
    this.startScreen.className = 'sr-intro-overlay';
    this.startScreen.innerHTML = `
      <div class="sr-intro-panel">
        <h1 class="sr-intro-title">slow roads</h1>
        <p class="sr-intro-desc">endless driving zen</p>

        <div class="sr-intro-seasons">
          <span class="sr-intro-label">atmosphere</span>
          <div class="sr-pill-group" id="start-season-selector">
            <button class="sr-pill active" data-season="autumn">Autumn</button>
            <button class="sr-pill" data-season="summer">Summer</button>
            <button class="sr-pill" data-season="winter">Winter</button>
            <button class="sr-pill" data-season="sunset">Sunset</button>
            <button class="sr-pill" data-season="night">Night</button>
          </div>
        </div>

        <button class="sr-btn-begin" id="btn-start-game">
          BEGIN DRIVING
        </button>

        <div class="sr-intro-keys">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>C</kbd> camera</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>R</kbd> reset</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>H</kbd> zen mode</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.startScreen);
  }

  bindEvents() {
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.startScreen.classList.add('fading');
      setTimeout(() => {
        this.startScreen.style.display = 'none';
      }, 450);

      if (this.callbacks.onStart) {
        this.callbacks.onStart(this.currentSeason);
      }
    });

    document.getElementById('start-season-selector').querySelectorAll('.sr-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('start-season-selector').querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSeason = btn.dataset.season;
        this.syncSeasonButtons();
        if (this.callbacks.onSeasonChange) this.callbacks.onSeasonChange(this.currentSeason);
      });
    });

    document.getElementById('season-selector').querySelectorAll('.sr-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('season-selector').querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSeason = btn.dataset.season;
        this.syncSeasonButtons();
        if (this.callbacks.onSeasonChange) this.callbacks.onSeasonChange(this.currentSeason);
      });
    });

    const steerSlider = document.getElementById('slider-steer-sens');
    const steerVal = document.getElementById('val-steer-sens');
    steerSlider.addEventListener('input', (e) => {
      this.steeringSens = parseFloat(e.target.value);
      steerVal.textContent = `${this.steeringSens.toFixed(1)}x`;
      if (this.callbacks.onSteeringChange) this.callbacks.onSteeringChange(this.steeringSens);
    });

    const btnKmh = document.getElementById('btn-unit-kmh');
    const btnMph = document.getElementById('btn-unit-mph');
    btnKmh.addEventListener('click', () => {
      btnKmh.classList.add('active');
      btnMph.classList.remove('active');
      this.speedUnit = 'kmh';
      if (this.callbacks.onUnitChange) this.callbacks.onUnitChange(this.speedUnit);
    });
    btnMph.addEventListener('click', () => {
      btnMph.classList.add('active');
      btnKmh.classList.remove('active');
      this.speedUnit = 'mph';
      if (this.callbacks.onUnitChange) this.callbacks.onUnitChange(this.speedUnit);
    });

    document.getElementById('btn-toggle-cruise-modal').addEventListener('click', () => {
      if (this.callbacks.onToggleCruise) this.callbacks.onToggleCruise();
    });

    document.getElementById('quality-selector').querySelectorAll('.sr-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('quality-selector').querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.graphicsQuality = btn.dataset.quality;
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange(this.graphicsQuality);
      });
    });

    const volSlider = document.getElementById('slider-volume');
    const volVal = document.getElementById('val-volume');
    volSlider.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      volVal.textContent = `${vol}%`;
      if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(vol / 100);
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => this.close());
    document.getElementById('btn-resume').addEventListener('click', () => this.close());
    document.getElementById('btn-reset-modal').addEventListener('click', () => {
      this.close();
      if (this.callbacks.onReset) this.callbacks.onReset();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  syncSeasonButtons() {
    document.querySelectorAll('[data-season]').forEach(b => {
      if (b.dataset.season === this.currentSeason) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  open() {
    this.isOpen = true;
    this.overlay.classList.remove('hidden');
    if (this.callbacks.onPause) this.callbacks.onPause(true);
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    if (this.callbacks.onPause) this.callbacks.onPause(false);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
