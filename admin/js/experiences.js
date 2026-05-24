/* ============================================================
   VENAD HOUSE ADMIN — experiences.js
   Add, edit, delete, reorder, and toggle experiences.
   ============================================================ */

let expsData = [];
let editingExpId = null;

window.loadExperiences = async function () {
  const view = document.getElementById('view-experiences');
  if (!view) return;

  expsData = await DB.getExperiences();

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Experiences</div>
        <div class="page-header-sub">Manage all guest experiences. Toggle visibility or adjust pricing anytime.</div>
      </div>
      ${isAdmin() ? `
      <div class="page-header-right">
        <button class="btn btn-accent" onclick="openExpModal()">+ Add Experience</button>
      </div>` : ''}
    </div>

    <div class="stack" id="exp-list"></div>

    <!-- Modal -->
    <div class="modal-overlay" id="exp-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div><div class="modal-title" id="exp-modal-title">Add Experience</div></div>
          <button class="modal-close" onclick="closeModal('exp-modal')">✕</button>
        </div>
        <div class="modal-body" id="exp-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('exp-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveExperience()">Save</button>
        </div>
      </div>
    </div>
  `;

  renderExpList();
};

function renderExpList() {
  const list = document.getElementById('exp-list');
  if (!list) return;

  if (!expsData.length) {
    list.innerHTML = `<div class="empty-state card card-pad">
      <div class="empty-state-icon">✦</div>
      <div class="empty-state-title">No experiences yet</div>
      <div class="empty-state-sub">Add your first experience to get started.</div>
    </div>`;
    return;
  }

  list.innerHTML = expsData.map((exp, idx) => `
    <div class="card">
      <div class="card-header">
        <div class="card-header-left">
          <div>
            <div class="card-title">${exp.name}</div>
            <div class="card-subtitle">${exp.price} / ${exp.per} &nbsp;·&nbsp; ${exp.duration}</div>
          </div>
        </div>
        <div class="card-header-right">
          <span class="badge ${exp.isActive ? 'badge-green' : 'badge-grey'}">${exp.isActive ? 'Active' : 'Inactive'}</span>
          ${isAdmin() ? `
            <label class="toggle-wrap">
              <div class="toggle">
                <input type="checkbox" ${exp.isActive ? 'checked' : ''}
                       onchange="toggleExp('${exp.id}', this.checked)">
                <div class="toggle-track"></div>
              </div>
            </label>
            <button class="btn btn-outline btn-sm" onclick="openExpModal('${exp.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteExpConfirm('${exp.id}')">Delete</button>
            <div style="display:flex;flex-direction:column;gap:2px;">
              ${idx > 0 ? `<button class="btn btn-ghost btn-sm btn-icon-only" onclick="moveExp(${idx},-1)" title="Move up">↑</button>` : ''}
              ${idx < expsData.length-1 ? `<button class="btn btn-ghost btn-sm btn-icon-only" onclick="moveExp(${idx},1)" title="Move down">↓</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

/* ── Toggle active ───────────────────────────────────────────── */
window.toggleExp = async function (id, active) {
  await DB.updateExperience(id, { isActive: active });
  expsData = await DB.getExperiences();
  showToast(`Experience ${active ? 'activated' : 'deactivated'}.`, 'success');
  renderExpList();
};

/* ── Reorder ─────────────────────────────────────────────────── */
window.moveExp = async function (idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= expsData.length) return;
  [expsData[idx], expsData[newIdx]] = [expsData[newIdx], expsData[idx]];
  await DB.reorderExperiences(expsData.map(e => e.id));
  renderExpList();
};

/* ── Add / Edit modal ────────────────────────────────────────── */
window.openExpModal = function (expId) {
  editingExpId = expId || null;
  const exp    = expId ? expsData.find(e => e.id === expId) : null;
  document.getElementById('exp-modal-title').textContent = exp ? 'Edit Experience' : 'Add Experience';

  document.getElementById('exp-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Name</label>
          <input class="form-input" id="em-name" value="${exp?.name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tagline</label>
          <input class="form-input" id="em-tagline" value="${exp?.tagline||''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Price (₹)</label>
          <input class="form-input" id="em-price" type="number" value="${exp?.priceNum||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Per</label>
          <select class="form-select" id="em-per">
            <option value="person" ${exp?.per==='person'?'selected':''}>Person</option>
            <option value="boat"   ${exp?.per==='boat'?'selected':''}>Boat / Group</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Duration</label>
          <input class="form-input" id="em-duration" placeholder="e.g. 2 hrs, Full day" value="${exp?.duration||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Advance Notice (hours)</label>
          <input class="form-input" id="em-notice" type="number" value="${exp?.requiresNotice||0}">
          <span class="form-hint">0 = no advance notice needed</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="em-desc">${exp?.description||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Image URL</label>
        <input class="form-input" id="em-image" value="${exp?.image||''}" placeholder="https://images.unsplash.com/...">
      </div>
      <label class="toggle-wrap">
        <div class="toggle">
          <input type="checkbox" id="em-active" ${exp?.isActive!==false?'checked':''}>
          <div class="toggle-track"></div>
        </div>
        <span class="toggle-label">Active (visible on website)</span>
      </label>
    </div>
  `;

  openModal('exp-modal');
};

window.saveExperience = async function () {
  const name     = document.getElementById('em-name')?.value.trim();
  const priceNum = parseInt(document.getElementById('em-price')?.value);

  if (!name || !priceNum) {
    showToast('Name and price are required.', 'error');
    return;
  }

  const data = {
    name,
    tagline:        document.getElementById('em-tagline')?.value.trim(),
    priceNum,
    price:          '₹' + priceNum.toLocaleString('en-IN'),
    per:            document.getElementById('em-per')?.value || 'person',
    duration:       document.getElementById('em-duration')?.value.trim(),
    requiresNotice: parseInt(document.getElementById('em-notice')?.value) || 0,
    description:    document.getElementById('em-desc')?.value.trim(),
    image:          document.getElementById('em-image')?.value.trim(),
    isActive:       document.getElementById('em-active')?.checked !== false,
  };

  if (editingExpId) {
    await DB.updateExperience(editingExpId, data);
    showToast('Experience updated.', 'success');
  } else {
    await DB.addExperience(data);
    showToast('Experience added.', 'success');
  }

  expsData = await DB.getExperiences();
  closeModal('exp-modal');
  renderExpList();
};

window.deleteExpConfirm = async function (id) {
  const exp = expsData.find(e => e.id === id);
  if (!confirm(`Delete "${exp?.name}"? This cannot be undone.`)) return;
  await DB.deleteExperience(id);
  expsData = await DB.getExperiences();
  showToast('Experience deleted.', 'success');
  renderExpList();
};
