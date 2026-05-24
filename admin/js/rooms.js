/* ============================================================
   VENAD HOUSE ADMIN — rooms.js
   Two tabs:
   - Room Management: add/edit/delete rooms and their details
   - Availability: per-unit status, current guest, next guest,
     blocked dates, guest data entry form
   ============================================================ */

let roomsData = [], unitsData = {};
let roomsActiveTab = 'availability';

window.loadRooms = async function () {
  const view = document.getElementById('view-rooms');
  if (!view) return;

  [roomsData, unitsData] = await Promise.all([DB.getRooms(), DB.getRoomUnits()]);

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Rooms &amp; Availability</div>
        <div class="page-header-sub">Manage rooms, current guests, and unit availability.</div>
      </div>
      ${isAdmin() ? `<div class="page-header-right">
        <button class="btn btn-accent" onclick="openRoomModal()">+ Add Room</button>
      </div>` : ''}
    </div>

    <div class="tabs" style="margin-bottom:var(--gap);">
      <button class="tab-btn ${roomsActiveTab==='availability'?'active':''}" onclick="switchRoomsTab('availability')">Availability</button>
      ${isAdmin() ? `<button class="tab-btn ${roomsActiveTab==='manage'?'active':''}" onclick="switchRoomsTab('manage')">Room Settings</button>` : ''}
    </div>

    <div id="rooms-tab-content"></div>

    <!-- Modals -->
    <div class="modal-overlay" id="room-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div><div class="modal-title" id="room-modal-title">Add Room</div></div>
          <button class="modal-close" onclick="closeModal('room-modal')">✕</button>
        </div>
        <div class="modal-body" id="room-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('room-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveRoom()">Save Room</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="guest-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <div class="modal-title" id="guest-modal-title">Add Guest</div>
            <div class="modal-subtitle" id="guest-modal-sub"></div>
          </div>
          <button class="modal-close" onclick="closeModal('guest-modal')">✕</button>
        </div>
        <div class="modal-body" id="guest-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('guest-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveGuest()">Save Guest</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="block-modal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-title" id="block-modal-title">Block Dates</div>
          <button class="modal-close" onclick="closeModal('block-modal')">✕</button>
        </div>
        <div class="modal-body" id="block-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('block-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveBlock()">Block Dates</button>
        </div>
      </div>
    </div>
  `;

  switchRoomsTab(roomsActiveTab);
};

/* ── Tab switch ──────────────────────────────────────────────── */
window.switchRoomsTab = function (tab) {
  roomsActiveTab = tab;
  document.querySelectorAll('#view-rooms .tab-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab === 'availability' ? 'avail' : 'settings'))
  );
  const content = document.getElementById('rooms-tab-content');
  if (!content) return;
  if (tab === 'availability') renderAvailabilityTab(content);
  else renderManageTab(content);
};

/* ── Availability tab ────────────────────────────────────────── */
function renderAvailabilityTab(container) {
  container.innerHTML = `<div class="grid-2" id="units-grid"></div>`;
  const grid = document.getElementById('units-grid');

  roomsData.filter(r => r.isActive).forEach(room => {
    const unit   = unitsData[room.id] || { status: 'available', currentGuest: null, nextGuest: null, blockedDates: [] };
    const status = unit.status || 'available';
    const g      = unit.currentGuest;
    const ng     = unit.nextGuest;

    const statusColors = { available:'green', occupied:'terra', blocked:'amber', maintenance:'grey' };
    const statusLabels = { available:'Available', occupied:'Occupied', blocked:'Blocked', maintenance:'Maintenance' };

    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `
      <div class="unit-status-bar ${status}"></div>
      <div class="unit-card-header">
        <div>
          <div class="unit-card-name">${room.name}</div>
          <div class="t-small t-muted">${room.price} / night</div>
        </div>
        <span class="badge badge-${statusColors[status]} badge-dot">${statusLabels[status]}</span>
      </div>
      <div class="unit-card-body">

        ${g ? `
          <div class="unit-guest-section">
            <span class="unit-guest-label">Current Guest</span>
            <span class="unit-guest-name">${g.name}</span>
            <span class="unit-guest-dates">
              ${fmtDate(g.checkIn)} → ${fmtDate(g.checkOut)}
              &nbsp;·&nbsp; ${nightsBetween(g.checkIn, g.checkOut)} nights
              &nbsp;·&nbsp; ${g.adults} adult${g.adults!==1?'s':''}${g.children?', '+g.children+' child':''}
            </span>
            ${g.phone ? `<span class="t-small t-muted" style="margin-top:0.2rem;display:block;">${g.phone}</span>` : ''}
            ${g.notes ? `<span class="t-small t-muted" style="font-style:italic;">${g.notes}</span>` : ''}
            <div style="margin-top:0.5rem;">
              <span class="badge badge-${g.paymentStatus==='paid'?'green':g.paymentStatus==='partial'?'amber':'grey'}">
                ${g.paymentStatus || 'pending'}
              </span>
              <span class="badge badge-grey" style="margin-left:0.35rem;">${g.source || 'WhatsApp'}</span>
            </div>
          </div>
        ` : `
          <div class="unit-guest-section">
            <span class="unit-guest-label">Current Guest</span>
            <span class="t-small t-muted" style="font-style:italic;">No current guest</span>
          </div>
        `}

        ${ng ? `
          <div class="unit-next-guest">
            <div class="t-label" style="font-size:0.6rem;margin-bottom:0.3rem;">Next Booking</div>
            <div style="font-size:0.875rem;font-weight:600;">${ng.name}</div>
            <div class="t-small t-muted">${fmtDate(ng.checkIn)} → ${fmtDate(ng.checkOut)}</div>
          </div>
        ` : ''}

        ${unit.blockedDates?.length ? `
          <div style="margin-bottom:0.75rem;">
            <span class="unit-guest-label">Blocked Periods</span>
            ${unit.blockedDates.map(b => `
              <div style="background:var(--amber-bg);border-radius:4px;padding:0.5rem 0.65rem;margin-top:0.3rem;font-size:0.78rem;">
                ${fmtDate(b.from)} → ${fmtDate(b.to)} &nbsp;·&nbsp; ${b.reason}
              </div>`).join('')}
          </div>
        ` : ''}

        ${isAdmin() ? `
          <div class="unit-card-actions">
            <select class="form-select" style="flex:1;" onchange="changeUnitStatus('${room.id}', this.value)">
              <option value="available" ${status==='available'?'selected':''}>Available</option>
              <option value="occupied"  ${status==='occupied' ?'selected':''}>Occupied</option>
              <option value="blocked"   ${status==='blocked'  ?'selected':''}>Blocked</option>
              <option value="maintenance" ${status==='maintenance'?'selected':''}>Maintenance</option>
            </select>
            <button class="btn btn-outline btn-sm" onclick="openGuestModal('${room.id}','current')">
              ${g ? 'Edit Guest' : '+ Add Guest'}
            </button>
            <button class="btn btn-outline btn-sm" onclick="openGuestModal('${room.id}','next')">
              ${ng ? 'Edit Next' : '+ Next Booking'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="openBlockModal('${room.id}')">Block Dates</button>
            ${g ? `<button class="btn btn-danger btn-sm" onclick="checkOutGuest('${room.id}')">Check Out</button>` : ''}
          </div>
        ` : ''}

      </div>
    `;
    grid.appendChild(card);
  });
}

/* ── Room manage tab ─────────────────────────────────────────── */
function renderManageTab(container) {
  container.innerHTML = `
    <div class="stack">
      ${roomsData.map(room => `
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div>
                <div class="card-title">${room.name}</div>
                <div class="card-subtitle">${room.price} / night &nbsp;·&nbsp; ${room.isActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
            <div class="card-header-right">
              <span class="badge ${room.isActive ? 'badge-green' : 'badge-grey'}">${room.isActive ? 'Active' : 'Inactive'}</span>
              <button class="btn btn-outline btn-sm" onclick="openRoomModal('${room.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteRoomConfirm('${room.id}')">Delete</button>
            </div>
          </div>
          <div class="card-body-sm">
            <div class="t-small t-muted" style="margin-bottom:0.5rem;">${room.description || ''}</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
              ${(room.features||[]).map(f=>`<span class="badge badge-forest">${f}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ── Status change ───────────────────────────────────────────── */
window.changeUnitStatus = async function (roomId, status) {
  await DB.updateRoomUnit(roomId, { status });
  unitsData[roomId] = { ...(unitsData[roomId]||{}), status };
  showToast(`${status.charAt(0).toUpperCase()+status.slice(1)} status saved.`, 'success');
  renderAvailabilityTab(document.getElementById('rooms-tab-content'));
};

/* ── Guest modal ─────────────────────────────────────────────── */
let guestModalRoomId = null;
let guestModalType   = 'current'; // 'current' or 'next'

window.openGuestModal = function (roomId, type) {
  guestModalRoomId = roomId;
  guestModalType   = type;
  const room   = roomsData.find(r => r.id === roomId);
  const unit   = unitsData[roomId] || {};
  const g      = type === 'current' ? unit.currentGuest : unit.nextGuest;
  const isNext = type === 'next';

  document.getElementById('guest-modal-title').textContent = (g ? 'Edit' : 'Add') + (isNext ? ' Next Booking' : ' Current Guest');
  document.getElementById('guest-modal-sub').textContent   = room?.name || '';

  document.getElementById('guest-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Full Name</label>
          <input class="form-input" id="gm-name" placeholder="Guest full name" value="${g?.name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="gm-phone" placeholder="+91 98765 43210" value="${g?.phone||''}">
        </div>
      </div>
      ${!isNext ? `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="gm-email" type="email" placeholder="guest@email.com" value="${g?.email||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Source</label>
          <select class="form-select" id="gm-source">
            <option value="WhatsApp" ${g?.source==='WhatsApp'?'selected':''}>WhatsApp</option>
            <option value="Direct"   ${g?.source==='Direct'?'selected':''}>Direct Call</option>
            <option value="Referral" ${g?.source==='Referral'?'selected':''}>Referral</option>
            <option value="Other"    ${g?.source==='Other'?'selected':''}>Other</option>
          </select>
        </div>
      </div>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Check-in Date</label>
          <input class="form-input" id="gm-checkin" type="date" value="${g?.checkIn||''}">
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">Check-out Date</label>
          <input class="form-input" id="gm-checkout" type="date" value="${g?.checkOut||''}">
        </div>
      </div>
      ${!isNext ? `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Adults</label>
          <select class="form-select" id="gm-adults">
            ${[1,2,3,4].map(n=>`<option value="${n}" ${(g?.adults||2)==n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Children</label>
          <select class="form-select" id="gm-children">
            ${[0,1,2,3].map(n=>`<option value="${n}" ${(g?.children||0)==n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Payment Status</label>
          <select class="form-select" id="gm-payment">
            <option value="pending" ${g?.paymentStatus==='pending'?'selected':''}>Pending</option>
            <option value="partial" ${g?.paymentStatus==='partial'?'selected':''}>Partial</option>
            <option value="paid"    ${g?.paymentStatus==='paid'?'selected':''}>Paid</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Rate Agreed (₹)</label>
          <input class="form-input" id="gm-rate" type="number" placeholder="${roomsData.find(r=>r.id===roomId)?.priceNum||''}" value="${g?.rateAgreed||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="gm-notes" placeholder="Special requests, occasion, dietary needs...">${g?.notes||''}</textarea>
      </div>` : ''}
    </div>
  `;

  openModal('guest-modal');
};

window.saveGuest = async function () {
  const name     = document.getElementById('gm-name')?.value.trim();
  const phone    = document.getElementById('gm-phone')?.value.trim();
  const checkIn  = document.getElementById('gm-checkin')?.value;
  const checkOut = document.getElementById('gm-checkout')?.value;

  if (!name || !checkIn || !checkOut) {
    showToast('Please fill in name, check-in, and check-out dates.', 'error');
    return;
  }
  if (checkOut <= checkIn) {
    showToast('Check-out must be after check-in.', 'error');
    return;
  }

  const isNext = guestModalType === 'next';
  const guestData = isNext
    ? { name, phone, checkIn, checkOut }
    : {
        name, phone,
        email:         document.getElementById('gm-email')?.value.trim(),
        checkIn, checkOut,
        adults:        parseInt(document.getElementById('gm-adults')?.value)||2,
        children:      parseInt(document.getElementById('gm-children')?.value)||0,
        paymentStatus: document.getElementById('gm-payment')?.value||'pending',
        rateAgreed:    parseInt(document.getElementById('gm-rate')?.value)||null,
        source:        document.getElementById('gm-source')?.value||'WhatsApp',
        notes:         document.getElementById('gm-notes')?.value.trim(),
      };

  const updateData = isNext
    ? { nextGuest: guestData }
    : { currentGuest: guestData, status: 'occupied' };

  await DB.updateRoomUnit(guestModalRoomId, updateData);
  unitsData = await DB.getRoomUnits();
  closeModal('guest-modal');
  showToast('Guest saved successfully.', 'success');
  renderAvailabilityTab(document.getElementById('rooms-tab-content'));
};

/* ── Check out ───────────────────────────────────────────────── */
window.checkOutGuest = async function (roomId) {
  if (!confirm('Mark this guest as checked out? This will clear the current guest data.')) return;
  await DB.updateRoomUnit(roomId, { currentGuest: null, status: 'available' });
  unitsData = await DB.getRoomUnits();
  showToast('Guest checked out.', 'success');
  renderAvailabilityTab(document.getElementById('rooms-tab-content'));
};

/* ── Block dates modal ───────────────────────────────────────── */
let blockModalRoomId = null;

window.openBlockModal = function (roomId) {
  blockModalRoomId = roomId;
  const room = roomsData.find(r => r.id === roomId);
  document.getElementById('block-modal-title').textContent = `Block Dates — ${room?.name||''}`;
  document.getElementById('block-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">From</label>
          <input class="form-input" id="bm-from" type="date">
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">To</label>
          <input class="form-input" id="bm-to" type="date">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input class="form-input" id="bm-reason" placeholder="e.g. Maintenance, Family stay, Renovation">
      </div>
    </div>
  `;
  openModal('block-modal');
};

window.saveBlock = async function () {
  const from   = document.getElementById('bm-from')?.value;
  const to     = document.getElementById('bm-to')?.value;
  const reason = document.getElementById('bm-reason')?.value.trim() || 'Blocked';

  if (!from || !to || to <= from) {
    showToast('Please select valid from and to dates.', 'error');
    return;
  }

  const unit     = unitsData[blockModalRoomId] || {};
  const existing = unit.blockedDates || [];
  existing.push({ from, to, reason });
  await DB.updateRoomUnit(blockModalRoomId, { blockedDates: existing, status: 'blocked' });
  unitsData = await DB.getRoomUnits();
  closeModal('block-modal');
  showToast('Dates blocked.', 'success');
  renderAvailabilityTab(document.getElementById('rooms-tab-content'));
};

/* ── Room settings modal ─────────────────────────────────────── */
let editingRoomId = null;

window.openRoomModal = function (roomId) {
  editingRoomId = roomId || null;
  const room = roomId ? roomsData.find(r => r.id === roomId) : null;
  document.getElementById('room-modal-title').textContent = room ? 'Edit Room' : 'Add Room';

  const imgs = room?.images || ['','',''];

  document.getElementById('room-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Room Name</label>
          <input class="form-input" id="rm-name" placeholder="e.g. Backwater Villa" value="${room?.name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tagline</label>
          <input class="form-input" id="rm-tagline" placeholder="Short poetic description" value="${room?.tagline||''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Price (₹/night)</label>
          <input class="form-input" id="rm-price" type="number" placeholder="7500" value="${room?.priceNum||''}">
        </div>
        <div class="form-group" style="justify-content:flex-end;padding-top:1.5rem;">
          <label class="toggle-wrap">
            <span class="toggle-label-sm">Active on website</span>
            <div class="toggle">
              <input type="checkbox" id="rm-active" ${room?.isActive!==false?'checked':''}>
              <div class="toggle-track"></div>
            </div>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="rm-desc">${room?.description||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Features (one per line)</label>
        <textarea class="form-textarea" id="rm-features" style="min-height:100px;">${(room?.features||[]).join('\n')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Room Images (URLs)</label>
        ${[0,1,2].map(i=>`
          <div class="img-url-field" style="margin-bottom:0.5rem;">
            <div class="img-preview-placeholder" id="img-prev-${i}">🖼</div>
            <input class="form-input" id="rm-img-${i}" placeholder="https://images.unsplash.com/..." value="${imgs[i]||''}"
                   oninput="previewImg(${i},this.value)">
          </div>`).join('')}
        <span class="form-hint">Paste any image URL. Use Unsplash for free high-quality photos.</span>
      </div>
    </div>
  `;

  /* Preview existing images */
  [0,1,2].forEach(i => { if (imgs[i]) previewImg(i, imgs[i]); });
  openModal('room-modal');
};

window.previewImg = function (i, url) {
  const container = document.getElementById('img-prev-' + i);
  if (!container) return;
  if (!url) { container.outerHTML = `<div class="img-preview-placeholder" id="img-prev-${i}">🖼</div>`; return; }
  const el = document.getElementById('img-prev-' + i);
  if (el) {
    el.outerHTML = `<img class="img-preview" id="img-prev-${i}" src="${url}" alt="preview" onerror="this.outerHTML='<div class=&quot;img-preview-placeholder&quot; id=&quot;img-prev-${i}&quot;>✕</div>'">`;
  }
};

window.saveRoom = async function () {
  const name     = document.getElementById('rm-name')?.value.trim();
  const priceNum = parseInt(document.getElementById('rm-price')?.value);

  if (!name || !priceNum) {
    showToast('Room name and price are required.', 'error');
    return;
  }

  const features = (document.getElementById('rm-features')?.value||'')
    .split('\n').map(f=>f.trim()).filter(Boolean);

  const images = [0,1,2].map(i => document.getElementById('rm-img-'+i)?.value.trim()||'').filter(Boolean);

  const data = {
    name,
    tagline:     document.getElementById('rm-tagline')?.value.trim()||'',
    description: document.getElementById('rm-desc')?.value.trim()||'',
    priceNum,
    price:       '₹' + priceNum.toLocaleString('en-IN'),
    features,
    images,
    isActive: document.getElementById('rm-active')?.checked !== false,
  };

  if (editingRoomId) {
    await DB.updateRoom(editingRoomId, data);
    showToast('Room updated.', 'success');
  } else {
    await DB.addRoom(data);
    showToast('Room added.', 'success');
  }

  roomsData = await DB.getRooms();
  closeModal('room-modal');
  switchRoomsTab('manage');
};

window.deleteRoomConfirm = async function (roomId) {
  const room = roomsData.find(r => r.id === roomId);
  if (!confirm(`Delete "${room?.name}"? This cannot be undone.`)) return;
  await DB.deleteRoom(roomId);
  roomsData = await DB.getRooms();
  showToast('Room deleted.', 'success');
  renderManageTab(document.getElementById('rooms-tab-content'));
};

/* ── Shared helpers ──────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}
