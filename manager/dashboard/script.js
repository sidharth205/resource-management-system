document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');

  if (!token || role !== 'manager') {
    window.location.replace('../../admin/login/index.html');
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
      window.location.replace('../../admin/login/index.html');
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
  const userNameEl = document.getElementById('userName');
  const headerNameEl = document.getElementById('headerName');

  if (userNameEl) userNameEl.textContent = storedName.toUpperCase();
  if (headerNameEl) headerNameEl.textContent = storedName;

  try {
    const profRes = await fetch(`${BASE_URL}/api/employee/profile`, { headers });
    if (profRes.ok) {
      const prof = await profRes.json();
      if (prof && prof.name) {
        if (userNameEl) userNameEl.textContent = prof.name.toUpperCase();
        if (headerNameEl) headerNameEl.textContent = window.getFirstName(prof.name);
      }
    }
  } catch (e) {}

  let managerProjects = [];
  const managerProjectIds = new Set();
  const employeeNames = new Map();

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
          renderProjectOverview(managerProjects);
        } else {
          document.getElementById('statProjects').textContent = '0';
          renderProjectOverview([]);
        }
      } else {
        document.getElementById('statProjects').textContent = '--';
        renderProjectOverview([]);
      }
    } catch (e) {
      document.getElementById('statProjects').textContent = '--';
      renderProjectOverview([]);
    }
  }

  function renderProjectOverview(projects) {
    const container = document.getElementById('projectOverviewContent');
    if (!container) return;
    if (projects.length === 0) {
      container.innerHTML = '<div class="empty-state">No projects found</div>';
      return;
    }

    const statusCounts = projects.reduce((counts, project) => {
      const status = (project.status || 'planning').toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    const statusOrder = ['active', 'planning', 'pending', 'completed', 'delayed'];
    const statusSummary = statusOrder
      .filter(status => statusCounts[status])
      .map(status => `
        <div class="project-status-summary">
          <span class="project-status-dot status-dot-${status}"></span>
          <span>${escapeHtml(status.replace('_', ' '))}</span>
          <strong>${statusCounts[status]}</strong>
        </div>
      `).join('');

    const projectRows = projects.slice(0, 4).map(project => {
      const status = (project.status || 'planning').toLowerCase();
      const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No start date';
      const endDate = project.end_date ? new Date(project.end_date).toLocaleDateString() : 'No end date';
      return `
        <a class="project-overview-row" href="../project-details/index.html?id=${encodeURIComponent(project.id)}">
          <span class="project-overview-name">${escapeHtml(project.name || 'Untitled Project')}</span>
          <span class="project-overview-dates">${escapeHtml(startDate)} - ${escapeHtml(endDate)}</span>
          <span class="project-status-badge status-badge-${status}">${escapeHtml(status.replace('_', ' '))}</span>
        </a>
      `;
    }).join('');

    container.innerHTML = `
      <div class="project-overview-summary">
        <div class="project-total-count"><strong>${projects.length}</strong><span>Total projects</span></div>
        <div class="project-status-summary-list">${statusSummary}</div>
      </div>
      <div class="project-overview-list">${projectRows}</div>
    `;
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
        .filter(t => (t.status || '').toLowerCase() !== 'completed')
        .sort((a, b) => {
          const priorityRank = { high: 0, medium: 1 };
          return (priorityRank[(a.priority || '').toLowerCase()] ?? 2) - (priorityRank[(b.priority || '').toLowerCase()] ?? 2);
        })
        .filter(t => ['high', 'medium'].includes((t.priority || '').toLowerCase()));

      if (urgentTasks.length === 0) {
        urgentContainer.innerHTML = '<div class="empty-state">No urgent tasks pending</div>';
        return;
      }

      urgentContainer.innerHTML = '';
      urgentTasks.forEach(t => {
        const row = document.createElement('a');
        row.className = 'task-quick-row';
        row.href = `../tasks/index.html?projectId=${encodeURIComponent(t.project_id)}`;
        row.innerHTML = `
          <div>
            <div class="task-quick-title">${escapeHtml(t.title || 'Untitled Task')}</div>
            <div class="task-quick-meta">Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date'}</div>
          </div>
          <span class="pill-badge pill-${(t.priority || '').toLowerCase()}">${escapeHtml(t.priority || '')}</span>
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

      try {
        const employeeRes = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
        if (employeeRes.ok) {
          const employees = await employeeRes.json();
          if (Array.isArray(employees)) {
            employees.forEach(employee => employeeNames.set(employee.emp_id, employee.name || employee.emp_id));
          }
        }
      } catch (e) {}

      const myTimesheets = allTs.filter(ts => managerProjectIds.has(ts.project_id));
      const pendingTs = myTimesheets.filter(ts => !ts.approved_at);
      document.getElementById('statTimesheets').textContent = pendingTs.length;

      const list = document.getElementById('pendingTimesheetsList');
      if (!list) return;

      if (pendingTs.length === 0) {
        list.innerHTML = '<div class="empty-state">All timesheets are reviewed</div>';
        return;
      }

      list.innerHTML = '<div class="ts-list-header"><span>EMPLOYEE</span><span>LOGGED</span><span>CREATED AT</span></div>';
      pendingTs.forEach(ts => {
        const row = document.createElement('div');
        row.className = 'ts-quick-row';
        row.tabIndex = 0;
        row.setAttribute('role', 'link');
        row.addEventListener('click', () => {
          window.location.href = `../timesheets/index.html?timesheetId=${encodeURIComponent(ts.id)}`;
        });
        row.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            row.click();
          }
        });
        const createdAt = ts.created_at ? new Date(ts.created_at).toLocaleString() : 'N/A';
        const employeeName = employeeNames.get(ts.employee_id) || ts.employee_id || 'Employee';
        row.innerHTML = `
          <div class="ts-info">
            <span class="ts-emp-name">${escapeHtml(employeeName)}</span>
            <span class="ts-details">EMP ID: ${escapeHtml(ts.employee_id || 'N/A')}</span>
          </div>
          <div class="ts-logged">
            <strong>${ts.hours || 0} hrs</strong>
            <span>${ts.date ? new Date(ts.date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <span class="ts-created-at">${escapeHtml(createdAt)}</span>
        `;
        list.appendChild(row);
      });
    } catch (e) {
      document.getElementById('statTimesheets').textContent = '--';
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
