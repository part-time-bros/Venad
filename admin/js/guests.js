/* ============================================================
   VENAD HOUSE ADMIN — guests.js
   Searchable guest log built from room unit data.
   ============================================================ */

window.loadGuests = async function () {
  const view = document.getElementById('view-guests');
  if (!view) return;

  const [rooms, units] = await Promise.all([DB.getRooms(), DB.getRoomUnits()]);

  /* Build flat guest list from room units */
  const guests = [];
  rooms.forEach(room => {
    const unit = units[room.id];
    if (!unit) return;
    if (unit.currentGuest) {
      guests.push({ ...unit.currentGuest, room: room.name, roomId: room.id, type: 'current' });
    }
    if (unit.nextGuest) {
      guests.push({ ...unit.nextGuest, room: room.name, roomId: room.id, type: 'next' });
    }
  });

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Guest Log</div>
        <div class="page-header-sub">${guests.length} guest record${guests.length!==1?'s':''} across all rooms.</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
        </svg>
        <input class="form-input" id="guest-search" placeholder="Search by name or phone…"
               oninput="filterGuests()">
      </div>
      <select class="form-select" id="guest-filter-type" onchange="filterGuests()" style="width:auto;">
        <option value="">All guests</option>
        <option value="current">Current guests</option>
        <option value="next">Upcoming guests</option>
      </select>
      <select class="form-select" id="guest-filter-room" onchange="filterGuests()" style="width:auto;">
        <option value="">All rooms</option>
        ${rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
      </select>
    </div>

    ${guests.length ? `
    <div class="card">
      <div class="table-wrap">
        <table id="guests-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Nights</th>
              <th>Status</th>
              <th>Payment</th>
              ${isAdmin() ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody id="guests-tbody">
            ${guests.map(g => guestRow(g)).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="empty-state card card-pad">
      <div class="empty-state-icon">♟</div>
      <div class="empty-state-title">No guest records</div>
      <div class="empty-state-sub">Add guests from the Rooms &amp; Availability section.</div>
    </div>`}
  `;

  /* Store guests for filtering */
  window._guestData = guests;
};

function guestRow(g) {
  const nights = g.checkIn && g.checkOut
    ? Math.max(0, Math.round((new Date(g.checkOut)-new Date(g.checkIn))/86400000))
    : '—';

  const payBadge = {
    paid:    'badge-green',
    partial: 'badge-amber',
    pending: 'badge-grey',
  }[g.paymentStatus] || 'badge-grey';

  const typeBadge = g.type === 'current'
    ? `<span class="badge badge-terra badge-dot">Current</span>`
    : `<span class="badge badge-blue badge-dot">Upcoming</span>`;

  return `
    <tr data-name="${(g.name||'').toLowerCase()}"
        data-phone="${(g.phone||'').toLowerCase()}"
        data-type="${g.type}"
        data-room="${g.roomId}">
      <td>
        <div class="td-name">${g.name || '—'}</div>
        <div class="td-muted">${g.phone || ''}</div>
      </td>
      <td>${g.room}</td>
      <td>${fmtDate(g.checkIn)}</td>
      <td>${fmtDate(g.checkOut)}</td>
      <td>${nights}</td>
      <td>${typeBadge}</td>
      <td>${g.paymentStatus ? `<span class="badge ${payBadge}">${g.paymentStatus}</span>` : '—'}</td>
      ${isAdmin() ? `
      <td>
        <button class="btn btn-ghost btn-sm" onclick="navigateTo('rooms')">Edit</button>
      </td>` : ''}
    </tr>`;
}

window.filterGuests = function () {
  const search   = (document.getElementById('guest-search')?.value||'').toLowerCase();
  const typeF    = document.getElementById('guest-filter-type')?.value||'';
  const roomF    = document.getElementById('guest-filter-room')?.value||'';
  const tbody    = document.getElementById('guests-tbody');
  if (!tbody) return;

  tbody.querySelectorAll('tr').forEach(row => {
    const name  = row.dataset.name  || '';
    const phone = row.dataset.phone || '';
    const type  = row.dataset.type  || '';
    const room  = row.dataset.room  || '';

    const matchSearch = !search || name.includes(search) || phone.includes(search);
    const matchType   = !typeF  || type === typeF;
    const matchRoom   = !roomF  || room === roomF;

    row.style.display = (matchSearch && matchType && matchRoom) ? '' : 'none';
  });
};

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
