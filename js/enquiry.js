/* ============================================================
   VENAD HOUSE — enquiry.js
   3-step enquiry drawer.

   Step 1: Room selection + custom calendar date picker + guests + name
   Step 2: Add experiences (optional checklist)
   Step 3: Review summary + send via WhatsApp

   Depends on: config.js (VENAD.rooms, VENAD.experiences, VENAD.whatsapp)
   Public API: window.openEnquiry(preselectedRoomId)
   ============================================================ */

(function () {

  /* ── State ───────────────────────────────────────────────── */
  /* checkIn / checkOut are Date objects or null — never strings */
  const state = {
    step:        1,
    roomId:      null,
    checkIn:     null,
    checkOut:    null,
    calMonth:    null,   // first day of currently-viewed month
    guests:      2,      // always a number
    guestName:   '',
    experiences: new Set(),
    note:        '',
  };

  let backdrop, drawer;

  /* ── Date helpers ────────────────────────────────────────── */

  function dayOnly(d) {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  }

  function today() { return dayOnly(new Date()); }

  function isSameDay(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  function isBeforeDay(a, b) { return dayOnly(a) < dayOnly(b); }

  function isInRange(d, start, end) {
    if (!start || !end) return false;
    const t = dayOnly(d).getTime();
    return t > dayOnly(start).getTime() && t < dayOnly(end).getTime();
  }

  function nightCount() {
    if (!state.checkIn || !state.checkOut) return 0;
    const diff = dayOnly(state.checkOut) - dayOnly(state.checkIn);
    return diff > 0 ? Math.round(diff / 86400000) : 0;
  }

  function dateToDisplay(d) {
    if (!d) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function dateToLong(d) {
    if (!d) return 'TBD';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  /* ── Calendar renderer ───────────────────────────────────── */
  function renderCalendar() {
    const wrap = drawer.querySelector('#eq-cal-wrap');
    if (!wrap) return;

    const cm          = state.calMonth;
    const year        = cm.getFullYear();
    const mon         = cm.getMonth();
    const firstDay    = new Date(year, mon, 1).getDay();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const todayDate   = today();
    const atMinMonth  = (mon === todayDate.getMonth() && year === todayDate.getFullYear());

    let cells = '';
    for (let i = 0; i < firstDay; i++) {
      cells += `<div class="eq-cal-cell eq-cal-empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cd     = new Date(year, mon, day);
      const isPast = isBeforeDay(cd, todayDate);
      const cls    = [
        'eq-cal-cell',
        isPast                            ? 'past'      : '',
        isSameDay(cd, todayDate)          ? 'today'     : '',
        isSameDay(cd, state.checkIn)      ? 'sel-start' : '',
        isSameDay(cd, state.checkOut)     ? 'sel-end'   : '',
        isInRange(cd, state.checkIn, state.checkOut) ? 'in-range' : '',
      ].filter(Boolean).join(' ');

      cells += `<div class="${cls}"
                     data-ts="${cd.getTime()}"
                     role="button"
                     tabindex="${isPast ? '-1' : '0'}"
                     aria-label="${cd.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}"
                     aria-selected="${isSameDay(cd,state.checkIn)||isSameDay(cd,state.checkOut)}"
                     aria-disabled="${isPast}">${day}</div>`;
    }

    /* Summary strip */
    const nights = nightCount();
    let summary = '';
    if (state.checkIn && state.checkOut) {
      summary = `<div class="eq-cal-summary has-dates">
        <div class="eq-cal-sum-item">
          <span class="eq-cal-sum-label">Check-in</span>
          <span class="eq-cal-sum-val">${dateToDisplay(state.checkIn)}</span>
        </div>
        <span class="eq-cal-sum-arrow">→</span>
        <div class="eq-cal-sum-item">
          <span class="eq-cal-sum-label">Check-out</span>
          <span class="eq-cal-sum-val">${dateToDisplay(state.checkOut)}</span>
        </div>
        <div class="eq-cal-sum-nights">${nights} night${nights !== 1 ? 's' : ''}</div>
      </div>`;
    } else if (state.checkIn) {
      summary = `<div class="eq-cal-summary">
        <div class="eq-cal-sum-item">
          <span class="eq-cal-sum-label">Check-in</span>
          <span class="eq-cal-sum-val">${dateToDisplay(state.checkIn)}</span>
        </div>
        <span class="eq-cal-sum-hint">Now tap your check-out date</span>
      </div>`;
    } else {
      summary = `<div class="eq-cal-summary">
        <span class="eq-cal-sum-hint">Tap your check-in date to begin</span>
      </div>`;
    }

    wrap.innerHTML = `
      <div class="eq-cal">
        <div class="eq-cal-header">
          <button class="eq-cal-nav" id="eq-cal-prev" aria-label="Previous month"
                  ${atMinMonth ? 'disabled' : ''}>&#8592;</button>
          <span class="eq-cal-month-label">${MONTHS[mon]} ${year}</span>
          <button class="eq-cal-nav" id="eq-cal-next" aria-label="Next month">&#8594;</button>
        </div>
        <div class="eq-cal-weekdays">
          ${DAYS.map(d => `<div class="eq-cal-day-label">${d}</div>`).join('')}
        </div>
        <div class="eq-cal-grid" role="grid" aria-label="Date picker">${cells}</div>
      </div>
      ${summary}
    `;

    wrap.querySelector('#eq-cal-prev').addEventListener('click', () => {
      state.calMonth = new Date(year, mon - 1, 1);
      renderCalendar();
    });
    wrap.querySelector('#eq-cal-next').addEventListener('click', () => {
      state.calMonth = new Date(year, mon + 1, 1);
      renderCalendar();
    });

    wrap.querySelectorAll('.eq-cal-cell:not(.past):not(.eq-cal-empty)').forEach(cell => {
      const fn = () => {
        const date = dayOnly(new Date(parseInt(cell.dataset.ts)));
        if (!state.checkIn) {
          state.checkIn  = date;
          state.checkOut = null;
        } else if (!state.checkOut) {
          if (isSameDay(date, state.checkIn)) {
            state.checkIn = null;
          } else if (isBeforeDay(date, state.checkIn)) {
            state.checkIn  = date;
            state.checkOut = null;
          } else {
            state.checkOut = date;
          }
        } else {
          state.checkIn  = date;
          state.checkOut = null;
        }
        renderCalendar();
      };
      cell.addEventListener('click', fn);
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
      });
    });
  }

  /* ── Build drawer shell (once) ───────────────────────────── */
  function buildDrawer() {
    if (document.getElementById('enquiry-drawer')) return;

    backdrop = document.createElement('div');
    backdrop.className = 'enquiry-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', close);

    drawer = document.createElement('div');
    drawer.className = 'enquiry-drawer';
    drawer.id = 'enquiry-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Plan your stay');
    drawer.innerHTML = `
      <div class="enquiry-header">
        <div class="enquiry-header-left">
          <span class="enquiry-header-title">Plan Your Stay</span>
          <span class="enquiry-header-sub">Venad House &nbsp;·&nbsp; Alleppey</span>
        </div>
        <button class="enquiry-close" id="enquiry-close" aria-label="Close">&#10005;</button>
      </div>
      <div class="enquiry-steps" id="enquiry-steps">
        <div class="enquiry-step active" data-step="1">
          <div class="enquiry-step-num">1</div>
          <span class="enquiry-step-label">Your Stay</span>
        </div>
        <div class="enquiry-step" data-step="2">
          <div class="enquiry-step-num">2</div>
          <span class="enquiry-step-label">Experiences</span>
        </div>
        <div class="enquiry-step" data-step="3">
          <div class="enquiry-step-num">3</div>
          <span class="enquiry-step-label">Review</span>
        </div>
      </div>
      <div class="enquiry-body" id="enquiry-body"></div>
      <div class="enquiry-footer" id="enquiry-footer"></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    drawer.querySelector('#enquiry-close').addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
  }

  /* ── Step 1 ──────────────────────────────────────────────── */
  function renderStep1() {
    const body   = drawer.querySelector('#enquiry-body');
    const footer = drawer.querySelector('#enquiry-footer');

    const roomOptions = VENAD.rooms.map(r => `
      <div class="enquiry-room-option ${state.roomId === r.id ? 'selected' : ''}"
           data-room-id="${r.id}" role="radio"
           aria-checked="${state.roomId === r.id}" tabindex="0">
        <div class="enquiry-room-option-radio"></div>
        <span class="enquiry-room-option-name">${r.name}</span>
        <span class="enquiry-room-option-price">${r.price} / night</span>
      </div>`).join('');

    body.innerHTML = `
      <div class="enquiry-section">
        <span class="enquiry-section-label">Choose your room</span>
        <div class="enquiry-room-select" role="radiogroup" aria-label="Select room">
          ${roomOptions}
        </div>
      </div>
      <div class="enquiry-section">
        <span class="enquiry-section-label">Select your dates</span>
        <div id="eq-cal-wrap"></div>
      </div>
      <div class="enquiry-section">
        <div class="enquiry-row">
          <div class="enquiry-field">
            <label class="enquiry-field-label" for="eq-guests">Guests</label>
            <select class="enquiry-select" id="eq-guests">
              ${[1,2,3,4].map(n =>
                `<option value="${n}" ${state.guests === n ? 'selected' : ''}>${n} guest${n > 1 ? 's' : ''}</option>`
              ).join('')}
            </select>
          </div>
          <div class="enquiry-field">
            <label class="enquiry-field-label" for="eq-name">Your name</label>
            <input class="enquiry-input" type="text" id="eq-name"
                   placeholder="First name" value="${state.guestName}"
                   autocomplete="given-name">
          </div>
        </div>
      </div>
    `;

    renderCalendar();

    body.querySelectorAll('.enquiry-room-option').forEach(el => {
      const fn = () => {
        body.querySelectorAll('.enquiry-room-option').forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-checked', 'false');
        });
        el.classList.add('selected');
        el.setAttribute('aria-checked', 'true');
        state.roomId = el.dataset.roomId;
      };
      el.addEventListener('click', fn);
      el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();fn();} });
    });

    body.querySelector('#eq-guests').addEventListener('change', e => {
      state.guests = parseInt(e.target.value);
    });
    body.querySelector('#eq-name').addEventListener('input', e => {
      state.guestName = e.target.value;
    });

    footer.innerHTML = `
      <button class="enquiry-btn-next" id="eq-next-1">Continue &nbsp;&#8594;</button>
    `;
    footer.querySelector('#eq-next-1').addEventListener('click', () => {
      state.guestName = body.querySelector('#eq-name').value.trim();
      if (!state.roomId) { showError(body, 'Please select a room to continue.'); return; }
      goToStep(2);
    });
  }

  /* ── Step 2 ──────────────────────────────────────────────── */
  function renderStep2() {
    const body   = drawer.querySelector('#enquiry-body');
    const footer = drawer.querySelector('#enquiry-footer');

    const expOptions = VENAD.experiences.map(exp => `
      <div class="enquiry-exp-option ${state.experiences.has(exp.id) ? 'selected' : ''}"
           data-exp-id="${exp.id}" role="checkbox"
           aria-checked="${state.experiences.has(exp.id)}" tabindex="0">
        <div class="enquiry-exp-checkbox">
          <svg class="enquiry-exp-checkbox-tick" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" stroke-width="1.8"
                      stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="enquiry-exp-info">
          <span class="enquiry-exp-name">${exp.name}</span>
          <span class="enquiry-exp-meta">${exp.duration} &nbsp;·&nbsp; per ${exp.per}</span>
        </div>
        <span class="enquiry-exp-price">${exp.price}</span>
      </div>`).join('');

    body.innerHTML = `
      <div class="enquiry-section">
        <span class="enquiry-section-label">Add experiences
          <span style="opacity:.5;font-size:.85em;letter-spacing:0;text-transform:none;"> — optional</span>
        </span>
        <div class="enquiry-exp-list" role="group" aria-label="Select experiences">
          ${expOptions}
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="enquiry-btn-back" id="eq-back-2">&#8592; &nbsp;Back</button>
      <button class="enquiry-btn-next" id="eq-next-2">Continue &nbsp;&#8594;</button>
    `;

    body.querySelectorAll('.enquiry-exp-option').forEach(el => {
      const fn = () => {
        const id = el.dataset.expId;
        if (state.experiences.has(id)) {
          state.experiences.delete(id);
          el.classList.remove('selected');
          el.setAttribute('aria-checked','false');
        } else {
          state.experiences.add(id);
          el.classList.add('selected');
          el.setAttribute('aria-checked','true');
        }
      };
      el.addEventListener('click', fn);
      el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();fn();} });
    });

    footer.querySelector('#eq-back-2').addEventListener('click', () => goToStep(1));
    footer.querySelector('#eq-next-2').addEventListener('click', () => goToStep(3));
  }

  /* ── Step 3 ──────────────────────────────────────────────── */
  function renderStep3() {
    const body       = drawer.querySelector('#enquiry-body');
    const footer     = drawer.querySelector('#enquiry-footer');
    const room       = VENAD.rooms.find(r => r.id === state.roomId);
    const nights     = nightCount();
    const selExps    = VENAD.experiences.filter(e => state.experiences.has(e.id));
    const guestCount = state.guests;

    /* Correct totals — only multiply by nights when nights > 0 */
    const roomTotal  = (room && nights > 0) ? room.priceNum * nights : 0;
    const expTotal   = selExps.reduce((sum, e) =>
      sum + (e.per === 'boat' ? e.priceNum : e.priceNum * guestCount), 0);
    const grandTotal = roomTotal + expTotal;

    const expRowsHTML = selExps.length
      ? selExps.map(e => `
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">${e.name}</span>
            <span class="enquiry-review-val">${e.price}${e.per==='person' ? ` × ${guestCount}` : ''}</span>
          </div>`).join('')
      : `<div class="enquiry-review-row">
           <span class="enquiry-review-key" style="opacity:.45;">None selected</span>
         </div>`;

    body.innerHTML = `
      <div class="enquiry-section">
        <div class="enquiry-review-block">
          <span class="enquiry-review-title">Your Stay</span>
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">Room</span>
            <span class="enquiry-review-val">${room ? room.name : '—'}</span>
          </div>
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">Check-in</span>
            <span class="enquiry-review-val">${dateToDisplay(state.checkIn)}</span>
          </div>
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">Check-out</span>
            <span class="enquiry-review-val">${dateToDisplay(state.checkOut)}</span>
          </div>
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">Duration</span>
            <span class="enquiry-review-val">${nights > 0 ? `${nights} night${nights!==1?'s':''}` : '—'}</span>
          </div>
          <div class="enquiry-review-row">
            <span class="enquiry-review-key">Guests</span>
            <span class="enquiry-review-val">${guestCount} guest${guestCount!==1?'s':''}</span>
          </div>
          ${roomTotal > 0 ? `
            <div class="enquiry-review-divider"></div>
            <div class="enquiry-review-row">
              <span class="enquiry-review-key">Room subtotal</span>
              <span class="enquiry-review-val">₹${roomTotal.toLocaleString('en-IN')}</span>
            </div>` : ''}
        </div>

        <div class="enquiry-review-block">
          <span class="enquiry-review-title">Experiences</span>
          ${expRowsHTML}
          ${selExps.length && expTotal > 0 ? `
            <div class="enquiry-review-divider"></div>
            <div class="enquiry-review-row">
              <span class="enquiry-review-key">Experiences subtotal</span>
              <span class="enquiry-review-val">₹${expTotal.toLocaleString('en-IN')}</span>
            </div>` : ''}
        </div>

        ${grandTotal > 0 ? `
          <div class="enquiry-review-block" style="background:var(--forest);">
            <div class="enquiry-review-total-row">
              <span class="enquiry-review-total-label" style="color:rgba(255,255,255,.45);">Estimated total</span>
              <div>
                <div class="enquiry-review-total-amount" style="color:#fff;">₹${grandTotal.toLocaleString('en-IN')}</div>
                <div class="enquiry-review-total-note" style="color:rgba(255,255,255,.35);">Subject to confirmation</div>
              </div>
            </div>
          </div>` : ''}

        <div class="enquiry-section" style="margin-top:1rem;">
          <div class="enquiry-field">
            <label class="enquiry-field-label" for="eq-note">Anything else we should know?</label>
            <textarea class="enquiry-textarea" id="eq-note"
              placeholder="Special occasion, dietary needs, arrival time, any questions..."
              maxlength="400">${state.note}</textarea>
          </div>
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="enquiry-btn-back" id="eq-back-3">&#8592; &nbsp;Back</button>
      <button class="enquiry-btn-send" id="eq-send">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Send Enquiry
      </button>
    `;

    body.querySelector('#eq-note').addEventListener('input', e => { state.note = e.target.value; });
    footer.querySelector('#eq-back-3').addEventListener('click', () => goToStep(2));
    footer.querySelector('#eq-send').addEventListener('click', sendEnquiry);
  }

  /* ── WhatsApp message builder ────────────────────────────── */
  function sendEnquiry() {
    const noteEl = drawer.querySelector('#eq-note');
    if (noteEl) state.note = noteEl.value.trim();

    const room       = VENAD.rooms.find(r => r.id === state.roomId);
    const selExps    = VENAD.experiences.filter(e => state.experiences.has(e.id));
    const nights     = nightCount();
    const guestCount = state.guests;
    const roomTotal  = (room && nights > 0) ? room.priceNum * nights : null;
    const expTotal   = selExps.reduce((sum, e) =>
      sum + (e.per === 'boat' ? e.priceNum : e.priceNum * guestCount), 0);
    const grandTotal = (roomTotal || 0) + expTotal;

    let msg = `Hi! I'd like to make an enquiry at ${VENAD.name}.\n\n`;
    msg += `🏡 *Room:* ${room ? room.name : 'TBD'}\n`;
    msg += `📅 *Check-in:* ${dateToLong(state.checkIn)}\n`;
    msg += `📅 *Check-out:* ${dateToLong(state.checkOut)}\n`;
    msg += `🌙 *Duration:* ${nights > 0 ? `${nights} night${nights!==1?'s':''}` : 'TBD'}\n`;
    msg += `👥 *Guests:* ${guestCount}\n`;

    if (selExps.length > 0) {
      msg += `\n✨ *Experiences I'm interested in:*\n`;
      selExps.forEach(e => { msg += `  • ${e.name} (${e.price} / ${e.per})\n`; });
    }

    if (roomTotal) {
      msg += `\n💰 *Estimated total:* ₹${grandTotal.toLocaleString('en-IN')}`;
      msg += ` (room: ₹${roomTotal.toLocaleString('en-IN')}`;
      if (expTotal > 0) msg += ` + experiences: ₹${expTotal.toLocaleString('en-IN')}`;
      msg += `)\n`;
    }

    if (state.note) msg += `\n💬 *Note:* ${state.note}\n`;

    msg += `\nLooking forward to hearing from you!`;
    if (state.guestName) msg += `\n— ${state.guestName}`;

    window.open(`https://wa.me/${VENAD.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
    close();
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function goToStep(n) {
    state.step = n;
    drawer.querySelectorAll('.enquiry-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active','done');
      if (s === n) el.classList.add('active');
      if (s < n)   el.classList.add('done');
    });
    drawer.querySelector('#enquiry-body').scrollTop = 0;
    if (n === 1) renderStep1();
    if (n === 2) renderStep2();
    if (n === 3) renderStep3();
  }

  /* ── Open / close ────────────────────────────────────────── */
  function open(preselectedRoomId) {
    buildDrawer();

    /* Full reset every open — no stale state */
    state.step        = 1;
    state.roomId      = null;
    state.checkIn     = null;
    state.checkOut    = null;
    state.guests      = 2;
    state.guestName   = '';
    state.experiences = new Set();
    state.note        = '';

    const t = today();
    state.calMonth = new Date(t.getFullYear(), t.getMonth(), 1);

    if (preselectedRoomId) {
      const valid = VENAD.rooms.find(r => r.id === preselectedRoomId);
      if (valid) state.roomId = preselectedRoomId;
    }

    goToStep(1);

    backdrop.classList.add('open');
    drawer.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const btn = drawer.querySelector('#enquiry-close');
      if (btn) btn.focus();
    }, 80);
  }

  function close() {
    if (!backdrop || !drawer) return;
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) close();
  }

  /* ── Error helper ────────────────────────────────────────── */
  function showError(container, msg) {
    const ex = container.querySelector('.enquiry-error');
    if (ex) ex.remove();
    const el = document.createElement('p');
    el.className = 'enquiry-error';
    el.style.cssText = 'font-size:.8rem;color:var(--terra);margin:.5rem 0;padding:.6rem 1rem;background:rgba(179,85,40,.08);border-left:2px solid var(--terra);border-radius:2px;';
    el.textContent = msg;
    container.prepend(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3500);
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.openEnquiry = open;

})();
