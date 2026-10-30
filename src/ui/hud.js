/**
 * Ultra-Minimalist HUD inspired directly by Slow Roads
 * Non-intrusive, elegant typography and refined glassmorphic telemetry
 */
export class HUD {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.visible = true;
    this.speedUnit = 'kmh';

    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.innerHTML = `
      <!-- Minimalist Top Bar -->
      <header class="sr-hud-top" id="hud-top-bar">
        <div class="sr-hud-brand">
          <span class="sr-logo-text">slow roads</span>
        </div>

        <nav class="sr-hud-nav">
          <button class="sr-nav-btn" id="btn-camera" title="Change Camera (C)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span class="sr-nav-label" id="label-camera">Chase</span>
          </button>

          <button class="sr-nav-btn" id="btn-cruise" title="Cruise Control (Toggle auto-speed)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="sr-nav-label" id="label-cruise">Cruise</span>
          </button>

          <button class="sr-nav-btn" id="btn-reset" title="Reset Vehicle to Road (R)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 2v6h6"></path>
              <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
              <path d="M21 22v-6h-6"></path>
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
            </svg>
            <span class="sr-nav-label">Reset</span>
          </button>

          <button class="sr-nav-btn sr-nav-btn-icon" id="btn-audio" title="Toggle Sound (M)">
            <svg id="icon-sound" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>

          <button class="sr-nav-btn sr-nav-btn-icon" id="btn-settings" title="Settings & Pause (Esc)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <button class="sr-nav-btn sr-nav-btn-icon" id="btn-hide-ui" title="Zen Screenshot Mode (H)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </nav>
      </header>

      <!-- Center Minimal Toast -->
      <div class="sr-toast" id="hud-toast"></div>

      <!-- Bottom Bar: Minimal Speedometer + Subtle Hints -->
      <footer class="sr-hud-bottom" id="hud-bottom-bar">
        <div class="sr-speedometer">
          <div class="sr-speed-digits">
            <span class="sr-speed-num" id="speedo-val">0</span>
            <span class="sr-speed-unit" id="speedo-unit">km/h</span>
          </div>
          <div class="sr-speed-status">
            <span class="sr-gear-tag" id="speedo-gear">P</span>
            <span class="sr-surface-tag" id="speedo-surface">ROAD</span>
          </div>
        </div>

        <div class="sr-footer-hints">
          <span><kbd>W</kbd><kbd>S</kbd> drive</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>A</kbd><kbd>D</kbd> steer</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>Space</kbd> drift</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>C</kbd> cam</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>R</kbd> reset</span>
          <span class="hint-dot">&bull;</span>
          <span><kbd>H</kbd> zen</span>
        </div>
      </footer>

      <!-- Floating Unhide Button when Zen Mode is active -->
      <button class="sr-unhide-btn" id="btn-show-ui" title="Show UI (H)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    `;

    document.body.appendChild(this.container);

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
      this.showToast('HUD visible (Press H to hide)');
    } else {
      this.elTopBar.style.display = 'none';
      this.elBottomBar.style.display = 'none';
      this.elBtnShowUI.style.display = 'flex';
      this.showToast('Zen mode active');
    }
  }

  update(physics, cameraMode) {
    if (!this.visible) return;

    const speed = this.speedUnit === 'kmh' ? physics.getSpeedKmH() : physics.getSpeedMph();
    this.elSpeedVal.textContent = speed;
    this.elSpeedUnit.textContent = this.speedUnit;

    this.elSpeedGear.textContent = physics.gear;
    if (physics.gear === 'R') {
      this.elSpeedGear.classList.add('reverse');
    } else {
      this.elSpeedGear.classList.remove('reverse');
    }

    this.elSpeedSurface.textContent = physics.isOnRoad ? 'ROAD' : 'OFFROAD';
    if (!physics.isOnRoad) {
      this.elSpeedSurface.classList.add('offroad');
    } else {
      this.elSpeedSurface.classList.remove('offroad');
    }

    if (this.elCameraLabel && cameraMode) {
      this.elCameraLabel.textContent = cameraMode;
    }

    if (this.elCruiseLabel) {
      this.elCruiseLabel.textContent = physics.cruiseControlEnabled
        ? `Cruise: ${Math.round(physics.cruiseSpeed * (this.speedUnit === 'kmh' ? 3.6 : 2.237))}`
        : 'Cruise';
      if (physics.cruiseControlEnabled) {
        document.getElementById('btn-cruise').classList.add('active');
      } else {
        document.getElementById('btn-cruise').classList.remove('active');
      }
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

  showToast(message, duration = 2000) {
    if (!this.elToast) return;
    this.elToast.textContent = message;
    this.elToast.classList.add('visible');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.elToast.classList.remove('visible');
    }, duration);
  }
}
