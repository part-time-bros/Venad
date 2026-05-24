/* ============================================================
   VENAD HOUSE ADMIN — auth.js
   Authentication layer.
   Firebase Auth in production, demo session in localStorage.
   ============================================================ */

/* Matches USE_FIREBASE flag in db.js */
const USE_FIREBASE_AUTH = true;

let fbAuth, fbSignIn, fbSignOut, fbOnAuthStateChanged;

async function initAuth() {
  if (!USE_FIREBASE_AUTH) return;
  const app  = await import('./firebase-config.js');
  const mod  = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  fbAuth               = app.auth;
  fbSignIn             = mod.signInWithEmailAndPassword;
  fbSignOut            = mod.signOut;
  fbOnAuthStateChanged = mod.onAuthStateChanged;
}

/* ── Current session ─────────────────────────────────────────── */
/* currentUser is set after login and cleared on logout */
window.currentUser = null;

/* Demo users for localStorage mode */
const DEMO_USERS = [
  { uid:'demo_superadmin', email:'anandhu@venadhome.com',      password:'admin123', name:'Anandhu',         role:'super_admin' },
  { uid:'demo_admin',      email:'anan@venadhome.com',         password:'admin123', name:'Ananthakrishnan', role:'admin' },
  { uid:'demo_staff',      email:'rajan@venadhome.com',        password:'staff123', name:'Rajan',           role:'staff' },
];

/* ── Login ───────────────────────────────────────────────────── */
async function login(email, password) {
  if (USE_FIREBASE_AUTH) {
    /* Firebase Auth sign-in */
    const cred = await fbSignIn(fbAuth, email, password);
    const uid  = cred.user.uid;
    /* Load role from Firestore users collection */
    const users  = await DB.getUsers();
    const profile = users.find(u => u.uid === uid) || { role: 'staff', name: email };
    window.currentUser = { uid, email, ...profile };
    return window.currentUser;
  }

  /* Demo mode */
  const demo = DEMO_USERS.find(u => u.email === email && u.password === password);
  if (!demo) throw new Error('Invalid email or password.');
  /* Load full profile from demo DB */
  const users   = await DB.getUsers();
  const profile = users.find(u => u.uid === demo.uid) || demo;
  window.currentUser = { ...demo, ...profile };
  localStorage.setItem('vh_session', JSON.stringify(window.currentUser));
  return window.currentUser;
}

/* ── Logout ──────────────────────────────────────────────────── */
async function logout() {
  if (USE_FIREBASE_AUTH) await fbSignOut(fbAuth);
  window.currentUser = null;
  localStorage.removeItem('vh_session');
  showLoginScreen();
}

/* ── Restore session ─────────────────────────────────────────── */
async function restoreSession() {
  if (USE_FIREBASE_AUTH) {
    return new Promise(resolve => {
      fbOnAuthStateChanged(fbAuth, async user => {
        if (user) {
          const users   = await DB.getUsers();
          const profile = users.find(u => u.uid === user.uid) || { role:'staff', name:user.email };
          window.currentUser = { uid: user.uid, email: user.email, ...profile };
          resolve(window.currentUser);
        } else {
          window.currentUser = null;
          resolve(null);
        }
      });
    });
  }

  /* Demo mode — restore from localStorage */
  const raw = localStorage.getItem('vh_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    /* Re-load profile in case permissions changed */
    const users   = await DB.getUsers();
    const profile = users.find(u => u.uid === session.uid);
    window.currentUser = profile ? { ...session, ...profile } : session;
    return window.currentUser;
  } catch { return null; }
}

/* ── Permission helpers ──────────────────────────────────────── */
function hasRole(...roles) {
  return window.currentUser && roles.includes(window.currentUser.role);
}

function isSuperAdmin() { return hasRole('super_admin'); }
function isAdmin()      { return hasRole('super_admin', 'admin'); }

/* Check if staff can see a section */
function staffCanSee(section) {
  if (!window.currentUser) return false;
  if (isAdmin()) return true;
  /* For staff, check their assigned permissions */
  const perms = window.currentUser.staffPermissions || {};
  const map = {
    dashboard:   true,                      /* staff always sees dashboard */
    rooms:       perms.canViewRooms,
    guests:      perms.canViewGuests,
    calendar:    perms.canViewCalendar,
    enquiries:   perms.canViewEnquiries,
    content:     false,                     /* staff never sees content */
    experiences: perms.canViewRooms,
    users:       false,                     /* staff never sees users */
  };
  return !!map[section];
}

/* ── UI helpers ──────────────────────────────────────────────── */
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-shell').classList.add('hidden');
}

function showAdminShell() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-shell').classList.remove('hidden');
}

/* ── Init ────────────────────────────────────────────────────── */
(async () => {
  await initAuth();

  const user = await restoreSession();

  if (user) {
    showAdminShell();
    if (window.initAdminShell) window.initAdminShell();
  } else {
    showLoginScreen();
  }

  /* Login form submit */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl    = document.getElementById('login-error');
      const btn      = loginForm.querySelector('button[type="submit"]');

      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent  = 'Signing in…';

      try {
        await login(email, password);
        showAdminShell();
        if (window.initAdminShell) window.initAdminShell();
      } catch (err) {
        errEl.textContent = err.message || 'Login failed. Check your credentials.';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  /* Logout button */
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

})();
