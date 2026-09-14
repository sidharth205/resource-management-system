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

  let managerProjects = [];
  const managerProjectIds = new Set();
  let myTasks = [];
  let myTimesheets = [];

  async function loadData() {
    try {
      const projRes = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (projRes.ok) {
        managerProjects = await projRes.json();
        if (Array.isArray(managerProjects)) {
          managerProjects.forEach(p => managerProjectIds.add(p.id));
        }
      }
    } catch (e) {}

    try {
      const taskRes = await fetch(`${BASE_URL}/api/tasks`, { headers });
      if (taskRes.ok) {
        const allTasks = await taskRes.json();
        if (Array.isArray(allTasks)) {
          myTasks = allTasks.filter(t => managerProjectIds.has(t.project_id));
        }
      }
    } catch (e) {}

    try {
      const tsRes = await fetch(`${BASE_URL}/api/timesheets`, { headers });
      if (tsRes.ok) {
        const allTs = await tsRes.json();
        if (Array.isArray(allTs)) {
          myTimesheets = allTs.filter(ts => managerProjectIds.has(ts.project_id));
        }
      }
    } catch (e) {}

    renderReports();
  }

  function renderReports() {
    document.getElementById('statProjects').textContent = managerProjects.length;
    document.getElementById('statTasks').textContent = myTasks.length;

    let totalHours = 0;
    myTimesheets.forEach(ts => {
      totalHours += parseFloat(ts.hours) || 0;
    });
    document.getElementById('statHours').textContent = totalHours.toFixed(1);

    let totalProg = 0;
    managerProjects.forEach(p => {
      totalProg += Number(p.progress) || 0;
    });
    const avgProg = managerProjects.length > 0 ? Math.round(totalProg / managerProjects.length) : 0;
    document.getElementById('statAvgCompletion').textContent = `${avgProg}%`;

    renderDonutChart(managerProjects);
    renderBarChart(managerProjects);
    renderSummaryTable(managerProjects, myTasks);
  }

  function renderDonutChart(projects) {
    const total = projects.length;
    document.getElementById('repDonutTotal').textContent = total;

    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    projects.forEach(p => {
      const st = (p.status || '').toLowerCase();
      const prog = Number(p.progress) || 0;
      if (st === 'completed' || prog === 100) completed++;
      else if (st === 'active' || prog > 0) inProgress++;
      else pending++;
    });

    document.getElementById('repLegCompleted').textContent = completed;
    document.getElementById('repLegProgress').textContent = inProgress;
    document.getElementById('repLegPending').textContent = pending;

    const C = 2 * Math.PI * 75;
    const segComp = document.getElementById('repSegCompleted');
    const segProg = document.getElementById('repSegProgress');
    const segPend = document.getElementById('repSegPending');

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

  function renderBarChart(projects) {
    const container = document.getElementById('barChartContainer');
    if (!container) return;

    if (projects.length === 0) {
      container.innerHTML = '<div class="empty-state">No projects to compare</div>';
      return;
    }

    container.innerHTML = '';
    projects.slice(0, 5).forEach(p => {
      const pct = Number(p.progress) || 0;
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-title">${escapeHtml(p.name || 'Untitled Project')}</span>
          <span class="bar-value">${pct}%</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function renderSummaryTable(projects, tasks) {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;

    if (projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No projects reported</td></tr>';
      return;
    }

    const taskCountMap = new Map();
    tasks.forEach(t => {
      const count = taskCountMap.get(t.project_id) || 0;
      taskCountMap.set(t.project_id, count + 1);
    });

    tbody.innerHTML = '';
    projects.forEach(p => {
      const tr = document.createElement('tr');
      const sDate = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A';
      const eDate = p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A';
      const tasksCount = taskCountMap.get(p.id) || 0;
      const pct = Number(p.progress) || 0;

      const st = (p.status || 'active').toLowerCase();
      let badgeClass = 'status-active';
      let badgeLabel = 'Active';
      if (st === 'completed') {
        badgeClass = 'status-completed';
        badgeLabel = 'Completed';
      } else if (st === 'pending') {
        badgeClass = 'status-pending';
        badgeLabel = 'Pending';
      }

      tr.innerHTML = `
        <td><strong>${escapeHtml(p.name || 'Untitled Project')}</strong></td>
        <td>${sDate} - ${eDate}</td>
        <td>${tasksCount} tasks</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:70px; height:6px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:#4A90E2; border-radius:4px;"></div>
            </div>
            <span>${pct}%</span>
          </div>
        </td>
        <td><span class="status-badge ${badgeClass}">${badgeLabel}</span></td>
        <td><a href="../project-details/index.html?id=${p.id}" class="details-btn">Inspect →</a></td>
      `;
      tbody.appendChild(tr);
    });
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

  await loadData();
});
