/* ============================================================
   VENAD HOUSE ADMIN — dashboard.js
   Overview section: occupancy, check-ins, check-outs,
   upcoming bookings, quick actions.
   ============================================================ */

window.loadDashboard = async function () {
  const view = document.getElementById('view-dashboard');
  if (!view) return;

  const [rooms, units, enquiries, blocked] = await Promise.all([
    DB.getRooms(),
    DB.getRoomUnits(),
    DB.getEnquiries(),
    DB.getBlockedDates(),
  ]);

  const today      = new Date().toISOString().split('T')[0];
  const roomList   = rooms.filter(r => r.isActive);
  const totalRooms = roomList.length;

  /* Count occupied rooms */
  let occupied = 0, checkInsToday = [], checkOutsToday = [], upcoming = [];

  roomList.forEach(room => {
    const unit = units[room.id];
    if (!unit) return;

    if (unit.status === 'occupied') {
      occupied++;
      const g = unit.currentGuest;
      if (g) {
        if (g.checkIn  === today) checkInsToday.push({ room: room.name, guest: g });
        if (g.checkOut === today) checkOutsToday.push({ room: room.name, guest: g });
      }
    }

    /* Upcoming next guests */
    if (unit.nextGuest && unit.nextGuest.checkIn > today) {
      upcoming.push({ room: room.name, ...unit.nextGuest });
    }

    /* Also upcoming from current guest if not today */
    if (unit.status === 'occupied' && unit.currentGuest?.checkIn > today) {
      checkInsToday.push({ room: room.name, guest: unit.currentGuest });
    }
  });

  /* New enquiries */
  const newEnqs    = enquiries.filter(e => e.status === 'new');
  const occupancyPct = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;

  /* ── Render ── */
  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Good ${getGreeting()}, ${(window.currentUser?.name || 'there').split(' ')[0]}</div>
        <div class="page-header-sub">Here is what is happening at Venad House today.</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-accent" onclick="navigateTo('rooms')">+ Add Guest</button>
        <button class="btn btn-outline" onclick="navigateTo('calendar')">Block Date</button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid-4" style="margin-bottom:var(--gap);">
      <div class="stat-card stat-card-accent">
        <span class="stat-card-label">Occupancy Today</span>
        <span class="stat-card-value">${occupancyPct}%</span>
        <span class="stat-card-sub">${occupied} of ${totalRooms} rooms occupied</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Check-ins Today</span>
        <span class="stat-card-value">${checkInsToday.length}</span>
        <span class="stat-card-sub">${checkInsToday.map(c=>c.guest.name).join(', ') || 'None today'}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Check-outs Today</span>
        <span class="stat-card-value">${checkOutsToday.length}</span>
        <span class="stat-card-sub">${checkOutsToday.map(c=>c.guest.name).join(', ') || 'None today'}</span>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('enquiries')">
        <span class="stat-card-label">New Enquiries</span>
        <span class="stat-card-value" style="color:${newEnqs.length ? 'var(--terra)' : 'inherit'}">${newEnqs.length}</span>
        <span class="stat-card-sub">${newEnqs.length ? 'Tap to view' : 'All clear'}</span>
      </div>
    </div>

    <!-- Occupancy bar -->
    <div class="card card-pad" style="margin-bottom:var(--gap);">
      <div class="t-label" style="margin-bottom:0.85rem;">Room Status</div>
      <div style="display:flex;flex-direction:column;gap:0.65rem;">
        ${roomList.map(room => {
          const unit   = units[room.id] || {};
          const status = unit.status || 'available';
          const guest  = unit.currentGuest;
          const colors = { available:'var(--green)', occupied:'var(--terra)', blocked:'var(--amber)', maintenance:'var(--grey)' };
          const labels = { available:'Available', occupied:'Occupied', blocked:'Blocked', maintenance:'Maintenance' };
          return `
            <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div style="width:10px;height:10px;border-radius:50%;background:${colors[status]};flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.875rem;font-weight:600;">${room.name}</div>
                ${guest ? `<div class="t-small t-muted">${guest.name} &nbsp;·&nbsp; ${fmtDate(guest.checkIn)} → ${fmtDate(guest.checkOut)}</div>` : ''}
              </div>
              <span class="badge badge-${status==='available'?'green':status==='occupied'?'terra':status==='blocked'?'amber':'grey'} badge-dot">
                ${labels[status]}
              </span>
              <button class="btn btn-ghost btn-sm" onclick="navigateTo('rooms')">Manage</button>
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="grid-2">

      <!-- Upcoming check-ins -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-title">Upcoming Check-ins</div>
          </div>
        </div>
        <div class="card-body-sm">
          ${upcoming.length ? upcoming.slice(0,5).map(u => `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid var(--border);">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--green-bg);display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:#15803d;flex-shrink:0;">
                ${(u.name||'?')[0]}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.875rem;font-weight:500;">${u.name}</div>
                <div class="t-small t-muted">${u.room} &nbsp;·&nbsp; ${fmtDate(u.checkIn)}</div>
              </div>
            </div>`).join('') :
          `<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">No upcoming bookings</div></div>`}
        </div>
      </div>

      <!-- New enquiries -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-title">New Enquiries</div>
          </div>
          <div class="card-header-right">
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('enquiries')">View all</button>
          </div>
        </div>
        <div class="card-body-sm">
          ${newEnqs.length ? newEnqs.slice(0,4).map(e => `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid var(--border);">
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.875rem;font-weight:500;">${e.guestName}</div>
                <div class="t-small t-muted">${fmtRoomName(e.room, rooms)} &nbsp;·&nbsp; ${fmtDate(e.checkIn)} → ${fmtDate(e.checkOut)}</div>
              </div>
              <button class="btn btn-accent btn-sm" onclick="navigateTo('enquiries')">View</button>
            </div>`).join('') :
          `<div class="empty-state"><div class="empty-state-icon">✉</div><div class="empty-state-title">No new enquiries</div></div>`}
        </div>
      </div>

    </div>
  `;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtRoomName(id, rooms) {
  return rooms?.find(r => r.id === id)?.name || id || '—';
}
