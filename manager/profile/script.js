document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');

  if (!token || role !== 'manager') {
    window.location.href = '../../admin/login/index.html';
    return;
  }

  const BASE_URL = 'http:' + String.fromCharCode(47, 47) + 'localhost:3000';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const mobileBtn = document.getElementById('mobileToggleBtn');
  const sidebar = document.getElementById('sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers
        });
      } catch (e) {}
      localStorage.clear();
      window.location.href = '../../admin/login/index.html';
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  const storedName = localStorage.getItem('user_name') || 'Manager';
  const initial = storedName.charAt(0).toUpperCase();
  const userNameEl = document.getElementById('userName');
  const headerNameEl = document.getElementById('headerName');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const headerAvatar = document.getElementById('headerAvatar');

  if (userNameEl) userNameEl.textContent = storedName.toUpperCase();
  if (headerNameEl) headerNameEl.textContent = storedName;
  if (sidebarAvatar) sidebarAvatar.textContent = initial;
  if (headerAvatar) headerAvatar.textContent = initial;

  try {
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, { headers });
    if (notifRes.ok) {
      const notifs = await notifRes.json();
      if (Array.isArray(notifs)) {
        const unreadCount = notifs.filter(n => !n.is_read).length;
        if (unreadCount > 0) {
          const bellBadge = document.getElementById('bellBadge');
          const navBadge = document.getElementById('navNotifBadge');
          if (bellBadge) bellBadge.style.display = 'block';
          if (navBadge) {
            navBadge.textContent = unreadCount;
            navBadge.style.display = 'inline-block';
          }
        }
      }
    }
  } catch (e) {}

  let currentEmpId = '';

  async function loadProfile() {
    try {
      const res = await fetch(`${BASE_URL}/api/employee/profile`, { headers });
      if (!res.ok) return;
      const p = await res.json();
      if (!p) return;

      currentEmpId = p.emp_id || '';
      const name = p.name || storedName;
      const pInit = name.charAt(0).toUpperCase();

      document.getElementById('profName').textContent = name;
      document.getElementById('profBigAvatar').textContent = pInit;
      if (userNameEl) userNameEl.textContent = name.toUpperCase();
      if (headerNameEl) headerNameEl.textContent = name;
      if (sidebarAvatar) sidebarAvatar.textContent = pInit;
      if (headerAvatar) headerAvatar.textContent = pInit;

      const desig = p.designations?.name || p.role || 'Project Manager';
      document.getElementById('profDesignation').textContent = desig;
      document.getElementById('profRoleBadge').textContent = desig;

      document.getElementById('profEmpId').textContent = p.emp_id || '--';
      document.getElementById('profEmail').textContent = p.email || '--';
      document.getElementById('profDept').textContent = p.department || '--';
      document.getElementById('profType').textContent = p.employment_type || 'Full-time';
      document.getElementById('profJoiningDate').textContent = p.joining_date ? new Date(p.joining_date).toLocaleDateString() : 'N/A';

      const st = (p.status || 'active').toLowerCase();
      const statusPill = document.getElementById('profStatus');
      statusPill.textContent = st === 'active' ? 'Active Account' : 'Inactive';
      statusPill.className = 'status-pill ' + (st === 'active' ? 'status-active' : 'status-inactive');
    } catch (e) {}
  }

  async function loadActivity() {
    const feed = document.getElementById('userActivityFeed');
    try {
      const res = await fetch(`${BASE_URL}/api/employee/activity`, { headers });
      if (res.ok) {
        const activities = await res.json();
        if (Array.isArray(activities) && activities.length > 0) {
          feed.innerHTML = '';
          activities.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-row';
            div.innerHTML = `
              <div class="activity-dot"></div>
              <div class="activity-content">
                ${escapeHtml(item.description || item.action || 'System action logged')}
                <span class="activity-time">${item.time_ago || (item.created_at ? new Date(item.created_at).toLocaleString() : '')}</span>
              </div>
            `;
            feed.appendChild(div);
          });
          return;
        }
      }
    } catch (e) {}

    try {
      const fallbackRes = await fetch(`${BASE_URL}/api/activities`, { headers });
      if (fallbackRes.ok) {
        const acts = await fallbackRes.json();
        if (Array.isArray(acts) && acts.length > 0) {
          feed.innerHTML = '';
          acts.slice(0, 5).forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-row';
            div.innerHTML = `
              <div class="activity-dot"></div>
              <div class="activity-content">
                ${escapeHtml(item.action || item.module || 'Activity')}
                <span class="activity-time">${item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span>
              </div>
            `;
            feed.appendChild(div);
          });
          return;
        }
      }
    } catch (e) {}

    feed.innerHTML = '<div class="empty-state">No recent activity logged for this account</div>';
  }

  const passwordForm = document.getElementById('passwordForm');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      showToast('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      showToast('Password must contain at least one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    const btn = document.getElementById('updatePasswordBtn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      const res = await fetch(`${BASE_URL}/api/employee/profile/update-password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password: newPassword })
      });

      if (res.ok) {
        showToast('Password updated successfully!');
        passwordForm.reset();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update password');
      }
    } catch (err) {
      showToast('Network error updating password');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  await loadProfile();
  await loadActivity();
});
