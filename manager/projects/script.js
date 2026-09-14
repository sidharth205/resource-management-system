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

  let allProjects = [];

  async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (!res.ok) {
        grid.innerHTML = '<div class="empty-state">Unable to load projects</div>';
        return;
      }
      allProjects = await res.json();
      if (!Array.isArray(allProjects) || allProjects.length === 0) {
        grid.innerHTML = '<div class="empty-state">No projects found. Click "+ New Project" to get started.</div>';
        return;
      }
      renderProjects(allProjects);
    } catch (e) {
      grid.innerHTML = '<div class="empty-state">Network error loading projects</div>';
    }
  }

  function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const statusVal = (document.getElementById('statusFilter').value || 'all').toLowerCase();

    const filtered = projects.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
      const st = (p.status || 'active').toLowerCase();
      const statusMatch = statusVal === 'all' || st === statusVal;
      return nameMatch && statusMatch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state">No matching projects found</div>';
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(p => {
      const st = (p.status || 'active').toLowerCase();
      let badgeClass = 'status-active';
      let badgeText = 'Active';
      if (st === 'completed') {
        badgeClass = 'status-completed';
        badgeText = 'Completed';
      } else if (st === 'pending') {
        badgeClass = 'status-pending';
        badgeText = 'Pending';
      }

      const pInit = (p.name || 'P').substring(0, 2).toUpperCase();
      const pct = Number(p.progress) || 0;
      const startStr = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A';
      const endStr = p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A';

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-card-header">
          <div class="project-icon-box">${pInit}</div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <h3 class="project-title">${escapeHtml(p.name || 'Untitled Project')}</h3>
        <p class="project-desc">${escapeHtml(p.description || 'No description provided')}</p>
        <div class="project-dates">
          <span>📅 ${startStr} - ${endStr}</span>
        </div>
        <div class="project-progress-box">
          <div class="progress-header">
            <span>Progress</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
        <div class="project-card-footer">
          <a href="../project-details/index.html?id=${p.id}" class="details-link-btn">View Details →</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  document.getElementById('searchInput').addEventListener('input', () => {
    renderProjects(allProjects);
  });

  document.getElementById('statusFilter').addEventListener('change', () => {
    renderProjects(allProjects);
  });

  const modal = document.getElementById('projectModal');
  const openModalBtn = document.getElementById('openNewProjectBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const projectForm = document.getElementById('projectForm');

  function openModal() {
    modal.classList.add('show');
    document.getElementById('projectName').focus();
  }

  function closeModal() {
    modal.classList.remove('show');
    projectForm.reset();
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    const startDate = document.getElementById('startDate').value || null;
    const endDate = document.getElementById('endDate').value || null;

    if (!name) {
      showToast('Project name is required');
      return;
    }

    const submitBtn = document.getElementById('submitProjectBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, description, startDate, endDate })
      });

      if (res.ok) {
        showToast('Project created successfully!');
        closeModal();
        await loadProjects();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create project');
      }
    } catch (err) {
      showToast('Network error creating project');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Project';
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

  await loadProjects();
});
