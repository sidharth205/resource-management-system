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

  const urlParams = new URLSearchParams(window.location.search);
  let projectId = urlParams.get('id');

  if (!projectId) {
    try {
      const pRes = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (pRes.ok) {
        const projs = await pRes.json();
        if (Array.isArray(projs) && projs.length > 0) {
          projectId = projs[0].id;
        } else {
          window.location.href = '../projects/index.html';
          return;
        }
      } else {
        window.location.href = '../projects/index.html';
        return;
      }
    } catch (e) {
      window.location.href = '../projects/index.html';
      return;
    }
  }

  const createTaskLink = document.getElementById('createTaskLink');
  if (createTaskLink) {
    createTaskLink.href = `../tasks/index.html?projectId=${projectId}`;
  }

  const userCache = new Map();

  async function getUserInfo(empId) {
    if (userCache.has(empId)) return userCache.get(empId);
    try {
      const res = await fetch(`${BASE_URL}/api/users/${empId}`, { headers });
      if (res.ok) {
        const u = await res.json();
        userCache.set(empId, u);
        return u;
      }
    } catch (e) {}
    const fallback = { name: empId, emp_id: empId };
    userCache.set(empId, fallback);
    return fallback;
  }

  async function loadProjectHero() {
    try {
      const res = await fetch(`${BASE_URL}/api/employee/projects/${projectId}`, { headers });
      if (!res.ok) {
        document.getElementById('projectName').textContent = 'Project Not Found';
        return;
      }
      const p = await res.json();

      document.getElementById('projectName').textContent = p.name || 'Untitled Project';
      document.getElementById('projectDesc').textContent = p.description || 'No description provided.';
      document.getElementById('projectIdTag').textContent = `ID: ${p.id}`;

      const st = (p.status || 'active').toLowerCase();
      const badge = document.getElementById('projectStatusBadge');
      badge.textContent = st.charAt(0).toUpperCase() + st.slice(1);
      badge.className = 'status-badge ' + (st === 'completed' ? 'status-completed' : (st === 'pending' ? 'status-pending' : 'status-active'));

      const sDate = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A';
      const eDate = p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A';
      document.getElementById('projectDates').textContent = `${sDate} to ${eDate}`;

      const pct = Number(p.progress) || 0;
      document.getElementById('projectProgressText').textContent = `${pct}%`;
      document.getElementById('projectProgressFill').style.width = `${pct}%`;
    } catch (e) {
      document.getElementById('projectName').textContent = 'Error Loading Project';
    }
  }

  async function loadTasksAndTeam() {
    const taskListEl = document.getElementById('projectTasksList');
    const teamListEl = document.getElementById('teamMembersList');

    try {
      const res = await fetch(`${BASE_URL}/api/tasks?projectId=${projectId}`, { headers });
      if (!res.ok) {
        taskListEl.innerHTML = '<div class="empty-state">Unable to load tasks</div>';
        teamListEl.innerHTML = '<div class="empty-state">Unable to load team</div>';
        return;
      }

      const tasks = await res.json();
      if (!Array.isArray(tasks)) {
        taskListEl.innerHTML = '<div class="empty-state">No tasks available</div>';
        teamListEl.innerHTML = '<div class="empty-state">No team members yet</div>';
        return;
      }

      document.getElementById('taskCountSubtitle').textContent = `${tasks.length} tasks tracked`;

      if (tasks.length === 0) {
        taskListEl.innerHTML = '<div class="empty-state">No tasks created yet for this project.</div>';
        teamListEl.innerHTML = '<div class="empty-state">No team members assigned to tasks yet.</div>';
        return;
      }

      taskListEl.innerHTML = '';
      tasks.forEach(t => {
        const prio = (t.priority || 'medium').toLowerCase();
        let prioClass = 'pill-medium';
        if (prio === 'high') prioClass = 'pill-high';
        else if (prio === 'low') prioClass = 'pill-low';

        const st = (t.status || 'pending').toLowerCase();
        let stClass = 'pill-pending';
        let stLabel = 'Pending';
        if (st === 'completed') {
          stClass = 'pill-completed';
          stLabel = 'Completed';
        } else if (st === 'in_progress') {
          stClass = 'pill-progress';
          stLabel = 'In Progress';
        }

        const dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date';
        const card = document.createElement('div');
        card.className = 'task-mini-card';
        card.innerHTML = `
          <div>
            <div class="task-mini-title">${escapeHtml(t.title || 'Untitled Task')}</div>
            <div class="task-mini-meta">Assignee: ${escapeHtml(t.assigned_to || 'Unassigned')} • Due: ${dueStr}</div>
          </div>
          <div class="task-mini-badges">
            <span class="pill-badge ${prioClass}">${prio}</span>
            <span class="pill-badge ${stClass}">${stLabel}</span>
          </div>
        `;
        taskListEl.appendChild(card);
      });

      const memberIds = Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean)));
      if (memberIds.length === 0) {
        teamListEl.innerHTML = '<div class="empty-state">No team members assigned to tasks yet.</div>';
        return;
      }

      teamListEl.innerHTML = '';
      for (const empId of memberIds) {
        const user = await getUserInfo(empId);
        const name = user.name || empId;
        const uInit = name.charAt(0).toUpperCase();
        const roleStr = user.role || user.designations?.name || 'Contributor';

        const row = document.createElement('div');
        row.className = 'member-row';
        row.innerHTML = `
          <div class="member-info">
            <div class="member-avatar">${uInit}</div>
            <div class="member-name-block">
              <span class="member-name">${escapeHtml(name)}</span>
              <span class="member-role">${escapeHtml(roleStr)} • ${escapeHtml(empId)}</span>
            </div>
          </div>
          <button class="btn-remove-member" data-id="${empId}">Remove</button>
        `;
        teamListEl.appendChild(row);
      }

      teamListEl.querySelectorAll('.btn-remove-member').forEach(b => {
        b.addEventListener('click', async () => {
          const empId = b.getAttribute('data-id');
          await removeMember(empId);
        });
      });
    } catch (e) {
      taskListEl.innerHTML = '<div class="empty-state">Network error loading project tasks</div>';
      teamListEl.innerHTML = '<div class="empty-state">Network error loading team</div>';
    }
  }

  async function removeMember(empId) {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${empId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        showToast('Member removed from project');
        await loadTasksAndTeam();
      } else {
        showToast('Could not remove member');
      }
    } catch (e) {
      showToast('Network error removing member');
    }
  }

  async function loadActivity() {
    const actListEl = document.getElementById('projectActivityList');
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/activity`, { headers });
      if (res.ok) {
        const activities = await res.json();
        if (Array.isArray(activities) && activities.length > 0) {
          actListEl.innerHTML = '';
          activities.forEach(item => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
              <span class="timeline-icon">${item.icon || '📌'}</span>
              <div class="timeline-content">${escapeHtml(item.description || '')}</div>
              <span class="timeline-time">${item.time_ago || ''}</span>
            `;
            actListEl.appendChild(div);
          });
          return;
        }
      }
    } catch (e) {}

    try {
      const fallbackRes = await fetch(`${BASE_URL}/api/activities`, { headers });
      if (fallbackRes.ok) {
        const logs = await fallbackRes.json();
        if (Array.isArray(logs) && logs.length > 0) {
          actListEl.innerHTML = '';
          logs.slice(0, 4).forEach(item => {
            const name = item.profiles?.name || item.emp_id || 'Team Member';
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
              <span class="timeline-icon">⚡</span>
              <div class="timeline-content"><strong>${escapeHtml(name)}</strong>: ${escapeHtml(item.action || item.module || 'Updated')}</div>
              <span class="timeline-time">${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
            `;
            actListEl.appendChild(div);
          });
          return;
        }
      }
    } catch (e) {}

    actListEl.innerHTML = '<div class="empty-state">No recent activity recorded for this project.</div>';
  }

  async function populateEmployeeDropdown() {
    try {
      const res = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
      if (res.ok) {
        const emps = await res.json();
        if (Array.isArray(emps)) {
          const select = document.getElementById('memberSelect');
          emps.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.emp_id;
            opt.textContent = `${emp.name || emp.emp_id} (${emp.emp_id})`;
            select.appendChild(opt);
          });
        }
      }
    } catch (e) {}
  }

  const memberModal = document.getElementById('addMemberModal');
  const openMemberModalBtn = document.getElementById('openAddMemberBtn');
  const closeMemberModalBtn = document.getElementById('closeMemberModalBtn');
  const cancelMemberModalBtn = document.getElementById('cancelMemberModalBtn');
  const addMemberForm = document.getElementById('addMemberForm');

  function openModal() {
    memberModal.classList.add('show');
  }

  function closeModal() {
    memberModal.classList.remove('show');
    addMemberForm.reset();
  }

  if (openMemberModalBtn) openMemberModalBtn.addEventListener('click', openModal);
  if (closeMemberModalBtn) closeMemberModalBtn.addEventListener('click', closeModal);
  if (cancelMemberModalBtn) cancelMemberModalBtn.addEventListener('click', closeModal);

  memberModal.addEventListener('click', (e) => {
    if (e.target === memberModal) closeModal();
  });

  addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empId = document.getElementById('memberSelect').value;
    const roleOnProject = document.getElementById('roleOnProject').value.trim();

    if (!empId || !roleOnProject) {
      showToast('Please select employee and enter role');
      return;
    }

    const btn = document.getElementById('submitMemberBtn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ empId, roleOnProject })
      });

      if (res.ok) {
        showToast('Member added! Assign a task to display them in team list.');
        closeModal();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add member');
      }
    } catch (err) {
      showToast('Network error adding member');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add to Project';
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

  await loadProjectHero();
  await loadTasksAndTeam();
  await Promise.all([loadActivity(), populateEmployeeDropdown()]);
});
