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
  let myTasks = [];

  async function loadProjects() {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, { headers });
      if (res.ok) {
        managerProjects = await res.json();
        if (Array.isArray(managerProjects)) {
          const filterProj = document.getElementById('filterProject');
          const formProj = document.getElementById('taskProject');

          managerProjects.forEach(p => {
            managerProjectIds.add(p.id);
            projectMap.set(p.id, p.name || 'Untitled Project');

            const opt1 = document.createElement('option');
            opt1.value = p.id;
            opt1.textContent = p.name || 'Untitled Project';
            filterProj.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = p.id;
            opt2.textContent = p.name || 'Untitled Project';
            formProj.appendChild(opt2);
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
          const assigneeSelect = document.getElementById('taskAssignee');
          emps.forEach(emp => {
            employeeMap.set(emp.emp_id, emp.name || emp.emp_id);
            const opt = document.createElement('option');
            opt.value = emp.emp_id;
            opt.textContent = `${emp.name || emp.emp_id} (${emp.emp_id})`;
            assigneeSelect.appendChild(opt);
          });
        }
      }
    } catch (e) {}
  }

  async function loadTasks() {
    const list = document.getElementById('taskCardsList');
    try {
      const res = await fetch(`${BASE_URL}/api/tasks`, { headers });
      if (!res.ok) {
        list.innerHTML = '<div class="empty-state">Unable to load tasks</div>';
        return;
      }
      const allTasks = await res.json();
      if (!Array.isArray(allTasks)) {
        list.innerHTML = '<div class="empty-state">No tasks available</div>';
        return;
      }

      myTasks = allTasks.filter(t => managerProjectIds.has(t.project_id));
      renderTasksList();
    } catch (e) {
      list.innerHTML = '<div class="empty-state">Network error loading tasks</div>';
    }
  }

  function renderTasksList() {
    const list = document.getElementById('taskCardsList');
    if (!list) return;

    const query = (document.getElementById('taskSearchInput').value || '').toLowerCase().trim();
    const projFilter = document.getElementById('filterProject').value;
    const statusFilter = (document.getElementById('filterStatus').value || 'all').toLowerCase();
    const priorityFilter = (document.getElementById('filterPriority').value || 'all').toLowerCase();

    const filtered = myTasks.filter(t => {
      const assigneeName = (employeeMap.get(t.assigned_to) || t.assigned_to || '').toLowerCase();
      const titleMatch = (t.title || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        assigneeName.includes(query);

      const projMatch = projFilter === 'all' || String(t.project_id) === String(projFilter);
      const st = (t.status || 'pending').toLowerCase();
      const statusMatch = statusFilter === 'all' || st === statusFilter;
      const prio = (t.priority || 'medium').toLowerCase();
      const priorityMatch = priorityFilter === 'all' || prio === priorityFilter;

      return titleMatch && projMatch && statusMatch && priorityMatch;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state">No matching tasks found</div>';
      return;
    }

    list.innerHTML = '';
    const currentEditId = document.getElementById('editingTaskId').value;

    filtered.forEach(t => {
      const card = document.createElement('div');
      card.className = 'task-card-item' + (String(t.id) === String(currentEditId) ? ' selected' : '');
      card.setAttribute('data-id', t.id);

      const prio = (t.priority || 'medium').toLowerCase();
      let prioClass = 'pill-medium';
      if (prio === 'high') prioClass = 'pill-high';
      else if (prio === 'low') prioClass = 'pill-low';

      const st = (t.status || 'pending').toLowerCase();
      let statusClass = 'pill-pending';
      let statusLabel = 'Pending';
      if (st === 'completed') {
        statusClass = 'pill-completed';
        statusLabel = 'Completed';
      } else if (st === 'in_progress') {
        statusClass = 'pill-progress';
        statusLabel = 'In Progress';
      }

      const projName = projectMap.get(t.project_id) || 'Project';
      const assigneeName = employeeMap.get(t.assigned_to) || t.assigned_to || 'Unassigned';
      const dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date';

      card.innerHTML = `
        <div class="task-item-top">
          <span class="task-item-title">${escapeHtml(t.title || 'Untitled Task')}</span>
          <div class="task-badges">
            <span class="pill-badge ${prioClass}">${prio}</span>
            <span class="pill-badge ${statusClass}">${statusLabel}</span>
          </div>
        </div>
        <p class="task-item-desc">${escapeHtml(t.description || 'No description provided')}</p>
        <div class="task-item-meta">
          <div class="task-meta-left">
            <span>📁 ${escapeHtml(projName)}</span>
            <span>👤 ${escapeHtml(assigneeName)}</span>
          </div>
          <span>📅 ${dueStr}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectTaskForEdit(t);
      });

      list.appendChild(card);
    });
  }

  function selectTaskForEdit(task) {
    document.getElementById('editingTaskId').value = task.id;
    document.getElementById('formTitle').textContent = `Edit Task #${task.id}`;
    document.getElementById('formSubtitle').textContent = 'Update task status and parameters';
    document.getElementById('saveTaskBtn').textContent = 'Update Task';
    document.getElementById('statusGroup').style.display = 'flex';

    document.getElementById('taskProject').value = task.project_id || '';
    document.getElementById('taskAssignee').value = task.assigned_to || '';
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = (task.priority || 'medium').toLowerCase();

    if (task.due_date) {
      const d = new Date(task.due_date);
      if (!isNaN(d.getTime())) {
        document.getElementById('taskDueDate').value = d.toISOString().split('T')[0];
      } else {
        document.getElementById('taskDueDate').value = '';
      }
    } else {
      document.getElementById('taskDueDate').value = '';
    }

    document.getElementById('taskHours').value = task.estimated_hours ?? '';
    document.getElementById('taskStatus').value = (task.status || 'pending').toLowerCase();

    document.querySelectorAll('.task-card-item').forEach(c => {
      if (c.getAttribute('data-id') === String(task.id)) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    const rightPanel = document.querySelector('.split-right-panel');
    if (window.innerWidth <= 1024 && rightPanel) {
      rightPanel.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function resetToCreateMode() {
    document.getElementById('taskForm').reset();
    document.getElementById('editingTaskId').value = '';
    document.getElementById('formTitle').textContent = 'Create New Task';
    document.getElementById('formSubtitle').textContent = 'Fill in task details below';
    document.getElementById('saveTaskBtn').textContent = 'Create Task';
    document.getElementById('statusGroup').style.display = 'none';

    document.querySelectorAll('.task-card-item').forEach(c => {
      c.classList.remove('selected');
    });
  }

  document.getElementById('newTaskBtn').addEventListener('click', resetToCreateMode);
  document.getElementById('resetFormBtn').addEventListener('click', resetToCreateMode);
  document.getElementById('cancelFormBtn').addEventListener('click', resetToCreateMode);

  document.getElementById('taskSearchInput').addEventListener('input', renderTasksList);
  document.getElementById('filterProject').addEventListener('change', renderTasksList);
  document.getElementById('filterStatus').addEventListener('change', renderTasksList);
  document.getElementById('filterPriority').addEventListener('change', renderTasksList);

  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = document.getElementById('editingTaskId').value;
    const projectId = document.getElementById('taskProject').value;
    const assignedTo = document.getElementById('taskAssignee').value || null;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value || null;
    const estimatedHours = parseFloat(document.getElementById('taskHours').value) || null;
    const status = document.getElementById('taskStatus').value || 'pending';

    if (!projectId) {
      showToast('Please select a project');
      return;
    }
    if (!title) {
      showToast('Task title is required');
      return;
    }

    const saveBtn = document.getElementById('saveTaskBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (!editId) {
        const payload = {
          projectId,
          assignedTo,
          title,
          description,
          priority,
          dueDate,
          estimatedHours
        };
        const res = await fetch(`${BASE_URL}/api/tasks`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast('Task created successfully!');
          resetToCreateMode();
          await loadTasks();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create task');
        }
      } else {
        const patchPayload = {
          title,
          description,
          priority,
          due_date: dueDate,
          estimated_hours: estimatedHours,
          status,
          assigned_to: assignedTo
        };
        const res = await fetch(`${BASE_URL}/api/tasks/${editId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patchPayload)
        });

        if (res.ok) {
          showToast('Task updated successfully!');
          await loadTasks();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update task');
        }
      }
    } catch (err) {
      showToast('Network error saving task');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = editId ? 'Update Task' : 'Create Task';
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

  await Promise.all([loadProjects(), loadEmployees()]);
  await loadTasks();

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedProjectId = urlParams.get('projectId');
  if (preselectedProjectId && managerProjectIds.has(preselectedProjectId)) {
    document.getElementById('taskProject').value = preselectedProjectId;
    document.getElementById('filterProject').value = preselectedProjectId;
    renderTasksList();
  }
});
