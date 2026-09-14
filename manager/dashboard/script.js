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

  let managerProjects = [];
  const managerProjectIds = new Set();

  async function loadNotifications() {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { headers });
      if (!res.ok) return;
      const notifs = await res.json();
      if (Array.isArray(notifs)) {
        const unreadCount = notifs.filter(n => !n.is_read).length;
        const bellBadge = document.getElementById('bellBadge');
        const navBadge = document.getElementById('navNotifBadge');
        if (unreadCount > 0) {
          if (bellBadge) bellBadge.style.display = 'block';
          if (navBadge) {
            navBadge.textContent = unreadCount;
            navBadge.style.display = 'inline-block';
          }
        }
      }
    } catch (e) {}
  }

  async function loadProjectsAndMetrics() {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (res.ok) {
        managerProjects = await res.json();
        if (Array.isArray(managerProjects)) {
          managerProjects.forEach(p => managerProjectIds.add(p.id));
          document.getElementById('statProjects').textContent = managerProjects.length;
          renderDonutChart(managerProjects);
          renderProjectBars(managerProjects);
        } else {
          document.getElementById('statProjects').textContent = '0';
        }
      } else {
        document.getElementById('statProjects').textContent = '--';
      }
    } catch (e) {
      document.getElementById('statProjects').textContent = '--';
    }
  }

  function renderDonutChart(projects) {
    const total = projects.length;
    const totalCountEl = document.getElementById('donutTotalCount');
    if (totalCountEl) totalCountEl.textContent = total;

    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    projects.forEach(p => {
      const st = (p.status || '').toLowerCase();
      const prog = Number(p.progress) || 0;
      if (st === 'completed' || prog === 100) {
        completed++;
      } else if (st === 'active' || prog > 0) {
        inProgress++;
      } else {
        pending++;
      }
    });

    document.getElementById('legendCompleted').textContent = completed;
    document.getElementById('legendProgress').textContent = inProgress;
    document.getElementById('legendPending').textContent = pending;

    const C = 2 * Math.PI * 75;
    const segComp = document.getElementById('segCompleted');
    const segProg = document.getElementById('segProgress');
    const segPend = document.getElementById('segPending');

    if (total === 0) {
      segComp.style.strokeDasharray = `0 ${C}`;
      segProg.style.strokeDasharray = `0 ${C}`;
      segPend.style.strokeDasharray = `0 ${C}`;
      return;
    }

    const compLen = (completed / total) * C;
    const progLen = (inProgress / total) * C;
    const pendLen = (pending / total) * C;

    let offset = 0;
    segComp.style.strokeDasharray = `${compLen} ${C}`;
    segComp.style.strokeDashoffset = `0`;

    offset -= compLen;
    segProg.style.strokeDasharray = `${progLen} ${C}`;
    segProg.style.strokeDashoffset = `${offset}`;

    offset -= progLen;
    segPend.style.strokeDasharray = `${pendLen} ${C}`;
    segPend.style.strokeDashoffset = `${offset}`;
  }

  function renderProjectBars(projects) {
    const list = document.getElementById('projectBarsList');
    if (!list) return;
    if (projects.length === 0) {
      list.innerHTML = '<div class="empty-state">No active projects found</div>';
      return;
    }
    list.innerHTML = '';
    projects.slice(0, 4).forEach(p => {
      const pct = Number(p.progress) || 0;
      const row = document.createElement('div');
      row.className = 'project-progress-row';
      row.innerHTML = `
        <div class="project-row-top">
          <a href="../project-details/index.html?id=${p.id}" class="project-row-name">${escapeHtml(p.name || 'Untitled Project')}</a>
          <span class="project-row-pct">${pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  async function loadTasks() {
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`, { headers });
      if (!res.ok) {
        document.getElementById('statTasks').textContent = '--';
        return;
      }
      const allTasks = await res.json();
      if (!Array.isArray(allTasks)) {
        document.getElementById('statTasks').textContent = '--';
        return;
      }

      const myTasks = allTasks.filter(t => managerProjectIds.has(t.project_id));
      const activeTasks = myTasks.filter(t => (t.status || '').toLowerCase() !== 'completed');
      document.getElementById('statTasks').textContent = activeTasks.length;

      const urgentContainer = document.getElementById('urgentTasksList');
      if (!urgentContainer) return;

      const urgentTasks = myTasks
        .filter(t => (t.priority || '').toLowerCase() === 'high' && (t.status || '').toLowerCase() !== 'completed')
        .slice(0, 4);

      if (urgentTasks.length === 0) {
        urgentContainer.innerHTML = '<div class="empty-state">No urgent tasks pending</div>';
        return;
      }

      urgentContainer.innerHTML = '';
      urgentTasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'task-quick-row';
        row.innerHTML = `
          <div>
            <div class="task-quick-title">${escapeHtml(t.title || 'Untitled Task')}</div>
            <div class="task-quick-meta">Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date'}</div>
          </div>
          <span class="pill-badge pill-high">High</span>
        `;
        urgentContainer.appendChild(row);
      });
    } catch (e) {
      document.getElementById('statTasks').textContent = '--';
    }
  }

  async function loadTimesheets() {
    try {
      const res = await fetch(`${BASE_URL}/api/timesheets`, { headers });
      if (!res.ok) {
        document.getElementById('statTimesheets').textContent = '--';
        return;
      }
      const allTs = await res.json();
      if (!Array.isArray(allTs)) {
        document.getElementById('statTimesheets').textContent = '--';
        return;
      }

      const myTimesheets = allTs.filter(ts => managerProjectIds.has(ts.project_id));
      const pendingTs = myTimesheets.filter(ts => (ts.status || '').toLowerCase() === 'pending');
      document.getElementById('statTimesheets').textContent = pendingTs.length;

      const list = document.getElementById('pendingTimesheetsList');
      if (!list) return;

      if (pendingTs.length === 0) {
        list.innerHTML = '<div class="empty-state">All timesheets are reviewed</div>';
        return;
      }

      list.innerHTML = '';
      pendingTs.slice(0, 3).forEach(ts => {
        const row = document.createElement('div');
        row.className = 'ts-quick-row';
        row.innerHTML = `
          <div class="ts-info">
            <span class="ts-emp-name">${escapeHtml(ts.employee_id || 'Employee')}</span>
            <span class="ts-details">${ts.hours || 0} hrs • ${ts.date ? new Date(ts.date).toLocaleDateString() : ''}</span>
          </div>
          <div class="ts-actions">
            <button class="btn-approve" data-id="${ts.id}">Approve</button>
            <button class="btn-reject" data-id="${ts.id}">Reject</button>
          </div>
        `;
        list.appendChild(row);
      });

      list.querySelectorAll('.btn-approve').forEach(b => {
        b.addEventListener('click', async () => {
          await updateTimesheetStatus(b.getAttribute('data-id'), 'approved');
        });
      });

      list.querySelectorAll('.btn-reject').forEach(b => {
        b.addEventListener('click', async () => {
          await updateTimesheetStatus(b.getAttribute('data-id'), 'rejected');
        });
      });
    } catch (e) {
      document.getElementById('statTimesheets').textContent = '--';
    }
  }

  async function updateTimesheetStatus(id, status) {
    try {
      const res = await fetch(`${BASE_URL}/api/timesheets/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, remarks: `${status.charAt(0).toUpperCase() + status.slice(1)} by manager` })
      });
      if (res.ok) {
        showToast(`Timesheet ${status}`);
        await loadTimesheets();
      } else {
        showToast('Failed to update timesheet');
      }
    } catch (e) {
      showToast('Network error updating timesheet');
    }
  }

  async function loadTeamCount() {
    try {
      const res = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
      if (res.ok) {
        const emps = await res.json();
        if (Array.isArray(emps)) {
          document.getElementById('statTeam').textContent = emps.length;
          return;
        }
      }
    } catch (e) {}

    try {
      const statsRes = await fetch(`${BASE_URL}/api/dashboard/admin-stats`, { headers });
      if (statsRes.ok) {
        const s = await statsRes.json();
        document.getElementById('statTeam').textContent = s.totalEmployees ?? '--';
      } else {
        document.getElementById('statTeam').textContent = '--';
      }
    } catch (e) {
      document.getElementById('statTeam').textContent = '--';
    }
  }

  async function loadActivities() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    try {
      const res = await fetch(`${BASE_URL}/api/activities`, { headers });
      if (!res.ok) {
        feed.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
      }
      const acts = await res.json();
      if (!Array.isArray(acts) || acts.length === 0) {
        feed.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
      }

      feed.innerHTML = '';
      acts.slice(0, 5).forEach(act => {
        let rawTime = act.created_at;
        if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) {
          rawTime += 'Z';
        }
        const d = new Date(rawTime);
        const timeStr = !isNaN(d.getTime())
          ? d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';

        const name = act.profiles?.name || act.emp_id || 'User';
        const initial = name.charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-avatar">${initial}</div>
          <div class="activity-content">
            <strong>${escapeHtml(name)}</strong>: ${escapeHtml(act.action || act.module || 'Updated system')}
            <span class="activity-time">${timeStr}</span>
          </div>
        `;
        feed.appendChild(item);
      });
    } catch (e) {
      feed.innerHTML = '<div class="empty-state">No recent activity</div>';
    }
  }

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
  await loadProjectsAndMetrics();
  await Promise.all([
    loadTasks(),
    loadTimesheets(),
    loadTeamCount(),
    loadActivities()
  ]);
});
