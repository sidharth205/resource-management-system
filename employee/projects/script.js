document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    // Set dynamic profile names from localStorage
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);
    document.getElementById('userName').textContent = formattedName.toUpperCase();
    document.getElementById('headerName').textContent = formattedName;

    // Load active projects dynamically from database
    await loadEmployeeProjects(token);

    // Logout handling redirects to login/signup page
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});

async function loadEmployeeProjects(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const tbody = document.getElementById('employeeProjectsTable');
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">No projects found.</td></tr>`;
            return;
        }

        const projects = await res.json();
        if (!projects || projects.length === 0) {
            document.getElementById('statTotalProjects').textContent = '0';
            document.getElementById('statCompletedProjects').textContent = '0';
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">No active projects assigned.</td></tr>`;
            return;
        }

        // Calculate and display metrics
        document.getElementById('statTotalProjects').textContent = projects.length;
        const completedCount = projects.filter(p => p.status === 'completed').length;
        document.getElementById('statCompletedProjects').textContent = completedCount;

        tbody.innerHTML = '';
        
        projects.forEach(p => {
            const tr = document.createElement('tr');
            // Clicking the project name navigates to the corresponding Project Details page with ID parameter
            tr.innerHTML = `
                <td>
                    <a href="../project-details/index.html?id=${p.id || ''}" class="project-title-link">${p.project_name || p.name || 'Project'}</a><br>
                    <span class="project-sub-text">${p.team || 'General Team'}</span>
                </td>
                <td>
                    <div class="owner-cell">
                        <span class="owner-avatar">👤</span> ${p.owner || 'Manager'}
                    </div>
                </td>
                <td>${p.start_date || 'N/A'}</td>
                <td><span style="font-weight: 600; color: #1e293b;">${p.due_date || 'Pending'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading projects:", err);
        document.getElementById('employeeProjectsTable').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Server connection error. Make sure backend is running.</td></tr>`;
    }
}
async function loadProjectActivity(projectId, token) {
    const container = document.getElementById('projectActivityList');
    if (!container) return;

    try {
        const res = await fetch(`http://localhost:3000/api/projects/${projectId}/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            container.innerHTML = '<p style="color: #64748b; font-size: 0.8rem;">Unable to load project activity.</p>';
            return;
        }

        const logs = await res.json();
        if (!logs || logs.length === 0) {
            container.innerHTML = '<p style="color: #64748b; font-size: 0.8rem;">No project activity recorded yet.</p>';
            return;
        }

        container.innerHTML = '';
        logs.forEach(l => {
            container.innerHTML += `
                <div class="timeline-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div class="tl-icon-box" style="background: #e0e7ff; padding: 8px; border-radius: 8px;">${l.icon}</div>
                    <div class="tl-content" style="flex: 1;">
                        <p style="margin: 0; font-size: 0.9rem; color: #1e1b4b;">${l.description}</p>
                        <span class="time-ago" style="font-size: 0.75rem; color: #64748b;">${l.time_ago}</span>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Error loading project activity:", err);
    }
}
