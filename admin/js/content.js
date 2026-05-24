/* ============================================================
   VENAD HOUSE ADMIN — content.js
   Manage all site text and images from one place.
   Changes write to DB and update the live site on next load.
   ============================================================ */

let contentConfig = null;
let contentRooms  = [];
let contentExps   = [];
let contentActiveTab = 'property';

window.loadContent = async function () {
  const view = document.getElementById('view-content');
  if (!view) return;

  [contentConfig, contentRooms, contentExps] = await Promise.all([
    DB.getSiteConfig(), DB.getRooms(), DB.getExperiences()
  ]);

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Content &amp; Images</div>
        <div class="page-header-sub">All site text and images managed here. Changes go live instantly.</div>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:var(--gap);">
      <button class="tab-btn ${contentActiveTab==='property'?'active':''}" onclick="switchContentTab('property')">Property Details</button>
      <button class="tab-btn ${contentActiveTab==='hero'?'active':''}" onclick="switchContentTab('hero')">Hero Image</button>
      <button class="tab-btn ${contentActiveTab==='rooms'?'active':''}" onclick="switchContentTab('rooms')">Room Images</button>
      <button class="tab-btn ${contentActiveTab==='experiences'?'active':''}" onclick="switchContentTab('experiences')">Experience Images</button>
      <button class="tab-btn ${contentActiveTab==='gallery'?'active':''}" onclick="switchContentTab('gallery')">Gallery</button>
    </div>

    <div id="content-tab-body"></div>
  `;

  switchContentTab(contentActiveTab);
};

window.switchContentTab = function (tab) {
  contentActiveTab = tab;
  document.querySelectorAll('#view-content .tab-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab.toLowerCase().split(' ')[0]))
  );
  const body = document.getElementById('content-tab-body');
  if (!body) return;

  const renders = {
    property:    renderPropertyTab,
    hero:        renderHeroTab,
    rooms:       renderRoomImagesTab,
    experiences: renderExpImagesTab,
    gallery:     renderGalleryTab,
  };

  (renders[tab] || (() => {}))(body);
};

/* ── Property Details ────────────────────────────────────────── */
function renderPropertyTab(body) {
  const p = contentConfig?.property || {};
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Property Information</div>
        <div class="card-subtitle">This data populates phone numbers, email, address across the entire site.</div>
      </div>
      <div class="card-body">
        <div class="stack">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label form-label-required">Property Name</label>
              <input class="form-input" id="cp-name" value="${p.name||''}">
            </div>
            <div class="form-group">
              <label class="form-label">Tagline</label>
              <input class="form-input" id="cp-tagline" value="${p.tagline||''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label form-label-required">Phone Number</label>
              <input class="form-input" id="cp-phone" placeholder="+91 98765 43210" value="${p.phone||''}">
            </div>
            <div class="form-group">
              <label class="form-label form-label-required">WhatsApp Number</label>
              <input class="form-input" id="cp-whatsapp" placeholder="919876543210" value="${p.whatsapp||''}">
              <span class="form-hint">Format: country code + number, no + or spaces. e.g. 919876543210</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" id="cp-email" type="email" value="${p.email||''}">
            </div>
            <div class="form-group">
              <label class="form-label">Location (display)</label>
              <input class="form-input" id="cp-location" placeholder="Alleppey, Kerala" value="${p.location||''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <textarea class="form-textarea" id="cp-address" style="min-height:60px;">${p.address||''}</textarea>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="savePropertyDetails()">Save Changes</button>
      </div>
    </div>
  `;
}

window.savePropertyDetails = async function () {
  const data = {
    property: {
      name:      document.getElementById('cp-name')?.value.trim(),
      tagline:   document.getElementById('cp-tagline')?.value.trim(),
      phone:     document.getElementById('cp-phone')?.value.trim(),
      whatsapp:  document.getElementById('cp-whatsapp')?.value.trim(),
      email:     document.getElementById('cp-email')?.value.trim(),
      location:  document.getElementById('cp-location')?.value.trim(),
      address:   document.getElementById('cp-address')?.value.trim(),
    }
  };
  await DB.updateSiteConfig(data);
  contentConfig = await DB.getSiteConfig();
  showToast('Property details saved. Changes go live on next site load.', 'success');
};

