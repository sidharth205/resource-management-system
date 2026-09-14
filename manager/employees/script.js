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

  let allEmployees = [];

  async function loadEmployeesData() {
    const permTbody = document.getElementById('permTableBody');
    const internTbody = document.getElementById('internTableBody');

    try {
      const res = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
      if (res.status === 403) {
        permTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Lacks permission to view full employee directory.</td></tr>';
        internTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Lacks permission to view full employee directory.</td></tr>';
        loadStatsFallback();
        return;
      }
      if (!res.ok) {
        permTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Unable to load employees</td></tr>';
        internTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Unable to load interns</td></tr>';
        return;
      }

      allEmployees = await res.json();
      if (!Array.isArray(allEmployees)) {
        allEmployees = [];
      }

      populateDepartmentFilter(allEmployees);
      updateStats(allEmployees);
      renderTables();
    } catch (e) {
      permTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Network error loading employees</td></tr>';
      internTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Network error loading interns</td></tr>';
    }

    loadActiveNowStat();
  }

  function populateDepartmentFilter(employees) {
    const deptSelect = document.getElementById('departmentFilter');
    const depts = new Set();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });

    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      deptSelect.appendChild(opt);
    });
  }

  function updateStats(employees) {
    const total = employees.length;
    let permCount = 0;
    let internCount = 0;

    employees.forEach(e => {
      const type = (e.employment_type || '').toLowerCase();
      const roleStr = (e.role || '').toLowerCase();
      if (type === 'intern' || type === 'internship' || roleStr.includes('intern')) {
        internCount++;
      } else {
        permCount++;
      }
    });

    document.getElementById('pillTotal').textContent = total;
    document.getElementById('pillPermanent').textContent = permCount;
    document.getElementById('pillInterns').textContent = internCount;
  }

  async function loadActiveNowStat() {
    try {
      const res = await fetch(`${BASE_URL}/api/dashboard/admin-stats`, { headers });
      if (res.ok) {
        const stats = await res.json();
        document.getElementById('pillActiveNow').textContent = stats.activeUsersToday ?? '--';
      } else {
        document.getElementById('pillActiveNow').textContent = '--';
      }
    } catch (e) {
      document.getElementById('pillActiveNow').textContent = '--';
    }
  }

  function loadStatsFallback() {
    document.getElementById('pillTotal').textContent = '--';
    document.getElementById('pillPermanent').textContent = '--';
    document.getElementById('pillInterns').textContent = '--';
    document.getElementById('pillActiveNow').textContent = '--';
  }

  function renderTables() {
    const permTbody = document.getElementById('permTableBody');
    const internTbody = document.getElementById('internTableBody');
    if (!permTbody || !internTbody) return;

    const query = (document.getElementById('empSearchInput').value || '').toLowerCase().trim();
    const deptVal = (document.getElementById('departmentFilter').value || 'all').toLowerCase();

    const filtered = allEmployees.filter(e => {
      const name = (e.name || '').toLowerCase();
      const empId = (e.emp_id || '').toLowerCase();
      const dept = (e.department || '').toLowerCase();

      const queryMatch = name.includes(query) || empId.includes(query) || dept.includes(query);
      const deptMatch = deptVal === 'all' || dept === deptVal;

      return queryMatch && deptMatch;
    });

    const permList = [];
    const internList = [];

    filtered.forEach(e => {
      const type = (e.employment_type || '').toLowerCase();
      const roleStr = (e.role || '').toLowerCase();
      if (type === 'intern' || type === 'internship' || roleStr.includes('intern')) {
        internList.push(e);
      } else {
        permList.push(e);
      }
    });

    renderTableSection(permTbody, permList, 'No permanent employees found');
    renderTableSection(internTbody, internList, 'No interns found');
  }

  function renderTableSection(tbody, list, emptyMsg) {
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${emptyMsg}</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    list.forEach(emp => {
      const tr = document.createElement('tr');
      const name = emp.name || 'Unnamed';
      const initial = name.charAt(0).toUpperCase();
      const email = emp.email || '';
      const empId = emp.emp_id || '--';
      const dept = emp.department || 'General';
      const joinDate = emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A';
      const st = (emp.status || 'active').toLowerCase();
      const badgeClass = st === 'active' ? 'status-active' : 'status-inactive';

      tr.innerHTML = `
        <td>
          <div class="emp-name-cell">
            <div class="emp-avatar-sm">${initial}</div>
            <div class="emp-info-col">
              <span class="emp-title">${escapeHtml(name)}</span>
              <span class="emp-email-sub">${escapeHtml(email)}</span>
            </div>
          </div>
        </td>
        <td><span class="id-badge">${escapeHtml(empId)}</span></td>
        <td>${escapeHtml(dept)}</td>
        <td>${joinDate}</td>
        <td><span class="status-badge ${badgeClass}">${escapeHtml(st)}</span></td>
        <td><button class="view-profile-btn" data-id="${escapeHtml(empId)}">View</button></td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        openEmployeeModal(empId);
      });
    });
  }

  async function openEmployeeModal(empId) {
    const modal = document.getElementById('empModal');
    modal.classList.add('show');

    document.getElementById('modalName').textContent = 'Loading...';
    document.getElementById('modalRole').textContent = '--';
    document.getElementById('modalEmpId').textContent = empId;
    document.getElementById('modalEmail').textContent = '--';
    document.getElementById('modalDept').textContent = '--';
    document.getElementById('modalType').textContent = '--';
    document.getElementById('modalJoiningDate').textContent = '--';

    try {
      const res = await fetch(`${BASE_URL}/api/users/${empId}`, { headers });
      if (res.ok) {
        const u = await res.json();
        const name = u.name || empId;
        document.getElementById('modalAvatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('modalName').textContent = name;
        document.getElementById('modalRole').textContent = u.designations?.name || u.role || 'Employee';
        document.getElementById('modalEmail').textContent = u.email || 'N/A';
        document.getElementById('modalDept').textContent = u.department || 'N/A';
        document.getElementById('modalType').textContent = u.employment_type || 'Full-time';
        document.getElementById('modalJoiningDate').textContent = u.joining_date ? new Date(u.joining_date).toLocaleDateString() : 'N/A';

        const st = (u.status || 'active').toLowerCase();
        const badge = document.getElementById('modalStatus');
        badge.textContent = st.charAt(0).toUpperCase() + st.slice(1);
        badge.className = 'status-badge ' + (st === 'active' ? 'status-active' : 'status-inactive');
      }
    } catch (e) {}
  }

  const empModal = document.getElementById('empModal');
  const closeEmpModalBtn = document.getElementById('closeEmpModalBtn');

  if (closeEmpModalBtn) {
    closeEmpModalBtn.addEventListener('click', () => {
      empModal.classList.remove('show');
    });
  }

  empModal.addEventListener('click', (e) => {
    if (e.target === empModal) empModal.classList.remove('show');
  });

  document.getElementById('empSearchInput').addEventListener('input', renderTables);
  document.getElementById('departmentFilter').addEventListener('change', renderTables);

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

  await loadEmployeesData();
});
