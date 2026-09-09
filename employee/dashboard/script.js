document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    // Retrieve name dynamically from localStorage set during login
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);

    // Populate all name fields across the dashboard layout
    document.getElementById('userName').textContent = formattedName.toUpperCase();
    document.getElementById('headerName').textContent = formattedName;
    document.getElementById('empWelcomeName').textContent = formattedName;

    // Load live backend modules safely
    await loadEmployeeDashboardTasks(token);
    await loadEmployeeNotifications(token);
    await loadEmployeeActivity(token);

    // Logout handling redirects to login/signup page
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});

async function loadEmployeeDashboardTasks(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const tbody = document.getElementById('employeeTasksTable');
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">No tasks found.</td></tr>`;
            return;
        }

        const tasks = await res.json();
        if (!tasks || tasks.length === 0) {
            document.getElementById('statAssignedCount').textContent = '0';
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">No active tasks assigned.</td></tr>`;
            return;
        }

        document.getElementById('statAssignedCount').textContent = tasks.length;
        tbody.innerHTML = '';
        
        tasks.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong class="task-title-text">${t.task_name || t.description || 'Task Assignment'}</strong><br>
                    <span class="task-sub-text">${t.project_name || 'General Project'}</span>
                </td>
                <td>${t.start_date || 'N/A'}</td>
                <td><span style="color: #3b82f6; font-weight: 700;">${t.due_date || 'Pending'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading tasks:", err);
        document.getElementById('employeeTasksTable').innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 20px;">Server connection error. Make sure backend is running.</td></tr>`;
    }
}

async function loadEmployeeNotifications(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const container = document.getElementById('employeeNotificationsList');
        
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
                        <p>${n.message || n.text}</p>
                        <span class="time-ago">${n.time_ago || 'Recently'}</span>
                    </div>
                </div>
                ${index < notifications.length - 1 ? '<hr class="divider">' : ''}
            `;
        });
    } catch (err) {
        document.getElementById('employeeNotificationsList').innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">Unable to load notifications.</p>`;
    }
}

async function loadEmployeeActivity(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/activity', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const container = document.getElementById('employeeActivityList');
        
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
                    <div class="tl-icon-box">${a.icon || '📌'}</div>
                    <div class="tl-content">
                        <p>${a.description || a.text}</p>
                        <span class="time-ago">${a.time_ago || 'Recently'}</span>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        document.getElementById('employeeActivityList').innerHTML = `<p style="color: #64748b; font-size: 0.8rem;">Unable to load activities.</p>`;
    }
}