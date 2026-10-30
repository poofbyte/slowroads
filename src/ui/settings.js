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
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-overlay';
    this.overlay.className = 'sr-modal-overlay hidden';

    this.overlay.innerHTML = `
      <div class="sr-modal-card">
        <header class="sr-modal-header">
          <h2 class="sr-modal-title">SETTINGS &bull; ZEN ROAD</h2>
          <button class="sr-btn-close" id="btn-close-settings">&times;</button>
        </header>

        <div class="sr-modal-body">
          <!-- Season / Environment -->
          <div class="sr-setting-group">
            <label class="sr-group-label">Atmosphere & Season</label>
            <div class="sr-pill-selector" id="season-selector">
              <button class="sr-pill-btn active" data-season="autumn">Autumn</button>
              <button class="sr-pill-btn" data-season="summer">Summer</button>
              <button class="sr-pill-btn" data-season="winter">Winter</button>
              <button class="sr-pill-btn" data-season="sunset">Sunset</button>
              <button class="sr-pill-btn" data-season="night">Night</button>
            </div>
          </div>

          <!-- Driving Controls -->
          <div class="sr-setting-group">
            <label class="sr-group-label">Vehicle & Handling</label>
            <div class="sr-slider-row">
              <span class="sr-slider-title">Steering Sensitivity</span>
              <input type="range" id="slider-steer-sens" min="0.5" max="2.0" step="0.1" value="1.0" class="sr-slider">
              <span class="sr-slider-val" id="val-steer-sens">1.0x</span>
            </div>

            <div class="sr-toggle-row">
              <span class="sr-toggle-title">Speed Unit</span>
              <div class="sr-pill-selector sr-pill-mini">
                <button class="sr-pill-btn active" id="btn-unit-kmh">KM/H</button>
                <button class="sr-pill-btn" id="btn-unit-mph">MPH</button>
              </div>
            </div>

            <div class="sr-toggle-row">
              <span class="sr-toggle-title">Cruise Control (Maintain Speed)</span>
              <button class="sr-pill-btn" id="btn-toggle-cruise-modal">Toggle</button>
            </div>
          </div>

          <!-- Graphics Quality -->
          <div class="sr-setting-group">
            <label class="sr-group-label">Graphics Quality</label>
            <div class="sr-pill-selector" id="quality-selector">
              <button class="sr-pill-btn" data-quality="medium">Medium</button>
              <button class="sr-pill-btn active" data-quality="high">High</button>
              <button class="sr-pill-btn" data-quality="ultra">Ultra</button>
            </div>
          </div>

          <!-- Audio Settings -->
          <div class="sr-setting-group">
            <label class="sr-group-label">Sound & Acoustics</label>
            <div class="sr-slider-row">
              <span class="sr-slider-title">Master Volume</span>
              <input type="range" id="slider-volume" min="0" max="100" step="5" value="70" class="sr-slider">
              <span class="sr-slider-val" id="val-volume">70%</span>
            </div>
          </div>

          <!-- Controls Cheat Sheet -->
          <div class="sr-setting-group sr-controls-sheet">
            <label class="sr-group-label">Controls Reference</label>
            <div class="sr-keymap-grid">
              <div class="keymap-item"><kbd>W</kbd> or <kbd>&uarr;</kbd><span>Accelerate</span></div>
              <div class="keymap-item"><kbd>S</kbd> or <kbd>&darr;</kbd><span>Brake / Reverse</span></div>
              <div class="keymap-item"><kbd>A</kbd> or <kbd>&larr;</kbd><span>Steer Left</span></div>
              <div class="keymap-item"><kbd>D</kbd> or <kbd>&rarr;</kbd><span>Steer Right</span></div>
              <div class="keymap-item"><kbd>Space</kbd><span>Handbrake</span></div>
              <div class="keymap-item"><kbd>C</kbd><span>Change Camera</span></div>
              <div class="keymap-item"><kbd>R</kbd><span>Reset to Nearest Road</span></div>
              <div class="keymap-item"><kbd>H</kbd><span>Hide / Show HUD</span></div>
              <div class="keymap-item"><kbd>Esc</kbd><span>Pause / Settings</span></div>
            </div>
          </div>
        </div>

        <footer class="sr-modal-footer">
          <button class="sr-btn sr-btn-secondary" id="btn-reset-modal">Reset to Road (R)</button>
          <button class="sr-btn sr-btn-primary" id="btn-resume">Resume Driving</button>
        </footer>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Start Screen Overlay
    this.startScreen = document.createElement('div');
    this.startScreen.id = 'start-screen';
    this.startScreen.className = 'sr-start-overlay';
    this.startScreen.innerHTML = `
      <div class="start-card">
        <h1 class="start-title">s l o w &nbsp; r o a d s</h1>
        <p class="start-subtitle">Endless procedural driving zen &bull; Single-player recreation</p>

        <div class="start-season-select">
          <span class="start-label">Select Starting Atmosphere:</span>
          <div class="sr-pill-selector" id="start-season-selector">
            <button class="sr-pill-btn active" data-season="autumn">Autumn</button>
            <button class="sr-pill-btn" data-season="summer">Summer</button>
            <button class="sr-pill-btn" data-season="winter">Winter</button>
            <button class="sr-pill-btn" data-season="sunset">Sunset</button>
            <button class="sr-pill-btn" data-season="night">Night</button>
          </div>
        </div>

        <button class="sr-btn sr-btn-start" id="btn-start-game">
          START DRIVING
        </button>

        <div class="start-hints">
          <span class="hint-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Drive</span>
          <span class="hint-item"><kbd>C</kbd> Camera</span>
          <span class="hint-item"><kbd>R</kbd> Reset</span>
          <span class="hint-item"><kbd>H</kbd> Zen Mode</span>
          <span class="hint-item"><kbd>Esc</kbd> Pause</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.startScreen);
  }

  bindEvents() {
    // Start button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.startScreen.classList.add('fade-out');
      setTimeout(() => {
        this.startScreen.style.display = 'none';
      }, 500);

      if (this.callbacks.onStart) {
        this.callbacks.onStart(this.currentSeason);
      }
    });

    // Start season pills
    document.getElementById('start-season-selector').querySelectorAll('.sr-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('start-season-selector').querySelectorAll('.sr-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSeason = btn.dataset.season;
        this.syncSeasonButtons();
        if (this.callbacks.onSeasonChange) this.callbacks.onSeasonChange(this.currentSeason);
      });
    });

    // Settings season pills
    document.getElementById('season-selector').querySelectorAll('.sr-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('season-selector').querySelectorAll('.sr-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSeason = btn.dataset.season;
        this.syncSeasonButtons();
        if (this.callbacks.onSeasonChange) this.callbacks.onSeasonChange(this.currentSeason);
      });
    });

    // Steering sensitivity slider
    const steerSlider = document.getElementById('slider-steer-sens');
    const steerVal = document.getElementById('val-steer-sens');
    steerSlider.addEventListener('input', (e) => {
      this.steeringSens = parseFloat(e.target.value);
      steerVal.textContent = `${this.steeringSens.toFixed(1)}x`;
      if (this.callbacks.onSteeringChange) this.callbacks.onSteeringChange(this.steeringSens);
    });

    // Units toggle
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

    // Cruise modal button
    document.getElementById('btn-toggle-cruise-modal').addEventListener('click', () => {
      if (this.callbacks.onToggleCruise) this.callbacks.onToggleCruise();
    });

    // Quality selector
    document.getElementById('quality-selector').querySelectorAll('.sr-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('quality-selector').querySelectorAll('.sr-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.graphicsQuality = btn.dataset.quality;
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange(this.graphicsQuality);
      });
    });

    // Volume slider
    const volSlider = document.getElementById('slider-volume');
    const volVal = document.getElementById('val-volume');
    volSlider.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      volVal.textContent = `${vol}%`;
      if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(vol / 100);
    });

    // Modal action buttons
    document.getElementById('btn-close-settings').addEventListener('click', () => this.close());
    document.getElementById('btn-resume').addEventListener('click', () => this.close());
    document.getElementById('btn-reset-modal').addEventListener('click', () => {
      this.close();
      if (this.callbacks.onReset) this.callbacks.onReset();
    });

    // Close modal on click outside
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
