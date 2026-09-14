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
    const profRes = await fetch(`${BASE_URL}/api/employee/profile`, { headers });
    if (profRes.ok) {
      const prof = await profRes.json();
      if (prof && prof.name) {
        if (userNameEl) userNameEl.textContent = prof.name.toUpperCase();
        if (headerNameEl) headerNameEl.textContent = prof.name;
        const pInit = prof.name.charAt(0).toUpperCase();
        if (sidebarAvatar) sidebarAvatar.textContent = pInit;
        if (headerAvatar) headerAvatar.textContent = pInit;
      }
    }
  } catch (e) {}

  let allNotifications = [];
  let currentFilter = 'all';

  async function loadNotifications() {
    const feed = document.getElementById('notificationsFeed');
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { headers });
      if (!res.ok) {
        feed.innerHTML = '<div class="empty-state">Unable to load notifications</div>';
        return;
      }
      allNotifications = await res.json();
      if (!Array.isArray(allNotifications)) {
        allNotifications = [];
      }

      updateBadges(allNotifications);
      renderNotifications();
    } catch (e) {
      feed.innerHTML = '<div class="empty-state">Network error loading notifications</div>';
    }
  }

  function updateBadges(notifs) {
    const unreadCount = notifs.filter(n => !n.is_read).length;
    const pill = document.getElementById('unreadCounterPill');
    const bellBadge = document.getElementById('bellBadge');
    const navBadge = document.getElementById('navNotifBadge');

    if (pill) pill.textContent = `${unreadCount} Unread`;
    if (bellBadge) bellBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    if (navBadge) {
      navBadge.textContent = unreadCount;
      navBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  function renderNotifications() {
    const feed = document.getElementById('notificationsFeed');
    if (!feed) return;

    let list = allNotifications;
    if (currentFilter === 'unread') {
      list = list.filter(n => !n.is_read);
    } else if (currentFilter === 'task') {
      list = list.filter(n => (n.type || '').toLowerCase().includes('task') || (n.title || '').toLowerCase().includes('task'));
    } else if (currentFilter === 'timesheet') {
      list = list.filter(n => (n.type || '').toLowerCase().includes('timesheet') || (n.title || '').toLowerCase().includes('timesheet'));
    }

    if (list.length === 0) {
      feed.innerHTML = '<div class="empty-state">No notifications to display</div>';
      return;
    }

    feed.innerHTML = '';
    list.forEach(n => {
      const item = document.createElement('div');
      item.className = 'notif-item' + (!n.is_read ? ' unread' : '');

      const type = (n.type || '').toLowerCase();
      const titleLower = (n.title || '').toLowerCase();

      let dotClass = 'dot-blue';
      if (type.includes('task') || titleLower.includes('task')) dotClass = 'dot-purple';
      else if (type.includes('timesheet') || titleLower.includes('timesheet')) dotClass = 'dot-amber';
      else if (type.includes('success') || titleLower.includes('approved')) dotClass = 'dot-green';

      const timeStr = n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
      const readBtnHtml = !n.is_read ? `<button class="btn-read-toggle" data-id="${n.id}">Mark as read</button>` : '';

      item.innerHTML = `
        <div class="notif-dot-col">
          <span class="dot-icon ${dotClass}"></span>
        </div>
        <div class="notif-body">
          <div class="notif-header">
            <span class="notif-title">${escapeHtml(n.title || 'Notification')}</span>
            <span class="notif-time">${timeStr}</span>
          </div>
          <p class="notif-msg">${escapeHtml(n.message || '')}</p>
          ${readBtnHtml}
        </div>
      `;

      feed.appendChild(item);
    });

    feed.querySelectorAll('.btn-read-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await markAsRead(id);
      });
    });
  }

  async function markAsRead(id) {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers
      });
      if (res.ok) {
        const item = allNotifications.find(n => String(n.id) === String(id));
        if (item) item.is_read = true;
        updateBadges(allNotifications);
        renderNotifications();
      }
    } catch (e) {}
  }

  document.getElementById('markAllBtn').addEventListener('click', async () => {
    const unread = allNotifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      showToast('No unread notifications');
      return;
    }

    const btn = document.getElementById('markAllBtn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    for (const n of unread) {
      try {
        await fetch(`${BASE_URL}/api/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers
        });
        n.is_read = true;
      } catch (e) {}
    }

    btn.disabled = false;
    btn.textContent = '✓ Mark All as Read';
    showToast('All notifications marked as read');
    updateBadges(allNotifications);
    renderNotifications();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderNotifications();
    });
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

  await loadNotifications();
});
