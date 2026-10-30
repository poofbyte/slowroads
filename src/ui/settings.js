import { VEHICLES, VEHICLE_CATEGORIES, COLOR_PALETTES, WHEEL_STYLES } from '../vehicle/vehicles-data.js';
import { ENVIRONMENTS } from '../world/environments-data.js';
import { TIMES_OF_DAY, WEATHER_TYPES } from '../world/environment.js';

/**
 * Universal Garage, Environment & Simulation Settings Interface
 * Clean glassmorphic design featuring vehicle selection, paint customization,
 * environments, dynamic weather, time-of-day cycle, and hardware optimization
 */
export class SettingsModal {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isOpen = false;

    this.activeTab = 'garage';
    this.selectedVehicleId = 'model_3';
    this.selectedCategory = 'all';
    this.selectedColor = null;
    this.selectedWheelStyle = 'aero';

    this.selectedEnvironment = 'mountains';
    this.selectedWeather = 'clear';
    this.selectedTimeOfDay = 'morning';
    this.autoDayNightCycle = false;

    this.steeringSens = 1.0;
    this.speedUnit = 'kmh';
    this.graphicsQuality = 'medium';

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-overlay';
    this.overlay.className = 'sr-dialog-overlay hidden';

    this.overlay.innerHTML = `
      <div class="sr-dialog-panel sr-garage-panel">
        <header class="sr-dialog-head">
          <div class="sr-dialog-branding">
            <span class="sr-logo-text">slow roads</span>
            <span class="sr-tagline">Advanced Driving Simulator</span>
          </div>
          <button class="sr-dialog-close" id="btn-close-settings" title="Close (Esc)">&times;</button>
        </header>

        <!-- Navigation Tabs -->
        <nav class="sr-tabs-bar">
          <button class="sr-tab active" data-tab="garage">Vehicles & Garage</button>
          <button class="sr-tab" data-tab="environment">Environment</button>
          <button class="sr-tab" data-tab="weather">Weather</button>
          <button class="sr-tab" data-tab="time">Time of Day</button>
          <button class="sr-tab" data-tab="controls">Controls & Physics</button>
          <button class="sr-tab" data-tab="graphics">Graphics Quality</button>
        </nav>

        <div class="sr-dialog-body">
          <!-- 1. GARAGE & VEHICLE SELECTION TAB -->
          <div class="sr-tab-pane active" id="tab-pane-garage">
            <!-- Category Filter Pills -->
            <div class="sr-category-pills">
              <button class="sr-pill active" data-cat="all">All Vehicles</button>
              <button class="sr-pill" data-cat="electric">Electric Cars</button>
              <button class="sr-pill" data-cat="cars">Cars & SUVs</button>
              <button class="sr-pill" data-cat="commercial">Commercial & Vans</button>
              <button class="sr-pill" data-cat="twowheeler">Two-Wheelers</button>
            </div>

            <!-- Vehicle Cards Grid -->
            <div class="sr-vehicle-grid" id="vehicle-card-grid"></div>

            <!-- Customization Bar: Paint & Wheels -->
            <div class="sr-customization-section">
              <div class="sr-custom-block">
                <span class="sr-custom-title">Vehicle Paint Finish</span>
                <div class="sr-color-swatches" id="color-swatches-grid"></div>
              </div>

              <div class="sr-custom-block">
                <span class="sr-custom-title">Wheel Stance & Design</span>
                <div class="sr-pill-group" id="wheel-style-selector"></div>
              </div>
            </div>
          </div>

          <!-- 2. ENVIRONMENT TAB -->
          <div class="sr-tab-pane" id="tab-pane-environment">
            <div class="sr-env-grid" id="env-card-grid"></div>
          </div>

          <!-- 3. WEATHER TAB -->
          <div class="sr-tab-pane" id="tab-pane-weather">
            <span class="sr-section-title">Atmospheric Conditions</span>
            <div class="sr-weather-grid" id="weather-card-grid"></div>
          </div>

          <!-- 4. TIME OF DAY TAB -->
          <div class="sr-tab-pane" id="tab-pane-time">
            <div class="sr-field-row sr-highlight-row">
              <span class="sr-field-label">24-Hour Automatic Day-Night Cycle</span>
              <button class="sr-pill" id="btn-toggle-daynight-cycle">Enable Auto-Cycle</button>
            </div>
            <span class="sr-section-title" style="margin-top:1.2rem;">Fixed Time of Day</span>
            <div class="sr-time-grid" id="time-card-grid"></div>
          </div>

          <!-- 5. CONTROLS & DRIVING SETTINGS TAB -->
          <div class="sr-tab-pane" id="tab-pane-controls">
            <section class="sr-section">
              <span class="sr-section-title">Vehicle Handling & Assistance</span>

              <div class="sr-field-row">
                <span class="sr-field-label">Steering Sensitivity</span>
                <div class="sr-slider-wrap">
                  <input type="range" id="slider-steer-sens" min="0.5" max="2.2" step="0.1" value="1.0" class="sr-range">
                  <span class="sr-range-val" id="val-steer-sens">1.0x</span>
                </div>
              </div>

              <div class="sr-field-row">
                <span class="sr-field-label">Speedometer Units</span>
                <div class="sr-pill-group sr-pill-group-sm">
                  <button class="sr-pill active" id="btn-unit-kmh">km/h</button>
                  <button class="sr-pill" id="btn-unit-mph">mph</button>
                </div>
              </div>

              <div class="sr-field-row">
                <span class="sr-field-label">Forward Tesla Autopilot (Lane Centering)</span>
                <button class="sr-pill" id="btn-toggle-autopilot-modal">Toggle Forward (T)</button>
              </div>

              <div class="sr-field-row">
                <span class="sr-field-label">Reverse Autopilot (Backward Highway Navigation)</span>
                <button class="sr-pill" id="btn-toggle-rev-autopilot-modal">Toggle Reverse (Y)</button>
              </div>

              <div class="sr-field-row">
                <span class="sr-field-label">Acoustics Volume</span>
                <div class="sr-slider-wrap">
                  <input type="range" id="slider-volume" min="0" max="100" step="5" value="70" class="sr-range">
                  <span class="sr-range-val" id="val-volume">70%</span>
                </div>
              </div>
            </section>

            <section class="sr-section sr-controls-section">
              <span class="sr-section-title">Complete Keyboard Controls</span>
              <div class="sr-guide-grid">
                <div class="guide-item"><kbd>W</kbd> or <kbd>&uarr;</kbd><span>Accelerate forward (or reverse brake)</span></div>
                <div class="guide-item"><kbd>S</kbd> or <kbd>&darr;</kbd><span>Brake (or hold to reverse)</span></div>
                <div class="guide-item"><kbd>A</kbd> or <kbd>&larr;</kbd><span>Steer left</span></div>
                <div class="guide-item"><kbd>D</kbd> or <kbd>&rarr;</kbd><span>Steer right</span></div>
                <div class="guide-item"><kbd>T</kbd><span>Forward Autopilot (Lane centering)</span></div>
                <div class="guide-item"><kbd>Y</kbd><span>Reverse Autopilot (Reverse navigation)</span></div>
                <div class="guide-item"><kbd>G</kbd><span>Open Garage & Vehicle Selector</span></div>
                <div class="guide-item"><kbd>Space</kbd><span>Handbrake / drift slide</span></div>
                <div class="guide-item"><kbd>C</kbd><span>Cycle camera view (Chase, Close, Cockpit)</span></div>
                <div class="guide-item"><kbd>R</kbd><span>Reset vehicle to nearest road</span></div>
                <div class="guide-item"><kbd>H</kbd><span>Zen screenshot mode (hide HUD)</span></div>
                <div class="guide-item"><kbd>M</kbd><span>Mute / unmute audio synthesizer</span></div>
                <div class="guide-item"><kbd>Esc</kbd><span>Pause / Settings menu</span></div>
              </div>
            </section>
          </div>

          <!-- 6. GRAPHICS & HARDWARE OPTIMIZATION TAB -->
          <div class="sr-tab-pane" id="tab-pane-graphics">
            <div class="sr-hardware-badge">
              <span>Target Hardware: Intel Core i5-8250U • Intel UHD Graphics 620 • 8 GB RAM</span>
            </div>

            <section class="sr-section">
              <span class="sr-section-title">Graphics Performance Presets</span>
              <div class="sr-pill-group" id="quality-selector">
                <button class="sr-pill" data-quality="low">Low (Maximum 60 FPS)</button>
                <button class="sr-pill active" data-quality="medium">Medium (Balanced)</button>
                <button class="sr-pill" data-quality="high">High (Full Shadows)</button>
              </div>
            </section>
          </div>
        </div>

        <footer class="sr-dialog-foot">
          <button class="sr-btn-flat" id="btn-reset-modal">Reset to Road (R)</button>
          <button class="sr-btn-action" id="btn-resume">Resume Driving</button>
        </footer>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Initial Start Screen Overlay
    this.startScreen = document.createElement('div');
    this.startScreen.id = 'start-screen';
    this.startScreen.className = 'sr-intro-overlay';
    this.startScreen.innerHTML = `
      <div class="sr-intro-panel">
        <h1 class="sr-intro-title">slow roads</h1>
        <p class="sr-intro-desc">Advanced Procedural Driving Simulator</p>

