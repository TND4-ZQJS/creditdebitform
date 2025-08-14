/* signature.js - SignaturePadModal (vanilla JS) */
(function () {
  // Expose the class as window.SignaturePadModal
  class SignaturePadModal {
    constructor(containerSelector, opts = {}) {
      this.container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
      if (!this.container) throw new Error('SignaturePadModal: container not found');

      // options + defaults
      this.options = Object.assign({
        storageKey: null,           // localStorage key; null => no storage
        label: 'Tap to sign',       // preview placeholder
        maxWidth: 720,              // modal max width
        heightRatio: 3.3,           // modal width / height
        lineWidth: 2.5,
        strokeStyle: '#000',
        saveText: 'Save',
        clearText: 'Clear',
        cancelText: 'Cancel'
      }, opts);

      // internal state
      this._dataURL = null;   // holds current signature data URL
      this._managedClass = 'sp-managed';

      // build preview area (uses container)
      this._buildPreview();

      // create shared modal (once)
      this._ensureSharedModal();

      // load stored (if any)
      if (this.options.storageKey) {
        const saved = localStorage.getItem(this.options.storageKey);
        if (saved) this._setDataURL(saved);
      }
    }

    /* ---------- preview UI ---------- */
    _buildPreview() {
      // mark element, replace content with preview box
      this.container.classList.add('sig-preview', this._managedClass);
      this.container.setAttribute('role', 'button');
      this.container.setAttribute('tabindex', '0');
      this.container.innerHTML = `<div class="sp-placeholder">${this.options.label}</div>`;
      this._placeholder = this.container.querySelector('.sp-placeholder');

      // click/keyboard → open modal
      this._onClick = () => this.open();
      this._onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.open(); } };
      this.container.addEventListener('click', this._onClick);
      this.container.addEventListener('keyup', this._onKey);
    }

    /* ---------- shared modal singleton ---------- */
    _ensureSharedModal() {
      if (SignaturePadModal._sharedModal) return;

      // create DOM
      const modal = document.createElement('div');
      modal.className = 'sp-modal';
      modal.innerHTML = `
        <div class="sp-modal-content" role="dialog" aria-modal="true">
          <canvas class="sp-canvas"></canvas>
          <div class="sp-actions">
            <button class="sp-save">${this.options.saveText}</button>
            <button class="sp-clear secondary">${this.options.clearText}</button>
            <button class="sp-cancel secondary">${this.options.cancelText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // store refs
      SignaturePadModal._sharedModal = modal;
      SignaturePadModal._modalCanvas = modal.querySelector('.sp-canvas');
      SignaturePadModal._modalCtx = SignaturePadModal._modalCanvas.getContext('2d');
      SignaturePadModal._btnSave = modal.querySelector('.sp-save');
      SignaturePadModal._btnClear = modal.querySelector('.sp-clear');
      SignaturePadModal._btnCancel = modal.querySelector('.sp-cancel');

      // drawing state
      SignaturePadModal._isDrawing = false;

      // attach shared event listeners (mouse + touch)
      const canvas = SignaturePadModal._modalCanvas;
      const ctx = SignaturePadModal._modalCtx;

      function getPos(e){
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }

      canvas.addEventListener('mousedown', (ev) => {
        SignaturePadModal._isDrawing = true;
        const p = getPos(ev);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      });
      canvas.addEventListener('mousemove', (ev) => {
        if (!SignaturePadModal._isDrawing) return;
        const p = getPos(ev);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });
      canvas.addEventListener('mouseup', () => { SignaturePadModal._isDrawing = false; });
      canvas.addEventListener('mouseleave', () => { SignaturePadModal._isDrawing = false; });

      // touch
      canvas.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        SignaturePadModal._isDrawing = true;
        const p = getPos(ev);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }, { passive: false });
      canvas.addEventListener('touchmove', (ev) => {
        ev.preventDefault();
        if (!SignaturePadModal._isDrawing) return;
        const p = getPos(ev);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }, { passive: false });
      canvas.addEventListener('touchend', () => { SignaturePadModal._isDrawing = false; });

      // button actions route to active instance
      SignaturePadModal._btnSave.addEventListener('click', () => {
        if (SignaturePadModal._activeInstance) SignaturePadModal._activeInstance._saveFromModal();
      });
      SignaturePadModal._btnClear.addEventListener('click', () => {
        // clear canvas + immediate remove storage + preview update
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (SignaturePadModal._activeInstance) SignaturePadModal._activeInstance._clearFromModal();
      });
      SignaturePadModal._btnCancel.addEventListener('click', () => {
        if (SignaturePadModal._activeInstance) SignaturePadModal._activeInstance.close();
      });

      // resize handler
      window.addEventListener('resize', () => {
        if (SignaturePadModal._activeInstance && SignaturePadModal._sharedModal.classList.contains('show')) {
          SignaturePadModal._resizeModalCanvas();
          // If the current instance has existing data, redraw it (preserve content)
          const inst = SignaturePadModal._activeInstance;
          if (inst._dataURL) {
            const img = new Image();
            img.onload = function () {
              // clear and draw scaled into css coords
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const cssW = parseFloat(canvas.style.width);
              const cssH = parseFloat(canvas.style.height);
              ctx.drawImage(img, 0, 0, cssW, cssH);
            };
            img.src = inst._dataURL;
          }
        }
      });
    }

    /* ---------- modal size + DPR handling ---------- */
    static _resizeModalCanvas() {
      const canvas = SignaturePadModal._modalCanvas;
      const inst = SignaturePadModal._activeInstance;
      const opts = inst ? inst.options : {};
      const maxW = opts.maxWidth || 720;
      const ratio = opts.heightRatio || 3.3;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = Math.min(window.innerWidth * 0.95, maxW);
      const cssHeight = Math.round(cssWidth / ratio);

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';

      const ctx = SignaturePadModal._modalCtx;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx.scale(dpr, dpr); // draw in CSS pixels
      // apply drawing defaults from active instance if available
      ctx.lineWidth = (inst && inst.options.lineWidth) ? inst.options.lineWidth : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = (inst && inst.options.strokeStyle) ? inst.options.strokeStyle : '#000';
    }

    /* ---------- open/close ---------- */
    open() {
      SignaturePadModal._activeInstance = this;
      SignaturePadModal._sharedModal.classList.add('show');
      SignaturePadModal._resizeModalCanvas();

      // clear canvas first
      SignaturePadModal._modalCtx.clearRect(0, 0, SignaturePadModal._modalCanvas.width, SignaturePadModal._modalCanvas.height);

      // if there is existing data, draw it
      if (this._dataURL) {
        const img = new Image();
        img.onload = () => {
          const canvas = SignaturePadModal._modalCanvas;
          const cssW = parseFloat(canvas.style.width);
          const cssH = parseFloat(canvas.style.height);
          SignaturePadModal._modalCtx.clearRect(0, 0, canvas.width, canvas.height);
          SignaturePadModal._modalCtx.drawImage(img, 0, 0, cssW, cssH);
        };
        img.src = this._dataURL;
      }
    }

    close() {
      SignaturePadModal._sharedModal.classList.remove('show');
      SignaturePadModal._activeInstance = null;
    }

    /* ---------- save / clear handlers (modal routed) ---------- */
    _saveFromModal() {
      // produce a dataURL of the visible css size
      const dataURL = SignaturePadModal._modalCanvas.toDataURL('image/png');
      this._setDataURL(dataURL);
      if (this.options.storageKey) localStorage.setItem(this.options.storageKey, dataURL);
      this.close();
    }

    _clearFromModal() {
      // remove stored signature and update preview
      if (this.options.storageKey) localStorage.removeItem(this.options.storageKey);
      this._setDataURL(null);
      // modal remains open with cleared canvas
    }

    /* ---------- data & preview ---------- */
    _setDataURL(dataURL) {
      this._dataURL = dataURL;
      if (dataURL) {
        this.container.innerHTML = `<img src="${dataURL}" alt="signature">`;
      } else {
        this.container.innerHTML = `<div class="sp-placeholder">${this.options.label}</div>`;
      }
    }

    // clear externally (for your 'Clear Signature' buttons)
    clear() {
      if (this.options.storageKey) localStorage.removeItem(this.options.storageKey);
      this._setDataURL(null);
    }

    // get current dataURL (or null)
    getDataURL() {
      return this._dataURL;
    }

    // load programmatically
    load(dataURL) {
      if (!dataURL) return this.clear();
      this._setDataURL(dataURL);
      if (this.options.storageKey) localStorage.setItem(this.options.storageKey, dataURL);
    }

    // teardown if needed
    destroy() {
      this.container.removeEventListener('click', this._onClick);
      this.container.removeEventListener('keyup', this._onKey);
      // remove preview content
      this.container.innerHTML = '';
      // if it's the active instance, close modal
      if (SignaturePadModal._activeInstance === this) {
        this.close();
      }
    }
  }

  // static refs
  SignaturePadModal._sharedModal = null;
  SignaturePadModal._modalCanvas = null;
  SignaturePadModal._modalCtx = null;
  SignaturePadModal._activeInstance = null;
  SignaturePadModal._btnSave = null;
  SignaturePadModal._btnClear = null;
  SignaturePadModal._btnCancel = null;

  // attach to window
  window.SignaturePadModal = SignaturePadModal;
})();
