export class HUD {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.visible = true;
    this.speedUnit = 'kmh'; // 'kmh' or 'mph'

    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.innerHTML = `
      <!-- Top Action Bar -->
      <header class="hud-top-bar" id="hud-top-bar">
        <div class="hud-brand">
          <span class="sr-logo">s l o w &nbsp; r o a d s</span>
        </div>
        <div class="hud-actions">
          <button class="sr-btn sr-btn-icon" id="btn-camera" title="Change Camera (C)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span class="btn-label" id="label-camera">Chase</span>
          </button>

          <button class="sr-btn sr-btn-icon" id="btn-cruise" title="Cruise Control (Auto-Throttle)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="btn-label" id="label-cruise">Cruise: OFF</span>
          </button>

          <button class="sr-btn sr-btn-icon" id="btn-reset" title="Reset Vehicle to Road (R)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 2v6h6"></path>
              <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
              <path d="M21 22v-6h-6"></path>
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
            </svg>
            <span class="btn-label">Reset (R)</span>
          </button>

          <button class="sr-btn sr-btn-icon" id="btn-audio" title="Toggle Sound (M)">
            <svg id="icon-sound" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>

          <button class="sr-btn sr-btn-icon" id="btn-settings" title="Settings (Esc / ⚙)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <button class="sr-btn sr-btn-icon" id="btn-hide-ui" title="Toggle UI (H)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </header>

      <!-- Center Notification Toast -->
      <div class="hud-toast" id="hud-toast"></div>

      <!-- Bottom Speedometer & Controls -->
      <footer class="hud-bottom-bar" id="hud-bottom-bar">
        <div class="speedo-container">
          <div class="speedo-main">
            <span class="speedo-val" id="speedo-val">0</span>
            <span class="speedo-unit" id="speedo-unit">KM/H</span>
          </div>
          <div class="speedo-meta">
            <span class="speedo-gear" id="speedo-gear">P</span>
            <span class="speedo-surface" id="speedo-surface">ROAD</span>
          </div>
        </div>

        <div class="hud-quick-hints">
          <span class="hint-key">W/S</span> Accelerate / Brake &bull;
          <span class="hint-key">A/D</span> Steer &bull;
          <span class="hint-key">Space</span> Handbrake &bull;
          <span class="hint-key">C</span> Camera &bull;
          <span class="hint-key">R</span> Reset &bull;
          <span class="hint-key">H</span> Hide UI
        </div>
      </footer>

      <!-- Minimal Toggle Button when UI is hidden -->
      <button class="sr-btn sr-btn-float-show" id="btn-show-ui" title="Show UI (H)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    `;

    document.body.appendChild(this.container);

    // Cache elements
    this.elSpeedVal = document.getElementById('speedo-val');
    this.elSpeedUnit = document.getElementById('speedo-unit');
    this.elSpeedGear = document.getElementById('speedo-gear');
    this.elSpeedSurface = document.getElementById('speedo-surface');
    this.elCameraLabel = document.getElementById('label-camera');
    this.elCruiseLabel = document.getElementById('label-cruise');
    this.elToast = document.getElementById('hud-toast');
    this.elTopBar = document.getElementById('hud-top-bar');
    this.elBottomBar = document.getElementById('hud-bottom-bar');
    this.elBtnShowUI = document.getElementById('btn-show-ui');

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-camera').addEventListener('click', () => {
      if (this.callbacks.onToggleCamera) this.callbacks.onToggleCamera();
    });

    document.getElementById('btn-cruise').addEventListener('click', () => {
      if (this.callbacks.onToggleCruise) this.callbacks.onToggleCruise();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (this.callbacks.onReset) this.callbacks.onReset();
    });

    document.getElementById('btn-audio').addEventListener('click', () => {
      if (this.callbacks.onToggleAudio) this.callbacks.onToggleAudio();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      if (this.callbacks.onOpenSettings) this.callbacks.onOpenSettings();
    });

    document.getElementById('btn-hide-ui').addEventListener('click', () => {
      this.toggleVisibility();
    });

    this.elBtnShowUI.addEventListener('click', () => {
      this.toggleVisibility();
    });
  }

  toggleVisibility() {
    this.visible = !this.visible;
    if (this.visible) {
      this.elTopBar.style.display = 'flex';
      this.elBottomBar.style.display = 'flex';
      this.elBtnShowUI.style.display = 'none';
      this.showToast('UI Visible (Press H to hide)');
    } else {
      this.elTopBar.style.display = 'none';
      this.elBottomBar.style.display = 'none';
      this.elBtnShowUI.style.display = 'flex';
      this.showToast('Zen Mode (Press H to restore UI)');
    }
  }

  update(physics, cameraMode) {
    if (!this.visible) return;

    // Speed display
    const speed = this.speedUnit === 'kmh' ? physics.getSpeedKmH() : physics.getSpeedMph();
    this.elSpeedVal.textContent = speed;
    this.elSpeedUnit.textContent = this.speedUnit.toUpperCase();

    // Gear
    this.elSpeedGear.textContent = physics.gear;
    if (physics.gear === 'R') {
      this.elSpeedGear.classList.add('gear-reverse');
    } else {
      this.elSpeedGear.classList.remove('gear-reverse');
    }

    // Surface
    this.elSpeedSurface.textContent = physics.isOnRoad ? 'ROAD' : 'OFFROAD';
    if (!physics.isOnRoad) {
      this.elSpeedSurface.classList.add('surface-offroad');
    } else {
      this.elSpeedSurface.classList.remove('surface-offroad');
    }

    // Camera
    if (this.elCameraLabel && cameraMode) {
      this.elCameraLabel.textContent = cameraMode;
    }

    // Cruise control status
    if (this.elCruiseLabel) {
      this.elCruiseLabel.textContent = physics.cruiseControlEnabled
        ? `Cruise: ${Math.round(physics.cruiseSpeed * (this.speedUnit === 'kmh' ? 3.6 : 2.237))} ${this.speedUnit.toUpperCase()}`
        : 'Cruise: OFF';
    }
  }

  setAudioMuted(isMuted) {
    const icon = document.getElementById('icon-sound');
    if (!icon) return;
    if (isMuted) {
      icon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
    } else {
      icon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      `;
    }
  }

  showToast(message, duration = 2200) {
    if (!this.elToast) return;
    this.elToast.textContent = message;
    this.elToast.classList.add('show');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.elToast.classList.remove('show');
    }, duration);
  }
}
