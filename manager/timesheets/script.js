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

  let managerProjects = [];
  const managerProjectIds = new Set();
  const projectMap = new Map();
  const employeeMap = new Map();
  const taskMap = new Map();
  let myTimesheets = [];

  async function loadProjects() {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (res.ok) {
        managerProjects = await res.json();
        if (Array.isArray(managerProjects)) {
          const filterSelect = document.getElementById('projectFilter');
          managerProjects.forEach(p => {
            managerProjectIds.add(p.id);
            projectMap.set(p.id, p.name || 'Untitled Project');

            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name || 'Untitled Project';
            filterSelect.appendChild(opt);
          });
        }
      }
    } catch (e) {}
  }

  async function loadEmployees() {
    try {
      const res = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
      if (res.ok) {
        const emps = await res.json();
        if (Array.isArray(emps)) {
          emps.forEach(emp => {
            employeeMap.set(emp.emp_id, emp.name || emp.emp_id);
          });
        }
      }
    } catch (e) {}
  }

  async function loadTasks() {
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`, { headers });
      if (res.ok) {
        const tasks = await res.json();
        if (Array.isArray(tasks)) {
          tasks.forEach(t => {
            taskMap.set(t.id, t.title || 'Untitled Task');
          });
        }
      }
    } catch (e) {}
  }

  async function loadTimesheets() {
    const tbody = document.getElementById('timesheetsTableBody');
    try {
      const res = await fetch(`${BASE_URL}/api/timesheets`, { headers });
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Unable to load timesheets</td></tr>';
        return;
      }
      const allTs = await res.json();
      if (!Array.isArray(allTs)) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No timesheets recorded</td></tr>';
        return;
      }

      myTimesheets = allTs.filter(ts => managerProjectIds.has(ts.project_id));
      updateStats(myTimesheets);
      renderTimesheets();
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Network error loading timesheets</td></tr>';
    }
  }

  function updateStats(timesheets) {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalHours = 0;

    timesheets.forEach(ts => {
      const st = (ts.status || '').toLowerCase();
      const hrs = parseFloat(ts.hours) || 0;
      totalHours += hrs;

      if (st === 'approved') approvedCount++;
      else if (st === 'rejected') rejectedCount++;
      else pendingCount++;
    });

    document.getElementById('statPending').textContent = pendingCount;
    document.getElementById('statTotalHours').textContent = totalHours.toFixed(1);
    document.getElementById('statApproved').textContent = approvedCount;
    document.getElementById('statRejected').textContent = rejectedCount;
  }

  function renderTimesheets() {
    const tbody = document.getElementById('timesheetsTableBody');
    if (!tbody) return;

    const query = (document.getElementById('timesheetSearch').value || '').toLowerCase().trim();
    const statusVal = (document.getElementById('statusFilter').value || 'all').toLowerCase();
    const projectVal = document.getElementById('projectFilter').value;
    const fromDate = document.getElementById('dateFrom').value;
    const toDate = document.getElementById('dateTo').value;

    const filtered = myTimesheets.filter(ts => {
      const empName = (employeeMap.get(ts.employee_id) || ts.employee_id || '').toLowerCase();
      const projName = (projectMap.get(ts.project_id) || ts.project_id || '').toLowerCase();
      const remarks = (ts.remarks || '').toLowerCase();

      const matchesQuery = empName.includes(query) || projName.includes(query) || remarks.includes(query);
      const st = (ts.status || 'pending').toLowerCase();
      const matchesStatus = statusVal === 'all' || st === statusVal;
      const matchesProj = projectVal === 'all' || String(ts.project_id) === String(projectVal);

      let matchesDate = true;
      if (ts.date) {
        const tsDate = new Date(ts.date).toISOString().split('T')[0];
        if (fromDate && tsDate < fromDate) matchesDate = false;
        if (toDate && tsDate > toDate) matchesDate = false;
      }

      return matchesQuery && matchesStatus && matchesProj && matchesDate;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No matching timesheets found</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(ts => {
      const tr = document.createElement('tr');
      const empDisplay = employeeMap.get(ts.employee_id) || ts.employee_id || 'Employee';
      const projDisplay = projectMap.get(ts.project_id) || 'Project';
      const taskDisplay = taskMap.get(ts.task_id) || (ts.task_id ? `Task #${ts.task_id}` : 'General Log');
      const dateStr = ts.date ? new Date(ts.date).toLocaleDateString() : 'N/A';
      const hours = ts.hours ?? 0;
      const remarksStr = ts.remarks || '--';

      const st = (ts.status || 'pending').toLowerCase();
      let badgeClass = 'status-pending';
      let badgeLabel = 'Pending';
      if (st === 'approved') {
        badgeClass = 'status-approved';
        badgeLabel = 'Approved';
      } else if (st === 'rejected') {
        badgeClass = 'status-rejected';
        badgeLabel = 'Rejected';
      }

      let actionsHtml = '';
      if (st === 'pending') {
        actionsHtml = `
          <div class="action-btns-cell">
            <button class="btn-approve" data-id="${ts.id}">Approve</button>
            <button class="btn-reject" data-id="${ts.id}">Reject</button>
          </div>
        `;
      } else {
        actionsHtml = `<span class="reviewed-text">Reviewed</span>`;
      }

      tr.innerHTML = `
        <td class="emp-cell">${escapeHtml(empDisplay)}</td>
        <td>${escapeHtml(projDisplay)}</td>
        <td><strong>${escapeHtml(taskDisplay)}</strong><br><small style="color:#64748b;">${dateStr}</small></td>
        <td><span class="hours-badge">${hours} hrs</span></td>
        <td>${escapeHtml(remarksStr)}</td>
        <td><span class="status-badge ${badgeClass}">${badgeLabel}</span></td>
        <td>${actionsHtml}</td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-approve').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        await updateTimesheet(id, 'approved', 'Approved by manager');
      });
    });

    tbody.querySelectorAll('.btn-reject').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        openRejectModal(id);
      });
    });
  }

  async function updateTimesheet(id, status, remarks) {
    try {
      const res = await fetch(`${BASE_URL}/api/timesheets/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, remarks })
      });
      if (res.ok) {
        showToast(`Timesheet ${status}!`);
        await loadTimesheets();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update timesheet');
      }
    } catch (e) {
      showToast('Network error updating timesheet');
    }
  }

  const rejectModal = document.getElementById('rejectModal');
  const closeRejectModalBtn = document.getElementById('closeRejectModalBtn');
  const cancelRejectModalBtn = document.getElementById('cancelRejectModalBtn');
  const rejectForm = document.getElementById('rejectForm');

  function openRejectModal(id) {
    document.getElementById('rejectTimesheetId').value = id;
    document.getElementById('rejectReason').value = '';
    rejectModal.classList.add('show');
    document.getElementById('rejectReason').focus();
  }

  function closeRejectModal() {
    rejectModal.classList.remove('show');
  }

  if (closeRejectModalBtn) closeRejectModalBtn.addEventListener('click', closeRejectModal);
  if (cancelRejectModalBtn) cancelRejectModalBtn.addEventListener('click', closeRejectModal);

  rejectModal.addEventListener('click', (e) => {
    if (e.target === rejectModal) closeRejectModal();
  });

  rejectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('rejectTimesheetId').value;
    const reason = document.getElementById('rejectReason').value.trim();

    if (!reason) {
      showToast('Please provide a reason for rejection');
      return;
    }

    const btn = document.getElementById('confirmRejectBtn');
    btn.disabled = true;
    btn.textContent = 'Rejecting...';

    await updateTimesheet(id, 'rejected', reason);
    btn.disabled = false;
    btn.textContent = 'Reject Timesheet';
    closeRejectModal();
  });

  document.getElementById('timesheetSearch').addEventListener('input', renderTimesheets);
  document.getElementById('statusFilter').addEventListener('change', renderTimesheets);
  document.getElementById('projectFilter').addEventListener('change', renderTimesheets);
  document.getElementById('dateFrom').addEventListener('change', renderTimesheets);
  document.getElementById('dateTo').addEventListener('change', renderTimesheets);

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

  await Promise.all([loadProjects(), loadEmployees(), loadTasks()]);
  await loadTimesheets();
});