/* ── Hero Image ──────────────────────────────────────────────── */
function renderHeroTab(body) {
  const heroUrl = contentConfig?.images?.hero || '';
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Homepage Hero Image</div>
        <div class="card-subtitle">The full-screen background image on the homepage.</div>
      </div>
      <div class="card-body">
        <div class="stack">
          ${heroUrl ? `<img src="${heroUrl}" style="width:100%;max-height:280px;object-fit:cover;border-radius:4px;border:1px solid var(--border);" alt="Hero preview">` : ''}
          <div class="form-group">
            <label class="form-label form-label-required">Image URL</label>
            <input class="form-input" id="hero-url" value="${heroUrl}" placeholder="https://images.unsplash.com/...">
            <span class="form-hint">Recommended: at least 1920px wide. Use ?w=1920&q=85 for Unsplash.</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="saveHeroImage()">Save Hero Image</button>
      </div>
    </div>
  `;
}

window.saveHeroImage = async function () {
  const url = document.getElementById('hero-url')?.value.trim();
  if (!url) { showToast('Please enter an image URL.', 'error'); return; }
  await DB.updateSiteConfig({ images: { hero: url } });
  contentConfig = await DB.getSiteConfig();
  showToast('Hero image saved.', 'success');
  renderHeroTab(document.getElementById('content-tab-body'));
};

/* ── Room Images ─────────────────────────────────────────────── */
function renderRoomImagesTab(body) {
  const roomImgs = contentConfig?.images?.rooms || {};

  body.innerHTML = `
    <div class="stack">
      ${contentRooms.map(room => `
        <div class="card">
          <div class="card-header">
            <div class="card-title">${room.name}</div>
            <div class="card-subtitle">3 images — primary + 2 secondary</div>
          </div>
          <div class="card-body">
            <div class="stack">
              ${[0,1,2].map(i => {
                const url = (roomImgs[room.id]||[])[i] || '';
                return `
                  <div class="form-group">
                    <label class="form-label">Image ${i+1} ${i===0?'(Primary — largest)':''}</label>
                    <div class="img-url-field">
                      ${url
                        ? `<img class="img-preview" src="${url}" alt="preview" onerror="this.style.display='none'">`
                        : `<div class="img-preview-placeholder">🖼</div>`
                      }
                      <input class="form-input" id="ri-${room.id}-${i}" value="${url}"
                             placeholder="https://images.unsplash.com/...">
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" onclick="saveRoomImages('${room.id}')">Save ${room.name} Images</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.saveRoomImages = async function (roomId) {
  const images = [0,1,2].map(i =>
    document.getElementById(`ri-${roomId}-${i}`)?.value.trim() || ''
  ).filter(Boolean);

  const existing = contentConfig?.images?.rooms || {};
  existing[roomId] = images;
  await DB.updateSiteConfig({ images: { rooms: existing } });
  contentConfig = await DB.getSiteConfig();
  showToast('Room images saved.', 'success');
};

/* ── Experience Images ───────────────────────────────────────── */
function renderExpImagesTab(body) {
  const expImgs = contentConfig?.images?.experiences || {};

  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Experience Images</div>
        <div class="card-subtitle">One image per experience, shown on the Experiences page.</div>
      </div>
      <div class="card-body">
        <div class="stack">
          ${contentExps.map(exp => {
            const url = expImgs[exp.id] || '';
            return `
              <div class="form-group">
                <label class="form-label">${exp.name}</label>
                <div class="img-url-field">
                  ${url
                    ? `<img class="img-preview" src="${url}" alt="preview">`
                    : `<div class="img-preview-placeholder">🖼</div>`
                  }
                  <input class="form-input" id="ei-${exp.id}" value="${url}"
                         placeholder="https://images.unsplash.com/...">
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="saveExpImages()">Save Experience Images</button>
      </div>
    </div>
  `;
}

window.saveExpImages = async function () {
  const expImgs = {};
  contentExps.forEach(exp => {
    const url = document.getElementById(`ei-${exp.id}`)?.value.trim();
    if (url) expImgs[exp.id] = url;
  });
  await DB.updateSiteConfig({ images: { experiences: expImgs } });
  contentConfig = await DB.getSiteConfig();
  showToast('Experience images saved.', 'success');
};

/* ── Gallery ─────────────────────────────────────────────────── */
function renderGalleryTab(body) {
  const gallery = contentConfig?.images?.gallery || {
    backwaters: [], rooms: [], food: [], experiences: []
  };

  const chapters = [
    { key: 'backwaters', label: 'Backwaters' },
    { key: 'rooms',      label: 'Rooms' },
    { key: 'food',       label: 'Food & Spices' },
    { key: 'experiences',label: 'Experiences' },
  ];

  body.innerHTML = `
    <div class="stack">
      ${chapters.map(ch => `
        <div class="card">
          <div class="card-header">
            <div class="card-title">${ch.label} Chapter</div>
          </div>
          <div class="card-body">
            <div id="gal-list-${ch.key}" class="stack" style="gap:0.5rem;">
              ${(gallery[ch.key]||[]).map((url, i) => galImageRow(ch.key, i, url)).join('')}
            </div>
            <button class="btn btn-outline btn-sm" style="margin-top:0.75rem;"
                    onclick="addGalleryImage('${ch.key}')">+ Add Image</button>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" onclick="saveGalleryChapter('${ch.key}')">Save ${ch.label}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function galImageRow(chapter, index, url) {
  return `
    <div class="img-url-field" id="gal-row-${chapter}-${index}">
      ${url ? `<img class="img-preview" src="${url}" alt="preview">` : `<div class="img-preview-placeholder">🖼</div>`}
      <input class="form-input" id="gal-${chapter}-${index}" value="${url}" placeholder="https://images.unsplash.com/...">
      <button class="btn btn-ghost btn-icon-only" style="color:var(--red);"
              onclick="removeGalleryImage('${chapter}',${index})" title="Remove">✕</button>
    </div>`;
}

window.addGalleryImage = function (chapter) {
  const list  = document.getElementById(`gal-list-${chapter}`);
  const count = list.querySelectorAll('.img-url-field').length;
  const row   = document.createElement('div');
  row.innerHTML = galImageRow(chapter, count, '');
  list.appendChild(row.firstElementChild);
};

window.removeGalleryImage = function (chapter, index) {
  const row = document.getElementById(`gal-row-${chapter}-${index}`);
  if (row) row.remove();
};

window.saveGalleryChapter = async function (chapter) {
  const list   = document.getElementById(`gal-list-${chapter}`);
  const inputs = list.querySelectorAll('input[type="text"], input:not([type])');
  const urls   = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);

  const existing = contentConfig?.images?.gallery || {};
  existing[chapter] = urls;
  await DB.updateSiteConfig({ images: { gallery: existing } });
  contentConfig = await DB.getSiteConfig();
  showToast(`${chapter} gallery saved (${urls.length} images).`, 'success');
};
