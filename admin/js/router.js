/* ============================================================
   VENAD HOUSE ADMIN — router.js
   Section switching, sidebar, topbar updates, toasts.
   ============================================================ */

const SECTIONS = {
  dashboard:   { label: 'Dashboard',         icon: '⊞', file: 'dashboard'   },
  rooms:       { label: 'Rooms & Availability', icon: '⌂', file: 'rooms'    },
  guests:      { label: 'Guests',             icon: '♟', file: 'guests'     },
  calendar:    { label: 'Calendar',           icon: '◫', file: 'calendar'   },
  content:     { label: 'Content & Images',   icon: '✎', file: 'content'    },
  experiences: { label: 'Experiences',        icon: '✦', file: 'experiences' },
  enquiries:   { label: 'Enquiries',          icon: '✉', file: 'enquiries'  },
  users:       { label: 'Users & Permissions',icon: '⚙', file: 'users'      },
};

let currentSection = 'dashboard';

/* ── Navigate to section ─────────────────────────────────────── */
async function navigateTo(sectionId) {
  if (!staffCanSee(sectionId)) {
    showToast('You do not have permission to view this section.', 'error');
    return;
  }

  currentSection = sectionId;

  /* Update sidebar active state */
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === sectionId);
  });

  /* Update topbar title */
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = SECTIONS[sectionId]?.label || '';

  /* Hide all views */
  document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));

  /* Show target view */
  const view = document.getElementById('view-' + sectionId);
  if (view) {
    view.classList.add('active');
  }

  /* Load section data */
  const loaders = {
    dashboard:   window.loadDashboard,
    rooms:       window.loadRooms,
    guests:      window.loadGuests,
    calendar:    window.loadCalendar,
    content:     window.loadContent,
    experiences: window.loadExperiences,
    enquiries:   window.loadEnquiries,
    users:       window.loadUsers,
  };

  if (loaders[sectionId]) await loaders[sectionId]();

  /* Close mobile sidebar */
  closeMobileSidebar();
}

/* ── Build sidebar nav ───────────────────────────────────────── */
function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const user = window.currentUser;
  if (!user) return;

  nav.innerHTML = '';

  /* Main sections */
  const mainSections = ['dashboard','rooms','guests','calendar'];
  /* Management sections */
  const manageSections = ['content','experiences','enquiries'];
  /* Admin-only */
  const adminSections = ['users'];

  const groups = [
    { label: 'Overview',    items: mainSections },
    { label: 'Management',  items: manageSections },
    { label: 'Admin',       items: adminSections },
  ];

  groups.forEach(group => {
    const visibleItems = group.items.filter(s => staffCanSee(s));
    if (!visibleItems.length) return;

    const labelEl = document.createElement('span');
    labelEl.className = 'sidebar-section-label';
    labelEl.textContent = group.label;
    nav.appendChild(labelEl);

    visibleItems.forEach(sectionId => {
      const s   = SECTIONS[sectionId];
      const btn = document.createElement('button');
      btn.className        = 'sidebar-nav-item';
      btn.dataset.section  = sectionId;
      btn.setAttribute('aria-label', s.label);
      btn.innerHTML = `
        <span class="sidebar-nav-icon">${s.icon}</span>
        <span>${s.label}</span>
        ${sectionId === 'enquiries' ? '<span class="sidebar-nav-badge hidden" id="enquiry-badge">0</span>' : ''}
      `;
      btn.addEventListener('click', () => navigateTo(sectionId));
      nav.appendChild(btn);
    });
  });

  /* User info at bottom */
  const userSection = document.getElementById('sidebar-user');
  if (userSection && user) {
    const initials = (user.name || user.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', staff: 'Staff' }[user.role] || user.role;
    document.getElementById('sidebar-avatar').textContent     = initials;
    document.getElementById('sidebar-user-name').textContent  = user.name || user.email;
    document.getElementById('sidebar-user-role').textContent  = roleLabel;
  }
}

/* ── Build section view containers ──────────────────────────── */
function buildViewContainers() {
  const main = document.getElementById('main-content');
  if (!main) return;
  Object.keys(SECTIONS).forEach(id => {
    if (!document.getElementById('view-' + id)) {
      const div = document.createElement('div');
      div.id        = 'view-' + id;
      div.className = 'section-view page-content';
      main.appendChild(div);
    }
  });
}

/* ── Mobile sidebar ──────────────────────────────────────────── */
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Toast notifications ─────────────────────────────────────── */
function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ── Update enquiry badge count ──────────────────────────────── */
async function updateEnquiryBadge() {
  const badge = document.getElementById('enquiry-badge');
  if (!badge) return;
  const enqs    = await DB.getEnquiries();
  const newCount = enqs.filter(e => e.status === 'new').length;
  badge.textContent = newCount;
  badge.classList.toggle('hidden', newCount === 0);
}

/* ── Topbar date ─────────────────────────────────────────────── */
function updateTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/* ── Init admin shell ────────────────────────────────────────── */
window.initAdminShell = async function () {
  buildViewContainers();
  buildSidebar();
  updateTopbarDate();
  await updateEnquiryBadge();

  /* Hamburger */
  document.getElementById('btn-hamburger')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  /* Navigate to dashboard */
  await navigateTo('dashboard');
};
