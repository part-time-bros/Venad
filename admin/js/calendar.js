/* ============================================================
   VENAD HOUSE ADMIN — calendar.js
   Monthly calendar view showing room occupancy per day.
   Block individual dates, date ranges, mark as leave/closed.
   ============================================================ */

let calYear, calMonth;
let calRooms, calUnits, calBlocked;

window.loadCalendar = async function () {
  const view = document.getElementById('view-calendar');
  if (!view) return;

  const now  = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  [calRooms, calUnits, calBlocked] = await Promise.all([
    DB.getRooms(), DB.getRoomUnits(), DB.getBlockedDates()
  ]);

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Calendar &amp; Availability</div>
        <div class="page-header-sub">View occupancy, block dates, and manage leave periods.</div>
      </div>
      ${isAdmin() ? `
      <div class="page-header-right">
        <button class="btn btn-outline" onclick="openRangeBlockModal()">Block Date Range</button>
        <button class="btn btn-accent" onclick="openDayModal(getTodayStr())">Block Today</button>
      </div>` : ''}
    </div>

    <div class="grid-2" style="align-items:start;">

      <!-- Calendar -->
      <div class="card card-pad">
        <div class="admin-cal-header">
          <button class="btn btn-ghost btn-sm" onclick="calNav(-1)">&#8592;</button>
          <div class="admin-cal-month" id="cal-month-label"></div>
          <button class="btn btn-ghost btn-sm" onclick="calNav(1)">&#8594;</button>
        </div>
        <div class="admin-cal" id="cal-weekday-labels"></div>
        <div class="admin-cal" id="cal-grid" style="margin-top:0.35rem;"></div>
      </div>

      <!-- Legend + selected day panel -->
      <div class="stack">
        <div class="card card-pad">
          <div class="t-label" style="margin-bottom:0.75rem;">Legend</div>
          <div class="stack" style="gap:0.5rem;">
            ${[
              ['Available', 'var(--green)',   'All rooms free'],
              ['Partially Booked', 'var(--amber)',  'Some rooms occupied'],
              ['Fully Booked',     'var(--red)',    'All rooms occupied'],
              ['Leave / Closed',   'var(--grey)',   'Property closed'],
              ['Blocked',          'var(--forest)', 'Manually blocked'],
            ].map(([label,color,sub]) => `
              <div style="display:flex;align-items:center;gap:0.65rem;">
                <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;"></div>
                <div>
                  <div style="font-size:0.82rem;font-weight:500;">${label}</div>
                  <div class="t-small t-muted">${sub}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card" id="day-detail-panel">
          <div class="card-body-sm">
            <div class="empty-state">
              <div class="empty-state-icon">📅</div>
              <div class="empty-state-title">Select a date</div>
              <div class="empty-state-sub">Click any day to see details and manage availability.</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modals -->
    <div class="modal-overlay" id="day-modal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-title" id="day-modal-title">Manage Date</div>
          <button class="modal-close" onclick="closeModal('day-modal')">✕</button>
        </div>
        <div class="modal-body" id="day-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('day-modal')">Cancel</button>
          <button class="btn btn-primary" id="day-modal-save-btn">Save</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="range-modal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-title">Block Date Range</div>
          <button class="modal-close" onclick="closeModal('range-modal')">✕</button>
        </div>
        <div class="modal-body">
          <div class="stack">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label form-label-required">From</label>
                <input class="form-input" id="range-from" type="date" value="${getTodayStr()}">
              </div>
              <div class="form-group">
                <label class="form-label form-label-required">To</label>
                <input class="form-input" id="range-to" type="date">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-select" id="range-type">
                <option value="blocked">Blocked</option>
                <option value="leave">Leave / Closed</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Note (optional)</label>
              <input class="form-input" id="range-note" placeholder="Reason for blocking">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('range-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveRangeBlock()">Block Dates</button>
        </div>
      </div>
    </div>
  `;

  renderCal();
};

/* ── Render calendar ─────────────────────────────────────────── */
function renderCal() {
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  document.getElementById('cal-month-label').textContent = `${MONTHS[calMonth]} ${calYear}`;

  /* Day labels */
  const labelsEl = document.getElementById('cal-weekday-labels');
  labelsEl.innerHTML = DAYS.map(d=>`<div class="admin-cal-day-label">${d}</div>`).join('');

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr    = getTodayStr();
  const grid        = document.getElementById('cal-grid');
  grid.innerHTML    = '';

  /* Empty cells */
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'admin-cal-cell empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isPast  = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const blocked = calBlocked[dateStr];

    /* Count occupied rooms on this date */
    const activeRooms   = calRooms.filter(r => r.isActive);
    let occupiedCount   = 0;
    const dots          = [];

    activeRooms.forEach(room => {
      const unit = calUnits[room.id];
      if (!unit) return;
      const g = unit.currentGuest;
      const n = unit.nextGuest;
      const isOccupied = (unit.status === 'occupied' && g && g.checkIn <= dateStr && g.checkOut > dateStr);
      const isNextOcc  = (n && n.checkIn <= dateStr && n.checkOut > dateStr);
      const isBlocked  = unit.blockedDates?.some(b => b.from <= dateStr && b.to >= dateStr);

      if (isOccupied || isNextOcc) { occupiedCount++; dots.push('terra'); }
      else if (isBlocked)          { dots.push('amber'); }
      else                         { dots.push('green'); }
    });

    let cls = 'admin-cal-cell';
    if (isPast)  cls += ' past';
    if (isToday) cls += ' today';

    if (blocked) {
      cls += blocked.type === 'leave' ? ' leave' : ' blocked';
    } else if (occupiedCount === activeRooms.length && activeRooms.length > 0) {
      cls += ' fully-booked';
    } else if (occupiedCount > 0) {
      cls += ' partial';
    }

    const dotsHTML = dots.map(c =>
      `<div class="admin-cal-dot" style="background:var(--${c})"></div>`
    ).join('');

    const cell = document.createElement('div');
    cell.className = cls;
    cell.innerHTML = `
      <span class="admin-cal-date">${day}</span>
      <div class="admin-cal-dots">${dotsHTML}</div>
    `;
    cell.addEventListener('click', () => {
      if (!isPast) openDayModal(dateStr);
      else showDayDetail(dateStr);
    });

    grid.appendChild(cell);
  }
}

/* ── Calendar navigation ─────────────────────────────────────── */
window.calNav = function (dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCal();
};

/* ── Day detail panel ────────────────────────────────────────── */
function showDayDetail(dateStr) {
  const panel   = document.getElementById('day-detail-panel');
  const blocked = calBlocked[dateStr];
  const activeRooms = calRooms.filter(r => r.isActive);

  let html = `<div class="card-header"><div class="card-title">${fmtDateLong(dateStr)}</div></div><div class="card-body-sm">`;

  if (blocked) {
    html += `<div style="padding:0.65rem;background:var(--${blocked.type==='leave'?'grey':'amber'}-bg);border-radius:4px;margin-bottom:0.75rem;">
      <div style="font-size:0.82rem;font-weight:600;">${blocked.type==='leave'?'Leave / Closed':'Blocked'}</div>
      ${blocked.note?`<div class="t-small t-muted">${blocked.note}</div>`:''}
    </div>`;
  }

  activeRooms.forEach(room => {
    const unit = calUnits[room.id];
    if (!unit) return;
    const g = unit.currentGuest;
    const n = unit.nextGuest;
    const isOcc = unit.status==='occupied' && g && g.checkIn<=dateStr && g.checkOut>dateStr;
    const isNext = n && n.checkIn<=dateStr && n.checkOut>dateStr;
    const isBlk  = unit.blockedDates?.some(b=>b.from<=dateStr&&b.to>=dateStr);

    let status='available', guestName='', color='green';
    if (isOcc)  { status='Occupied';  guestName=g.name;  color='terra'; }
    else if (isNext) { status='Booked'; guestName=n.name; color='blue'; }
    else if (isBlk)  { status='Blocked'; color='amber'; }

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:0.82rem;font-weight:500;">${room.name}</div>
          ${guestName?`<div class="t-small t-muted">${guestName}</div>`:''}
        </div>
        <span class="badge badge-${color==='terra'?'terra':color==='blue'?'blue':color==='amber'?'amber':'green'} badge-dot">
          ${status}
        </span>
      </div>`;
  });

  html += '</div>';
  panel.innerHTML = html;
}

/* ── Day modal ───────────────────────────────────────────────── */
window.openDayModal = function (dateStr) {
  if (!isAdmin()) { showDayDetail(dateStr); return; }

  document.getElementById('day-modal-title').textContent = fmtDateLong(dateStr);
  const existing = calBlocked[dateStr];

  document.getElementById('day-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-group">
        <label class="form-label">Date Status</label>
        <select class="form-select" id="dm-type">
          <option value="">— No block (clear) —</option>
          <option value="blocked"     ${existing?.type==='blocked'?'selected':''}>Blocked</option>
          <option value="leave"       ${existing?.type==='leave'?'selected':''}>Leave / Property Closed</option>
          <option value="maintenance" ${existing?.type==='maintenance'?'selected':''}>Maintenance</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-input" id="dm-note" placeholder="Reason (optional)" value="${existing?.note||''}">
      </div>
      ${existing ? `
        <button class="btn btn-danger btn-sm" style="align-self:flex-start;" onclick="clearDayBlock('${dateStr}')">
          Remove Block
        </button>` : ''}
    </div>
  `;

  const saveBtn = document.getElementById('day-modal-save-btn');
  saveBtn.onclick = () => saveDayBlock(dateStr);
  openModal('day-modal');
};

window.saveDayBlock = async function (dateStr) {
  const type = document.getElementById('dm-type')?.value;
  const note = document.getElementById('dm-note')?.value.trim();

  if (!type) {
    await DB.clearBlockedDate(dateStr);
    showToast('Date unblocked.', 'success');
  } else {
    await DB.setBlockedDate(dateStr, { type, note });
    showToast('Date blocked.', 'success');
  }

  calBlocked = await DB.getBlockedDates();
  closeModal('day-modal');
  renderCal();
};

window.clearDayBlock = async function (dateStr) {
  await DB.clearBlockedDate(dateStr);
  calBlocked = await DB.getBlockedDates();
  showToast('Block cleared.', 'success');
  closeModal('day-modal');
  renderCal();
};

/* ── Range block modal ───────────────────────────────────────── */
window.openRangeBlockModal = function () { openModal('range-modal'); };

window.saveRangeBlock = async function () {
  const from = document.getElementById('range-from')?.value;
  const to   = document.getElementById('range-to')?.value;
  const type = document.getElementById('range-type')?.value || 'blocked';
  const note = document.getElementById('range-note')?.value.trim();

  if (!from || !to || to < from) {
    showToast('Please select valid from and to dates.', 'error');
    return;
  }

  /* Block every date in the range */
  let current = new Date(from + 'T00:00:00');
  const end   = new Date(to   + 'T00:00:00');
  let count   = 0;

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    await DB.setBlockedDate(dateStr, { type, note });
    current.setDate(current.getDate() + 1);
    count++;
  }

  calBlocked = await DB.getBlockedDates();
  closeModal('range-modal');
  showToast(`${count} dates blocked.`, 'success');
  renderCal();
};

/* ── Helpers ─────────────────────────────────────────────────── */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDateLong(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
}

window.getTodayStr = getTodayStr;
