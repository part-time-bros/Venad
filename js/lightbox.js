/* ============================================================
   VENAD HOUSE — lightbox.js
   Lightweight image lightbox.

   Usage: Add data-lightbox-group="groupname" to any
   clickable image wrapper. Images in the same group
   are navigable together. Groups are independent.

   Features:
   - Prev / next navigation
   - Close button + backdrop click + Escape key
   - Left/right arrow key navigation
   - Touch swipe (mobile/tablet)
   - Lazy loads full-res src from data-lightbox-src
     (falls back to img.src if not provided)
   ============================================================ */

(function () {

  /* ── State ───────────────────────────────────────────────── */
  let groups    = {};   // { groupName: [{ src, alt }] }
  let current   = { group: null, index: 0 };
  let overlay   = null;
  let touchStartX = 0;

  /* ── Build overlay (once) ────────────────────────────────── */
  function buildOverlay() {
    if (document.getElementById('lb-overlay')) return;

    overlay = document.createElement('div');
    overlay.id        = 'lb-overlay';
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');

    overlay.innerHTML = `
      <div class="lb-backdrop" id="lb-backdrop"></div>

      <button class="lb-close" id="lb-close" aria-label="Close image viewer">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <line x1="2" y1="2" x2="16" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="2" x2="2" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <button class="lb-nav lb-prev" id="lb-prev" aria-label="Previous image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polyline points="15,18 9,12 15,6" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="lb-stage" id="lb-stage">
        <img class="lb-img" id="lb-img" src="" alt="">
      </div>

      <button class="lb-nav lb-next" id="lb-next" aria-label="Next image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polyline points="9,18 15,12 9,6" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="lb-counter" id="lb-counter" aria-live="polite"></div>
    `;

    document.body.appendChild(overlay);

    /* Wire events */
    document.getElementById('lb-close').addEventListener('click', close);
    document.getElementById('lb-backdrop').addEventListener('click', close);
    document.getElementById('lb-prev').addEventListener('click', prev);
    document.getElementById('lb-next').addEventListener('click', next);

    /* Keyboard */
    document.addEventListener('keydown', onKeydown);

    /* Touch swipe */
    overlay.addEventListener('touchstart', onTouchStart, { passive: true });
    overlay.addEventListener('touchend',   onTouchEnd,   { passive: true });
  }

  /* ── Scan page for lightbox images ──────────────────────── */
  function scanImages() {
    groups = {};

    document.querySelectorAll('[data-lightbox-group]').forEach(wrapper => {
      const group = wrapper.dataset.lightboxGroup;
      if (!groups[group]) groups[group] = [];

      const img = wrapper.querySelector('img');
      if (!img) return;

      const src = wrapper.dataset.lightboxSrc || img.src;
      const alt = img.alt || '';

      const idx = groups[group].length;
      groups[group].push({ src, alt });

      /* Make wrapper interactive */
      wrapper.style.cursor = 'zoom-in';
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute('aria-label', `View image: ${alt || 'Room photo'}`);

      const fn = () => open(group, idx);
      wrapper.addEventListener('click', fn);
      wrapper.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
      });
    });
  }

  /* ── Open ────────────────────────────────────────────────── */
  function open(group, index) {
    buildOverlay();
    current.group = group;
    current.index = index;
    show();

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const closeBtn = document.getElementById('lb-close');
      if (closeBtn) closeBtn.focus();
    }, 80);
  }

  /* ── Show current image ──────────────────────────────────── */
  function show() {
    const items = groups[current.group] || [];
    if (!items.length) return;

    const item  = items[current.index];
    const img   = document.getElementById('lb-img');
    const ctr   = document.getElementById('lb-counter');
    const prev  = document.getElementById('lb-prev');
    const next  = document.getElementById('lb-next');

    /* Fade transition */
    img.style.opacity = '0';
    img.src = item.src;
    img.alt = item.alt;
    img.onload = () => { img.style.opacity = '1'; };
    /* If already cached, onload may not fire */
    if (img.complete) img.style.opacity = '1';

    /* Counter */
    ctr.textContent = `${current.index + 1} / ${items.length}`;

    /* Show/hide nav based on group size */
    const single = items.length <= 1;
    prev.style.display = single ? 'none' : '';
    next.style.display = single ? 'none' : '';

    /* Dim nav at ends */
    prev.style.opacity = current.index === 0               ? '0.35' : '1';
    next.style.opacity = current.index === items.length - 1 ? '0.35' : '1';
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function prev() {
    const items = groups[current.group] || [];
    if (current.index > 0) {
      current.index--;
      show();
    }
  }

  function next() {
    const items = groups[current.group] || [];
    if (current.index < items.length - 1) {
      current.index++;
      show();
    }
  }

  /* ── Close ───────────────────────────────────────────────── */
  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    current.group = null;
  }

  /* ── Keyboard ────────────────────────────────────────────── */
  function onKeydown(e) {
    if (!overlay || !overlay.classList.contains('open')) return;
    if (e.key === 'Escape')     { e.preventDefault(); close(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  }

  /* ── Touch swipe ─────────────────────────────────────────── */
  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) < 40) return; /* Ignore small movements */
    if (dx < 0) next();
    else         prev();
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    buildOverlay();
    scanImages();
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
