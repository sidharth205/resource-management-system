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

  if (userNameEl) userNameEl.textContent = storedName;
  if (headerNameEl) headerNameEl.textContent = storedName;

  try {
    const profRes = await fetch(`${BASE_URL}/api/employee/profile`, { headers });
    if (profRes.ok) {
      const prof = await profRes.json();
      if (prof && prof.name) {
        if (userNameEl) userNameEl.textContent = prof.name;
        if (headerNameEl) headerNameEl.textContent = window.getFirstName(prof.name);
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

    updateProjectSummary(allProjects.length ? allProjects : projects);

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
      } else if (st === 'delayed') {
        badgeClass = 'status-delayed';
        badgeText = 'Delayed';
      }

      const startStr = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A';
      const endStr = p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A';

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-card-header">
          <div class="project-icon-box"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <h3 class="project-title">${escapeHtml(p.name || 'Untitled Project')}</h3>
        <p class="project-desc">${escapeHtml(p.description || 'No description provided')}</p>
        <div class="project-dates">
          <span><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg> ${startStr} - ${endStr}</span>
        </div>
        <div class="project-card-footer">
          <a href="../project-details/index.html?id=${p.id}" class="details-link-btn">Open project <span aria-hidden="true">→</span></a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function updateProjectSummary(projects) {
    const counts = projects.reduce((result, project) => {
      const status = (project.status || 'pending').toLowerCase();
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});
    document.getElementById('totalProjectsCount').textContent = projects.length;
    document.getElementById('activeProjectsCount').textContent = counts.active || 0;
    document.getElementById('pendingProjectsCount').textContent = (counts.pending || 0) + (counts.planning || 0);
    document.getElementById('completedProjectsCount').textContent = counts.completed || 0;
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
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const addProjectMemberBtn = document.getElementById('addProjectMemberBtn');
  const skipMembersBtn = document.getElementById('skipMembersBtn');
  const finishMembersBtn = document.getElementById('finishMembersBtn');
  const employeeSearchInput = document.getElementById('employeeSearchInput');
  const searchEmployeesBtn = document.getElementById('searchEmployeesBtn');
  const employeeSearchResults = document.getElementById('employeeSearchResults');
  const newMemberRole = document.getElementById('newMemberRole');
  const assignedMembersList = document.getElementById('assignedMembersList');
  const employeeAssignmentModal = document.getElementById('employeeAssignmentModal');
  const closeMembersBtn = document.getElementById('closeMembersBtn');
  let createdProjectId = null;
  let availableEmployees = [];

  function openModal() {
    modal.classList.add('show');
    projectForm.hidden = false;
    createdProjectId = null;
    startDateInput.min = '';
    startDateInput.max = '';
    endDateInput.min = '';
    endDateInput.max = '';
    document.getElementById('projectName').focus();
  }

  function closeModal() {
    modal.classList.remove('show');
    projectForm.reset();
    projectForm.hidden = false;
    createdProjectId = null;
    startDateInput.min = '';
    startDateInput.max = '';
    endDateInput.min = '';
    endDateInput.max = '';
    assignedMembersList.innerHTML = '';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  function syncProjectDateLimits() {
    endDateInput.min = startDateInput.value || '';
    startDateInput.max = endDateInput.value || '';
    if (startDateInput.value && endDateInput.value && endDateInput.value < startDateInput.value) {
      endDateInput.value = '';
    }
  }

  startDateInput.addEventListener('change', syncProjectDateLimits);
  endDateInput.addEventListener('change', syncProjectDateLimits);

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

    if (startDate && endDate && endDate < startDate) {
      showToast('End date must be on or after the start date');
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
        const project = await res.json();
        createdProjectId = project.id;
        modal.classList.remove('show');
        projectForm.reset();
        employeeAssignmentModal.classList.add('show');
        await loadEmployeesForAssignment();
        showToast('Project created. Add employees or skip this step.');
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

  async function loadEmployeesForAssignment() {
    try {
      const res = await fetch(`${BASE_URL}/api/users?role=employee`, { headers });
      if (!res.ok) return;
      availableEmployees = await res.json();
    } catch (e) {
      showToast('Unable to load employees');
    }
  }

  async function addProjectMember() {
    const empId = employeeSearchInput.dataset.selectedEmployeeId || '';
    const roleOnProject = newMemberRole.value.trim();
    if (!createdProjectId || !empId || !roleOnProject) {
      showToast('Select an employee and enter their project role');
      return;
    }

    addProjectMemberBtn.disabled = true;
    addProjectMemberBtn.textContent = 'Adding...';
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${createdProjectId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ empId, roleOnProject })
      });
      if (!res.ok) {
        const error = await res.json();
        showToast(error.error || 'Unable to add employee');
        return;
      }

      const employee = availableEmployees.find(item => String(item.emp_id) === String(empId));
      const memberRow = document.createElement('div');
      memberRow.className = 'assigned-member-row';
      memberRow.innerHTML = `<span><strong>${escapeHtml(employee?.name || empId)}</strong><small>${escapeHtml(empId)} · ${escapeHtml(roleOnProject)}</small></span><span class="member-added-state">Added</span>`;
      assignedMembersList.appendChild(memberRow);
      availableEmployees = availableEmployees.filter(item => String(item.emp_id) !== String(empId));
      employeeSearchInput.value = '';
      delete employeeSearchInput.dataset.selectedEmployeeId;
      employeeSearchResults.innerHTML = '';
      newMemberRole.value = '';
      showToast('Employee added to project');
    } catch (e) {
      showToast('Network error adding employee');
    } finally {
      addProjectMemberBtn.disabled = false;
      addProjectMemberBtn.textContent = 'Add Employee';
    }
  }

  function searchEmployees() {
    const query = employeeSearchInput.value.trim().toLowerCase();
    const matches = availableEmployees.filter(employee => {
      const name = (employee.name || '').toLowerCase();
      const empId = (employee.emp_id || '').toLowerCase();
      return query && (name.includes(query) || empId.includes(query));
    }).slice(0, 8);

    employeeSearchResults.innerHTML = '';
    matches.forEach(employee => {
      const result = document.createElement('button');
      result.type = 'button';
      result.className = 'employee-search-result';
      result.innerHTML = `<strong>${escapeHtml(employee.name || employee.emp_id)}</strong><span>${escapeHtml(employee.emp_id)}</span>`;
      result.addEventListener('click', () => {
        employeeSearchInput.value = employee.name || employee.emp_id;
        employeeSearchInput.dataset.selectedEmployeeId = employee.emp_id;
        employeeSearchResults.innerHTML = `<span class="selected-employee">Selected: ${escapeHtml(employee.name || employee.emp_id)} (${escapeHtml(employee.emp_id)})</span>`;
      });
      employeeSearchResults.appendChild(result);
    });

    if (query && matches.length === 0) {
      employeeSearchResults.innerHTML = '<span class="search-no-results">No matching employees</span>';
    }
  }

  searchEmployeesBtn.addEventListener('click', searchEmployees);
  employeeSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchEmployees();
    }
  });
  addProjectMemberBtn.addEventListener('click', addProjectMember);
  function closeEmployeeAssignmentModal() {
    employeeAssignmentModal.classList.remove('show');
    createdProjectId = null;
    newMemberRole.value = '';
    assignedMembersList.innerHTML = '';
  }

  skipMembersBtn.addEventListener('click', closeEmployeeAssignmentModal);
  finishMembersBtn.addEventListener('click', closeEmployeeAssignmentModal);
  closeMembersBtn.addEventListener('click', closeEmployeeAssignmentModal);
  employeeAssignmentModal.addEventListener('click', event => {
    if (event.target === employeeAssignmentModal) closeEmployeeAssignmentModal();
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
