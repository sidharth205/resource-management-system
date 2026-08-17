document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        window.location.href = '../login/index.html';
        return;
    }

    document.getElementById('userName').textContent = 'ADMIN';
    document.getElementById('headerName').textContent = 'Admin';

    await loadExactDashboardData();

    async function loadExactDashboardData() {
        try {
            // 1. Fetch Admin Metrics & Total Employees
            const statsRes = await fetch('http://localhost:3000/api/dashboard/admin-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await statsRes.json();
            
            if (statsRes.ok) {
                document.getElementById('statTotalEmployees').textContent = stats.totalEmployees ?? '--';
                document.getElementById('statActiveNow').textContent = stats.activeUsersToday ?? '--';
            } else {
                document.getElementById('statTotalEmployees').textContent = '--';
                document.getElementById('statActiveNow').textContent = '--';
            }

            // 2. Fetch Active Users Today (Audit Logs)
const activityRes = await fetch('http://localhost:3000/api/activities', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const activities = await activityRes.json();
const activeUsersList = document.getElementById('activeUsersList');

if (activities && activities.length > 0) {
    activeUsersList.innerHTML = '';
    activities.slice(0, 6).forEach(act => {
        let rawTime = act.created_at;
        if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) {
            rawTime += 'Z';
        }
        const dateObj = new Date(rawTime);
        
        // Formats as date and time in IST (e.g., "17/08/26, 01:30 PM")
        const dateTimeString = dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const empName = act.profiles?.name || act.emp_id || '--';
        
        const row = document.createElement('div');
        row.className = 'user-pill-row';
        row.innerHTML = `
            <span class="emp-name" title="EMP ID: ${act.emp_id}">${empName.toUpperCase()}</span>
            <span class="emp-time">${dateTimeString}</span>
        `;
        activeUsersList.appendChild(row);
    });
} else {
    activeUsersList.innerHTML = `<div class="user-pill-row" style="justify-content: center; color: #718096;"><span>--</span></div>`;
}
            // 3. Fetch Active Projects & Progress
            const projRes = await fetch('http://localhost:3000/api/reports/project-progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const projects = await projRes.json();
            const projectsList = document.getElementById('projectsProgressList');
            
            if (projRes.ok && projects.length > 0) {
                document.getElementById('statActiveProjectsCount').textContent = projects.length;
                projectsList.innerHTML = '';
                
                projects.slice(0, 6).forEach(p => {
                    const progress = p.progress ?? 0; // Exact database progress or 0
                    const row = document.createElement('div');
                    row.className = 'project-progress-row';
                    row.innerHTML = `
                        <span class="proj-name">${(p.name || '--').toUpperCase()}</span>
                        <div class="proj-bar-container">
                            <div class="proj-fill" style="width: ${progress}%;"></div>
                            <span class="proj-percentage">${progress}%</span>
                        </div>
                    `;
                    projectsList.appendChild(row);
                });
            } else {
                document.getElementById('statActiveProjectsCount').textContent = '--';
                projectsList.innerHTML = `<div class="project-progress-row" style="justify-content: center; color: #718096;"><span>--</span></div>`;
            }

            // 4. Fetch System Notifications
            const notifRes = await fetch('http://localhost:3000/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const notifications = await notifRes.json();
            const notifContainer = document.getElementById('systemNotificationsList');
            
            if (notifRes.ok && notifications.length > 0) {
                notifContainer.innerHTML = '';
                notifications.slice(0, 6).forEach(n => {
                    const bar = document.createElement('div');
                    bar.className = 'notif-bar';
                    bar.style.padding = '8px 12px';
                    bar.style.fontSize = '0.7rem';
                    bar.style.fontWeight = '700';
                    bar.style.color = '#744210';
                    bar.style.overflow = 'hidden';
                    bar.style.textOverflow = 'ellipsis';
                    bar.style.whiteSpace = 'nowrap';
                    bar.textContent = n.title || '--';
                    notifContainer.appendChild(bar);
                });
            } else {
                notifContainer.innerHTML = `<div class="notif-bar" style="display: flex; align-items: center; justify-content: center; color: #718096; font-size: 0.8rem; font-weight: bold;">--</div>`;
            }

        } catch (e) {
            console.error("Error loading dashboard data:", e);
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});