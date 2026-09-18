document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediate token validation & route protection
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('../login/index.html');
        return;
    }

    // 2. Dynamic user name binding for whoever is logged in
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);

    const userNameEl = document.getElementById('userName');
    const headerNameEl = document.getElementById('headerName');
    const empWelcomeNameEl = document.getElementById('empWelcomeName');

    if (userNameEl) userNameEl.textContent = formattedName.toUpperCase();
    if (headerNameEl) headerNameEl.textContent = formattedName;
    if (empWelcomeNameEl) empWelcomeNameEl.textContent = formattedName;

    // 3. Load live backend database elements
    await loadEmployeeDashboardTasks(token);
    await loadEmployeeNotifications(token);
    await loadEmployeeActivity(token);
    setInterval(() => {
        loadEmployeeDashboardTasks(token);
        loadEmployeeNotifications(token);
        loadEmployeeActivity(token);
    }, 30000);

    // 4. Secure Logout handling (replaces history state to block back-button access)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.replace('../login/index.html');
        });
    }
});

// Prevent back-button caching mechanism after logout
window.addEventListener('pageshow', (event) => {
    if (event.persisted || (performance.getEntriesByType("navigation")[0] && performance.getEntriesByType("navigation")[0].type === 'back_forward')) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.replace('../login/index.html');
        }
    }
});

async function loadEmployeeDashboardTasks(token) {
    const tbody = document.getElementById('employeeTasksTable');
    if (!tbody) return;

    try {
        // Fetch from the correct endpoint that resolves custom employee IDs
        const res = await fetch('http://localhost:3000/api/employee/tasks/current', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #64748b; padding: 20px;">No tasks found.</td></tr>`;
            return;
        }

        const tasks = await res.json();
        const countEl = document.getElementById('statAssignedCount');
        if (countEl) countEl.textContent = tasks ? tasks.length : '0';
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        document.getElementById('statDueCount').textContent = (tasks || []).filter(task => task.due_date === today).length;
        document.getElementById('statCompletedCount').textContent = (tasks || []).filter(task => (task.status || '').toLowerCase() === 'completed').length;

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #64748b; padding: 20px;">No active tasks assigned.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        
        tasks.forEach(t => {
            const tr = document.createElement('tr');
            
            // Make the row clickable and route to the specific task using the hash anchor
            tr.style.cursor = 'pointer';
            tr.onclick = () => {
                window.location.href = `../assigned-tasks/index.html#${t.id}`;
            };

            const taskTitle = t.title || t.task_name || t.name || t.description || 'Task Assignment';
            const projectName = t.project_name || t.projects?.name || 'General Project';
            const dueDate = t.due_date || 'Pending';

            tr.innerHTML = `
                <td>
                    <strong class="task-title-text">${escapeHtml(taskTitle)}</strong>
                    <span class="task-sub-text">${escapeHtml(projectName)}</span>
                </td>
                <td><span class="task-due-date">${escapeHtml(dueDate)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading tasks:", err);
        const tbody = document.getElementById('employeeTasksTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #ef4444; padding: 20px;">Server connection error. Make sure backend is running.</td></tr>`;
        }
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function formatIstTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
    }) + ' IST';
}

async function loadEmployeeNotifications(token) {
    const container = document.getElementById('employeeNotificationsList');
    if (!container) return;

    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">No new notifications.</p>`;
            return;
        }

        const notifications = await res.json();
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">No notifications available.</p>`;
            return;
        }

        container.innerHTML = '';
        notifications.forEach((n, index) => {
            container.innerHTML += `
                <div class="notif-item">
                    <span class="dot ${n.unread ? 'red-dot' : 'blue-dot'}"></span>
                    <div class="notif-content">
                        <p>${escapeHtml(n.message || n.text || n.title || 'Notification')}</p>
                        <span class="time-ago">${formatIstTime(n.created_at)}</span>
                    </div>
                </div>
                ${index < notifications.length - 1 ? '<hr class="divider">' : ''}
            `;
        });
    } catch (err) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">Unable to load notifications.</p>`;
    }
}

async function loadEmployeeActivity(token) {
    const container = document.getElementById('employeeActivityList');
    if (!container) return;

    try {
        const res = await fetch('http://localhost:3000/api/employee/activity', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">No recent activities.</p>`;
            return;
        }

        const activities = await res.json();
        if (!activities || activities.length === 0) {
            container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">No recent activity recorded.</p>`;
            return;
        }

        container.innerHTML = '';
        activities.forEach(a => {
            container.innerHTML += `
                <div class="timeline-row">
                    <div class="tl-icon-box"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"></path></svg></div>
                    <div class="tl-content">
                        <p><strong>You</strong> ${escapeHtml(a.description || a.text || 'Updated a record')}</p>
                        <span class="time-ago">${formatIstTime(a.created_at)}${a.time_ago ? ` (${escapeHtml(a.time_ago)})` : ''}</span>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">Unable to load activities.</p>`;
    }
}