/* ============================================================
   VENAD HOUSE ADMIN — enquiries.js
   Manage guest enquiries: view, update status, convert to booking.
   ============================================================ */

let enqData  = [];
let enqRooms = [];

window.loadEnquiries = async function () {
  const view = document.getElementById('view-enquiries');
  if (!view) return;

  [enqData, enqRooms] = await Promise.all([DB.getEnquiries(), DB.getRooms()]);

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Enquiries</div>
        <div class="page-header-sub">${enqData.length} total &nbsp;·&nbsp; ${enqData.filter(e=>e.status==='new').length} new</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-outline" onclick="loadEnquiries()">Refresh</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
        </svg>
        <input class="form-input" id="enq-search" placeholder="Search by name or phone…" oninput="filterEnquiries()">
      </div>
      <select class="form-select" id="enq-filter-status" onchange="filterEnquiries()" style="width:auto;">
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="responded">Responded</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="stack" id="enq-list"></div>

    <!-- Confirm convert modal -->
    <div class="modal-overlay" id="convert-modal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-title">Convert to Booking</div>
          <button class="modal-close" onclick="closeModal('convert-modal')">✕</button>
        </div>
        <div class="modal-body" id="convert-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('convert-modal')">Cancel</button>
          <button class="btn btn-primary" id="convert-confirm-btn">Go to Rooms</button>
        </div>
      </div>
    </div>
  `;

  renderEnquiries();
  await updateEnquiryBadge();
};

function renderEnquiries() {
  const list = document.getElementById('enq-list');
  if (!list) return;

  const statusF = document.getElementById('enq-filter-status')?.value || '';
  const search  = (document.getElementById('enq-search')?.value || '').toLowerCase();

  const filtered = enqData.filter(e => {
    const matchStatus = !statusF || e.status === statusF;
    const matchSearch = !search  || (e.guestName||'').toLowerCase().includes(search) || (e.phone||'').toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state card card-pad">
      <div class="empty-state-icon">✉</div>
      <div class="empty-state-title">No enquiries found</div>
      <div class="empty-state-sub">Enquiries submitted via the website will appear here.</div>
    </div>`;
    return;
  }

  const statusConfig = {
    new:       { badge: 'badge-terra',  label: 'New'       },
    responded: { badge: 'badge-blue',   label: 'Responded' },
    confirmed: { badge: 'badge-green',  label: 'Confirmed' },
    cancelled: { badge: 'badge-grey',   label: 'Cancelled' },
  };

  list.innerHTML = filtered.map(enq => {
    const sc      = statusConfig[enq.status] || statusConfig.new;
    const room    = enqRooms.find(r => r.id === enq.room);
    const nights  = enq.checkIn && enq.checkOut
      ? Math.round((new Date(enq.checkOut)-new Date(enq.checkIn))/86400000)
      : null;
    const timeAgo = fmtTimeAgo(enq.createdAt);

    return `
      <div class="card" id="enq-${enq.id}">
        <div class="card-header">
          <div class="card-header-left">
            <div>
              <div class="card-title">${enq.guestName || 'Unknown'}</div>
              <div class="card-subtitle">${enq.phone || ''} &nbsp;·&nbsp; ${timeAgo}</div>
            </div>
          </div>
          <div class="card-header-right">
            <span class="badge ${sc.badge} badge-dot">${sc.label}</span>
          </div>
        </div>
        <div class="card-body-sm">
          <div class="grid-2" style="gap:0.75rem;margin-bottom:0.85rem;">
            <div>
              <div class="t-label">Room</div>
              <div style="font-size:0.875rem;margin-top:0.2rem;">${room?.name || enq.room || '—'}</div>
            </div>
            <div>
              <div class="t-label">Dates</div>
              <div style="font-size:0.875rem;margin-top:0.2rem;">
                ${fmtDate(enq.checkIn)} → ${fmtDate(enq.checkOut)}
                ${nights ? `<span class="t-muted">(${nights} nights)</span>` : ''}
              </div>
            </div>
            <div>
              <div class="t-label">Guests</div>
              <div style="font-size:0.875rem;margin-top:0.2rem;">${enq.guests || '—'}</div>
            </div>
            ${enq.experiences?.length ? `
            <div>
              <div class="t-label">Experiences</div>
              <div style="font-size:0.78rem;margin-top:0.2rem;">${enq.experiences.join(', ')}</div>
            </div>` : ''}
          </div>

          ${enq.note ? `
          <div style="background:var(--surface-2);padding:0.65rem 0.85rem;border-radius:4px;border-left:3px solid var(--border-dark);margin-bottom:0.85rem;">
            <div class="t-label" style="margin-bottom:0.2rem;">Guest Note</div>
            <div style="font-size:0.82rem;">${enq.note}</div>
          </div>` : ''}

          ${isAdmin() ? `
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
            <span class="t-label" style="margin-right:0.25rem;">Mark as:</span>
            ${enq.status!=='responded' ? `<button class="btn btn-outline btn-sm" onclick="updateEnqStatus('${enq.id}','responded')">Responded</button>` : ''}
            ${enq.status!=='confirmed' ? `<button class="btn btn-success btn-sm" onclick="updateEnqStatus('${enq.id}','confirmed')">Confirmed</button>` : ''}
            ${enq.status!=='cancelled' ? `<button class="btn btn-danger btn-sm" onclick="updateEnqStatus('${enq.id}','cancelled')">Cancelled</button>` : ''}
            <button class="btn btn-accent btn-sm" style="margin-left:auto;" onclick="convertToBooking('${enq.id}')">
              Convert to Booking
            </button>
            <a class="btn btn-outline btn-sm" href="https://wa.me/${getWhatsApp(enq.phone)}" target="_blank">
              Reply on WhatsApp
            </a>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.filterEnquiries = function () { renderEnquiries(); };

window.updateEnqStatus = async function (id, status) {
  await DB.updateEnquiry(id, { status });
  enqData = await DB.getEnquiries();
  showToast(`Enquiry marked as ${status}.`, 'success');
  renderEnquiries();
  await updateEnquiryBadge();
};

window.convertToBooking = function (id) {
  const enq  = enqData.find(e => e.id === id);
  const room = enqRooms.find(r => r.id === enq?.room);

  document.getElementById('convert-modal-body').innerHTML = `
    <div class="stack">
      <p style="font-size:0.875rem;color:var(--txt-soft);line-height:1.65;">
        This will take you to the <strong>Rooms &amp; Availability</strong> section where you can
        add <strong>${enq?.guestName}</strong> as a guest in the <strong>${room?.name || 'selected room'}</strong>.
      </p>
      <div style="background:var(--surface-2);padding:0.85rem;border-radius:4px;">
        <div class="t-label" style="margin-bottom:0.5rem;">Pre-fill with:</div>
        <div class="t-small">Name: ${enq?.guestName}</div>
        <div class="t-small">Phone: ${enq?.phone}</div>
        <div class="t-small">Check-in: ${fmtDate(enq?.checkIn)}</div>
        <div class="t-small">Check-out: ${fmtDate(enq?.checkOut)}</div>
        <div class="t-small">Guests: ${enq?.guests}</div>
      </div>
    </div>
  `;

  document.getElementById('convert-confirm-btn').onclick = async () => {
    await DB.updateEnquiry(id, { status: 'confirmed' });
    closeModal('convert-modal');
    navigateTo('rooms');
    showToast(`Enquiry confirmed — add guest in the Rooms section.`, 'success');
  };

  openModal('convert-modal');
};

function getWhatsApp(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g,'');
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

function fmtTimeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