        <div class="sr-intro-presets">
          <span class="sr-intro-label">Select Starting Environment</span>
          <div class="sr-pill-group" id="start-env-selector">
            <button class="sr-pill active" data-env="mountains">Alpine Pass</button>
            <button class="sr-pill" data-env="forest">Countryside</button>
            <button class="sr-pill" data-env="snow">Winter Peaks</button>
            <button class="sr-pill" data-env="desert">Red Desert</button>
            <button class="sr-pill" data-env="coast">Pacific Coast</button>
          </div>
        </div>

        <button class="sr-intro-btn" id="btn-start-driving">drive</button>
        <span class="sr-intro-hint">Click or press any key to enter</span>
      </div>
    `;

    document.body.appendChild(this.startScreen);

    this.renderVehiclesList();
    this.renderColorSwatches();
    this.renderWheelStyles();
    this.renderEnvironmentsList();
    this.renderWeatherList();
    this.renderTimeList();
  }

  renderVehiclesList() {
    const grid = document.getElementById('vehicle-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = Object.values(VEHICLES);
    const filtered = (this.selectedCategory === 'all')
      ? list
      : list.filter(v => v.category === this.selectedCategory);

    for (const v of filtered) {
      const card = document.createElement('div');
      card.className = `sr-card sr-veh-card ${v.id === this.selectedVehicleId ? 'selected' : ''}`;
      card.dataset.id = v.id;

      card.innerHTML = `
        <div class="sr-card-head">
          <span class="sr-card-title">${v.name}</span>
          <span class="sr-card-badge">${VEHICLE_CATEGORIES[v.category].name}</span>
        </div>
        <p class="sr-card-desc">${v.tagline}</p>
        <div class="sr-specs-row">
          <div class="sr-spec-item"><span class="spec-label">Top Speed</span><span class="spec-val">${v.specs.topSpeed} km/h</span></div>
          <div class="sr-spec-item"><span class="spec-label">0-100</span><span class="spec-val">${v.specs.accel0to100}s</span></div>
          <div class="sr-spec-item"><span class="spec-label">Power</span><span class="spec-val">${v.specs.power} HP</span></div>
          <div class="sr-spec-item"><span class="spec-label">Weight</span><span class="spec-val">${v.specs.weight} kg</span></div>
        </div>
        <button class="sr-btn-card-select">${v.id === this.selectedVehicleId ? 'Selected' : 'Select Vehicle'}</button>
      `;

      card.addEventListener('click', () => {
        this.selectVehicle(v.id);
      });

      grid.appendChild(card);
    }
  }

  renderColorSwatches() {
    const grid = document.getElementById('color-swatches-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const c of COLOR_PALETTES) {
      const swatch = document.createElement('button');
      swatch.className = `sr-color-dot ${c.hex === this.selectedColor ? 'active' : ''}`;
      swatch.style.backgroundColor = `#${c.hex.toString(16).padStart(6, '0')}`;
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        this.selectColor(c.hex);
      });
      grid.appendChild(swatch);
    }
  }

  renderWheelStyles() {
    const group = document.getElementById('wheel-style-selector');
    if (!group) return;
    group.innerHTML = '';

    for (const w of WHEEL_STYLES) {
      const btn = document.createElement('button');
      btn.className = `sr-pill ${w.id === this.selectedWheelStyle ? 'active' : ''}`;
      btn.textContent = w.name;
      btn.addEventListener('click', () => {
        this.selectedWheelStyle = w.id;
        group.querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onWheelStyleChange) this.callbacks.onWheelStyleChange(w.id);
      });
      group.appendChild(btn);
    }
  }

  renderEnvironmentsList() {
    const grid = document.getElementById('env-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const env of Object.values(ENVIRONMENTS)) {
      const card = document.createElement('div');
      card.className = `sr-card sr-env-card ${env.id === this.selectedEnvironment ? 'selected' : ''}`;
      card.dataset.id = env.id;

      card.innerHTML = `
        <div class="sr-card-head">
          <span class="sr-card-title">${env.name}</span>
        </div>
        <p class="sr-card-desc">${env.desc}</p>
        <button class="sr-btn-card-select">${env.id === this.selectedEnvironment ? 'Active Environment' : 'Load Environment'}</button>
      `;

      card.addEventListener('click', () => {
        this.selectEnvironment(env.id);
      });

      grid.appendChild(card);
    }
  }

  renderWeatherList() {
    const grid = document.getElementById('weather-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const w of Object.values(WEATHER_TYPES)) {
      const card = document.createElement('div');
      card.className = `sr-card sr-weather-card ${w.id === this.selectedWeather ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="sr-card-title">${w.name}</span>
        <button class="sr-btn-card-select">${w.id === this.selectedWeather ? 'Active' : 'Apply'}</button>
      `;
      card.addEventListener('click', () => {
        this.selectWeather(w.id);
      });
      grid.appendChild(card);
    }
  }

  renderTimeList() {
    const grid = document.getElementById('time-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const tod of Object.values(TIMES_OF_DAY)) {
      const card = document.createElement('div');
      card.className = `sr-card sr-time-card ${tod.id === this.selectedTimeOfDay ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="sr-card-title">${tod.name}</span>
        <button class="sr-btn-card-select">${tod.id === this.selectedTimeOfDay ? 'Active' : 'Apply'}</button>
      `;
      card.addEventListener('click', () => {
        this.selectTimeOfDay(tod.id);
      });
      grid.appendChild(card);
    }
  }

  selectVehicle(vehicleId) {
    this.selectedVehicleId = vehicleId;
    this.renderVehiclesList();
    if (this.callbacks.onVehicleChange) {
      this.callbacks.onVehicleChange(vehicleId, this.selectedColor, this.selectedWheelStyle);
    }
  }

  selectColor(colorHex) {
    this.selectedColor = colorHex;
    this.renderColorSwatches();
    if (this.callbacks.onColorChange) {
      this.callbacks.onColorChange(colorHex);
    }
  }

  selectEnvironment(envId) {
    this.selectedEnvironment = envId;
    this.renderEnvironmentsList();
    if (this.callbacks.onEnvironmentChange) {
      this.callbacks.onEnvironmentChange(envId);
    }
  }

  selectWeather(weatherId) {
    this.selectedWeather = weatherId;
    this.renderWeatherList();
    if (this.callbacks.onWeatherChange) {
      this.callbacks.onWeatherChange(weatherId);
    }
  }

  selectTimeOfDay(timeId) {
    this.selectedTimeOfDay = timeId;
    this.autoDayNightCycle = false;
    const btnAuto = document.getElementById('btn-toggle-daynight-cycle');
    if (btnAuto) {
      btnAuto.classList.remove('active');
      btnAuto.textContent = 'Enable Auto-Cycle';
    }
    this.renderTimeList();
    if (this.callbacks.onTimeOfDayChange) {
      this.callbacks.onTimeOfDayChange(timeId, false);
    }
  }

  bindEvents() {
    // Tabs Navigation
    document.querySelectorAll('.sr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sr-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sr-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.getElementById(`tab-pane-${tab.dataset.tab}`);
        if (pane) pane.classList.add('active');
      });
    });

    // Category Filter Pills
    document.querySelectorAll('.sr-category-pills .sr-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.sr-category-pills .sr-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedCategory = pill.dataset.cat;
        this.renderVehiclesList();
      });
    });

    // Auto Day-Night Cycle Toggle
    const btnAutoCycle = document.getElementById('btn-toggle-daynight-cycle');
    if (btnAutoCycle) {
      btnAutoCycle.addEventListener('click', () => {
        this.autoDayNightCycle = !this.autoDayNightCycle;
        if (this.autoDayNightCycle) {
          btnAutoCycle.classList.add('active');
          btnAutoCycle.textContent = 'Auto-Cycle Active';
        } else {
          btnAutoCycle.classList.remove('active');
          btnAutoCycle.textContent = 'Enable Auto-Cycle';
        }
        if (this.callbacks.onToggleAutoDayNight) {
          this.callbacks.onToggleAutoDayNight(this.autoDayNightCycle);
        }
      });
    }

    // Steering Sensitivity Slider
    const steerSlider = document.getElementById('slider-steer-sens');
    const steerVal = document.getElementById('val-steer-sens');
    if (steerSlider) {
      steerSlider.addEventListener('input', (e) => {
        this.steeringSens = parseFloat(e.target.value);
        steerVal.textContent = `${this.steeringSens.toFixed(1)}x`;
        if (this.callbacks.onSteeringChange) this.callbacks.onSteeringChange(this.steeringSens);
      });
    }

    // Speed Units
    const btnKmh = document.getElementById('btn-unit-kmh');
    const btnMph = document.getElementById('btn-unit-mph');
    if (btnKmh && btnMph) {
      btnKmh.addEventListener('click', () => {
        btnKmh.classList.add('active');
        btnMph.classList.remove('active');
        this.speedUnit = 'kmh';
        if (this.callbacks.onUnitChange) this.callbacks.onUnitChange('kmh');
      });
      btnMph.addEventListener('click', () => {
        btnMph.classList.add('active');
        btnKmh.classList.remove('active');
        this.speedUnit = 'mph';
        if (this.callbacks.onUnitChange) this.callbacks.onUnitChange('mph');
      });
    }

    // Autopilot Modal Buttons
    const btnAutoModal = document.getElementById('btn-toggle-autopilot-modal');
    if (btnAutoModal) {
      btnAutoModal.addEventListener('click', () => {
        if (this.callbacks.onToggleAutopilot) {
          const enabled = this.callbacks.onToggleAutopilot();
          this.syncAutopilotButtons(enabled, false);
        }
      });
    }

    const btnRevAutoModal = document.getElementById('btn-toggle-rev-autopilot-modal');
    if (btnRevAutoModal) {
      btnRevAutoModal.addEventListener('click', () => {
        if (this.callbacks.onToggleReverseAutopilot) {
          const enabled = this.callbacks.onToggleReverseAutopilot();
          this.syncAutopilotButtons(false, enabled);
        }
      });
    }

    // Quality selector
    document.getElementById('quality-selector').querySelectorAll('.sr-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('quality-selector').querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.graphicsQuality = btn.dataset.quality;
        if (this.callbacks.onQualityChange) this.callbacks.onQualityChange(this.graphicsQuality);
      });
    });

    // Volume Slider
    const volSlider = document.getElementById('slider-volume');
    const volVal = document.getElementById('val-volume');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value, 10);
        volVal.textContent = `${vol}%`;
        if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(vol / 100);
      });
    }

    // Dialog buttons
    document.getElementById('btn-close-settings').addEventListener('click', () => this.close());
    document.getElementById('btn-resume').addEventListener('click', () => this.close());
    document.getElementById('btn-reset-modal').addEventListener('click', () => {
      this.close();
      if (this.callbacks.onReset) this.callbacks.onReset();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Start Screen Driving Entry
    const startBtn = document.getElementById('btn-start-driving');
    if (startBtn) {
      const triggerStart = () => {
        this.startScreen.classList.add('sr-fade-out');
        setTimeout(() => this.startScreen.remove(), 400);
        if (this.callbacks.onStart) {
          this.callbacks.onStart(this.selectedEnvironment);
        }
      };

      startBtn.addEventListener('click', triggerStart);
      window.addEventListener('keydown', (e) => {
        if (document.body.contains(this.startScreen) && (e.code === 'Enter' || e.code === 'Space')) {
          triggerStart();
        }
      });
    }

    // Start Screen Env Selector
    const startEnvGroup = document.getElementById('start-env-selector');
    if (startEnvGroup) {
      startEnvGroup.querySelectorAll('.sr-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          startEnvGroup.querySelectorAll('.sr-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedEnvironment = btn.dataset.env;
        });
      });
    }
  }

  syncAutopilotButtons(fwdEnabled, revEnabled) {
    const btnFwd = document.getElementById('btn-toggle-autopilot-modal');
    const btnRev = document.getElementById('btn-toggle-rev-autopilot-modal');
    if (btnFwd) {
      if (fwdEnabled) {
        btnFwd.classList.add('active');
        btnFwd.textContent = 'Engaged Forward (T)';
      } else {
        btnFwd.classList.remove('active');
        btnFwd.textContent = 'Toggle Forward (T)';
      }
    }
    if (btnRev) {
      if (revEnabled) {
        btnRev.classList.add('active');
        btnRev.textContent = 'Engaged Reverse (Y)';
      } else {
        btnRev.classList.remove('active');
        btnRev.textContent = 'Toggle Reverse (Y)';
      }
    }
  }

  open(tabName = null) {
    this.isOpen = true;
    this.overlay.classList.remove('hidden');

    if (tabName) {
      const tab = document.querySelector(`.sr-tab[data-tab="${tabName}"]`);
      if (tab) tab.click();
    }

    if (this.callbacks.getAutopilotStates) {
      const states = this.callbacks.getAutopilotStates();
      this.syncAutopilotButtons(states.forward, states.reverse);
    }
    if (this.callbacks.onPause) this.callbacks.onPause(true);
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    if (this.callbacks.onPause) this.callbacks.onPause(false);
  }

  toggle(tabName = null) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(tabName);
    }
  }
}
