/* ============================================================
   VENAD HOUSE ADMIN — users.js
   User management and permission controls.
   Super admin: manage all users + set admin permissions.
   Admin: set staff permissions only.
   ============================================================ */

let usersData    = [];
let editingUserId = null;

window.loadUsers = async function () {
  const view = document.getElementById('view-users');
  if (!view) return;

  if (!isSuperAdmin()) {
    view.innerHTML = `<div class="empty-state card card-pad">
      <div class="empty-state-icon">⚙</div>
      <div class="empty-state-title">Access Restricted</div>
      <div class="empty-state-sub">Only super admins can manage users and roles.</div>
    </div>`;
    return;
  }

  usersData = await DB.getUsers();

  view.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-title">Users &amp; Permissions</div>
        <div class="page-header-sub">Manage who can access the admin dashboard and what they can see.</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-accent" onclick="openUserModal()">+ Add User</button>
      </div>
    </div>

    <div class="stack" id="users-list"></div>

    <!-- Add/Edit User Modal -->
    <div class="modal-overlay" id="user-modal">
      <div class="modal">
        <div class="modal-header">
          <div><div class="modal-title" id="user-modal-title">Add User</div></div>
          <button class="modal-close" onclick="closeModal('user-modal')">✕</button>
        </div>
        <div class="modal-body" id="user-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('user-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="saveUser()">Save</button>
        </div>
      </div>
    </div>

    <!-- Permissions Modal -->
    <div class="modal-overlay" id="perms-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <div>
            <div class="modal-title" id="perms-modal-title">Manage Permissions</div>
            <div class="modal-subtitle" id="perms-modal-sub"></div>
          </div>
          <button class="modal-close" onclick="closeModal('perms-modal')">✕</button>
        </div>
        <div class="modal-body" id="perms-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('perms-modal')">Cancel</button>
          <button class="btn btn-primary" onclick="savePermissions()">Save Permissions</button>
        </div>
      </div>
    </div>
  `;

  renderUsersList();
};

/* ── Render users list ───────────────────────────────────────── */
function renderUsersList() {
  const list = document.getElementById('users-list');
  if (!list) return;

  const roleConfig = {
    super_admin: { label: 'Super Admin', badge: 'badge-terra' },
    admin:       { label: 'Admin',       badge: 'badge-forest' },
    staff:       { label: 'Staff',       badge: 'badge-grey'  },
  };

  const groups = [
    { role: 'super_admin', title: 'Super Admins' },
    { role: 'admin',       title: 'Admins' },
    { role: 'staff',       title: 'Staff' },
  ];

  list.innerHTML = groups.map(group => {
    const groupUsers = usersData.filter(u => u.role === group.role);
    if (!groupUsers.length) return '';

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${group.title}</div>
          <span class="badge badge-grey">${groupUsers.length}</span>
        </div>
        <div class="card-body-sm">
          ${groupUsers.map(user => {
            const rc      = roleConfig[user.role] || roleConfig.staff;
            const isMe    = user.uid === window.currentUser?.uid;
            const initials = (user.name||user.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

            return `
              <div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 0;border-bottom:1px solid var(--border);">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border);
                            display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;
                            color:var(--txt-soft);flex-shrink:0;">
                  ${initials}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.875rem;font-weight:600;">${user.name || '—'} ${isMe?'<span class="badge badge-blue" style="font-size:0.6rem;">You</span>':''}</div>
                  <div class="t-small t-muted">${user.email}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
                  <span class="badge ${rc.badge}">${rc.label}</span>
                  <span class="badge ${user.isActive?'badge-green':'badge-grey'}">${user.isActive?'Active':'Inactive'}</span>
                </div>
                <div style="display:flex;gap:0.35rem;">
                  ${!isMe ? `<button class="btn btn-outline btn-sm" onclick="openUserModal('${user.uid}')">Edit</button>` : ''}
                  ${user.role !== 'super_admin' || !isMe ? `
                    <button class="btn btn-ghost btn-sm" onclick="openPermsModal('${user.uid}')">Permissions</button>` : ''}
                  ${!isMe ? `<button class="btn btn-danger btn-sm" onclick="deleteUserConfirm('${user.uid}')">Remove</button>` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/* ── Add/Edit user modal ─────────────────────────────────────── */
window.openUserModal = function (uid) {
  editingUserId = uid || null;
  const user = uid ? usersData.find(u => u.uid === uid) : null;
  document.getElementById('user-modal-title').textContent = user ? 'Edit User' : 'Add User';

  document.getElementById('user-modal-body').innerHTML = `
    <div class="stack">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label form-label-required">Full Name</label>
          <input class="form-input" id="um-name" value="${user?.name||''}" placeholder="Full name">
        </div>
        <div class="form-group">
          <label class="form-label form-label-required">Email</label>
          <input class="form-input" id="um-email" type="email" value="${user?.email||''}" placeholder="email@example.com" ${user?'readonly':''}>
        </div>
      </div>
      ${!user ? `
      <div class="form-group">
        <label class="form-label form-label-required">Password</label>
        <input class="form-input" id="um-password" type="password" placeholder="Minimum 6 characters">
        <span class="form-hint">The user can change this after first login.</span>
      </div>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-select" id="um-role">
            <option value="staff"       ${user?.role==='staff'?'selected':''}>Staff</option>
            <option value="admin"       ${user?.role==='admin'?'selected':''}>Admin</option>
            <option value="super_admin" ${user?.role==='super_admin'?'selected':''}>Super Admin</option>
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;padding-top:1.5rem;">
          <label class="toggle-wrap">
            <span class="toggle-label-sm">Active account</span>
            <div class="toggle">
              <input type="checkbox" id="um-active" ${user?.isActive!==false?'checked':''}>
              <div class="toggle-track"></div>
            </div>
          </label>
        </div>
      </div>
      ${user ? `
      <div class="form-group">
        <label class="form-label">Reset Password</label>
        <input class="form-input" id="um-password" type="password" placeholder="Leave blank to keep current password">
      </div>` : ''}
    </div>
  `;

  openModal('user-modal');
};

window.saveUser = async function () {
  const name     = document.getElementById('um-name')?.value.trim();
  const email    = document.getElementById('um-email')?.value.trim();
  const password = document.getElementById('um-password')?.value;
  const role     = document.getElementById('um-role')?.value || 'staff';
  const isActive = document.getElementById('um-active')?.checked !== false;

  if (!name || !email) {
    showToast('Name and email are required.', 'error');
    return;
  }

  if (!editingUserId && !password) {
    showToast('Password is required for new users.', 'error');
    return;
  }

  if (password && password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  const data = { name, email, role, isActive };

  try {
    if (editingUserId) {
      await DB.updateUser(editingUserId, data);
      showToast('User updated.', 'success');
    } else {
      /* Demo mode: just add to DB. Firebase mode: create Auth user first */
      await DB.addUser({ ...data, password });
      showToast('User added. They can log in with these credentials.', 'success');
    }

    usersData = await DB.getUsers();
    closeModal('user-modal');
    renderUsersList();
  } catch (err) {
    showToast(err.message || 'Failed to save user.', 'error');
  }
};

window.deleteUserConfirm = async function (uid) {
  const user = usersData.find(u => u.uid === uid);
  if (!confirm(`Remove "${user?.name || user?.email}"? They will lose all access immediately.`)) return;

  try {
    await DB.deleteUser(uid);
    usersData = await DB.getUsers();
    showToast('User removed.', 'success');
    renderUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

/* ── Permissions modal ───────────────────────────────────────── */
let permsUserId = null;

window.openPermsModal = function (uid) {
  permsUserId     = uid;
  const user      = usersData.find(u => u.uid === uid);
  const isStaff   = user?.role === 'staff';
  const isAdminU  = user?.role === 'admin';

  document.getElementById('perms-modal-title').textContent =
    `${isStaff ? 'Staff' : 'Admin'} Permissions`;
  document.getElementById('perms-modal-sub').textContent =
    user?.name || user?.email || '';

  let permRows = '';

  if (isStaff) {
    /* Admin controls what staff can see */
    const p = user.staffPermissions || {};
    const staffPerms = [
      { key:'canViewBookings',  label:'View Current Bookings',  sub:'See who is currently checked in'     },
      { key:'canViewGuests',    label:'View Guest Log',         sub:'Access the full guest history'       },
      { key:'canViewCalendar',  label:'View Availability Calendar', sub:'See room availability by date'   },
      { key:'canViewRooms',     label:'View Room Details',      sub:'See room pricing and descriptions'   },
      { key:'canViewEnquiries', label:'View Enquiries',         sub:'See new and existing enquiries'      },
    ];
    permRows = staffPerms.map(perm => `
      <div class="perm-row">
        <div class="perm-row-info">
          <div class="perm-row-title">${perm.label}</div>
          <div class="perm-row-sub">${perm.sub}</div>
        </div>
        <label class="toggle-wrap">
          <div class="toggle">
            <input type="checkbox" id="perm-${perm.key}" ${p[perm.key]?'checked':''}>
            <div class="toggle-track"></div>
          </div>
        </label>
      </div>`).join('');

  } else if (isAdminU && isSuperAdmin()) {
    /* Super admin controls what admin can access */
    const p = user.adminPermissions || {};
    const adminPerms = [
      { key:'rooms',       label:'Room Management',        sub:'Add, edit, and manage rooms'           },
      { key:'guests',      label:'Guest Management',       sub:'Add and edit guest records'             },
      { key:'calendar',    label:'Calendar & Availability',sub:'Block dates and manage availability'    },
      { key:'content',     label:'Content & Images',       sub:'Edit site text and images'              },
      { key:'experiences', label:'Experiences',            sub:'Manage guest experiences'               },
      { key:'enquiries',   label:'Enquiries',              sub:'View and manage guest enquiries'        },
    ];
    permRows = adminPerms.map(perm => `
      <div class="perm-row">
        <div class="perm-row-info">
          <div class="perm-row-title">${perm.label}</div>
          <div class="perm-row-sub">${perm.sub}</div>
        </div>
        <label class="toggle-wrap">
          <div class="toggle">
            <input type="checkbox" id="perm-${perm.key}" ${p[perm.key]!==false?'checked':''}>
            <div class="toggle-track"></div>
          </div>
        </label>
      </div>`).join('');
  }

  document.getElementById('perms-modal-body').innerHTML = `
    <div style="margin-bottom:0.75rem;" class="t-small t-muted">
      ${isStaff
        ? 'Toggle each section to control what this staff member can see when they log in.'
        : 'Toggle each section to control what this admin can access.'}
    </div>
    <div>${permRows}</div>
  `;

  openModal('perms-modal');
};

window.savePermissions = async function () {
  const user    = usersData.find(u => u.uid === permsUserId);
  const isStaff = user?.role === 'staff';

  const keys = isStaff
    ? ['canViewBookings','canViewGuests','canViewCalendar','canViewRooms','canViewEnquiries']
    : ['rooms','guests','calendar','content','experiences','enquiries'];

  const perms = {};
  keys.forEach(key => {
    perms[key] = document.getElementById(`perm-${key}`)?.checked || false;
  });

  const updateData = isStaff
    ? { staffPermissions: perms }
    : { adminPermissions: perms };

  await DB.updateUser(permsUserId, updateData);
  usersData = await DB.getUsers();
  closeModal('perms-modal');
  showToast('Permissions saved.', 'success');
  renderUsersList();
};
