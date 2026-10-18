document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    const currentAdminId = localStorage.getItem('user_emp_id');
    const currentAdminName = localStorage.getItem('user_name') || 'User';
    document.getElementById('userName').textContent = currentAdminName;
    document.getElementById('headerName').textContent = currentAdminName;

    await loadExactDashboardData();

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function formatIstTime(value) {
        let rawTime = value;
        if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) rawTime += 'Z';
        const date = new Date(rawTime);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }) + ' IST';
    }

    function formatNotificationTime(value) {
        let rawTime = value == null ? '' : String(value);
        if (!rawTime) return '--';
        if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) rawTime += 'Z';
        const date = new Date(rawTime);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' IST';
    }

    async function loadExactDashboardData() {
        try {
            // 1. Fetch Admin Metrics & Total Employees
            const statsRes = await fetch('http://localhost:3000/api/dashboard/admin-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await statsRes.json();
            
            if (statsRes.ok) {
                document.getElementById('statTotalEmployees').textContent = stats.totalEmployees ?? '--';
                document.getElementById('statActiveNow').textContent = stats.activeUsersNow ?? '--';
            } else {
                document.getElementById('statTotalEmployees').textContent = '--';
                document.getElementById('statActiveNow').textContent = '--';
            }

            // 2. Fetch Active Users Today (Audit Logs)
const [activityRes, todayActivityRes] = await Promise.all([
    fetch('http://localhost:3000/api/activities', {
        headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch('http://localhost:3000/api/activities?today=true', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
]);
const activities = activityRes.ok ? await activityRes.json() : [];
const todayActivities = todayActivityRes.ok ? await todayActivityRes.json() : [];
const activeUsersList = document.getElementById('activeUsersList');

if (todayActivities && todayActivities.length > 0) {
    activeUsersList.innerHTML = '';
    const latestActivityByUser = new Map();
    todayActivities.filter(activity => activity.emp_id).forEach(activity => {
        const userKey = activity.emp_id;
        if (!latestActivityByUser.has(userKey)) latestActivityByUser.set(userKey, activity);
    });
    [...latestActivityByUser.values()].forEach(act => {
        const empName = act.emp_id === currentAdminId ? 'You' : (act.profiles?.name || act.emp_id || '--');
        
        const row = document.createElement('div');
        row.className = 'user-pill-row';
        row.innerHTML = `
            <span class="emp-name" title="EMP ID: ${act.emp_id || 'SYSTEM'}">${escapeHtml(empName)}</span>
            <span class="emp-time">${formatIstTime(act.created_at)}</span>
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
                    const projectStatus = String(p.status || '').toLowerCase();
                    const isDelayed = projectStatus === 'delayed';
                    const statusLabel = isDelayed ? 'Delayed' : 'In Progress';
                    const row = document.createElement('div');
                    row.className = `project-progress-row${isDelayed ? ' project-progress-row--delayed' : ''}`;
                    row.innerHTML = `
                        <span class="proj-name" title="${escapeHtml(p.name || '--')}">${escapeHtml(p.name || '--')}</span>
                        <span class="proj-status${isDelayed ? ' proj-status--delayed' : ''}">${statusLabel}</span>
                    `;
                    projectsList.appendChild(row);
                });
            } else {
                document.getElementById('statActiveProjectsCount').textContent = '--';
                projectsList.innerHTML = `<div class="project-progress-row" style="justify-content: center; color: #718096;"><span>--</span></div>`;
            }

            // 4. Show concise activity notifications with role-based accents.
            const notifications = Array.isArray(activities) ? activities.slice(0, 30) : [];
            const notifContainer = document.getElementById('systemNotificationsList');
            
            if (Array.isArray(notifications) && notifications.length > 0) {
                notifContainer.innerHTML = '';
                notifications.forEach(n => {
                    const bar = document.createElement('div');
                    const actorRole = String(n.profiles?.role || '').toLowerCase();
                    const roleClass = ['admin', 'manager', 'employee'].includes(actorRole)
                        ? ` notif-bar--${actorRole}`
                        : '';
                    const roleLabel = actorRole
                        ? actorRole.charAt(0).toUpperCase() + actorRole.slice(1)
                        : 'System';
                    const actorName = n.profiles?.name || (n.emp_id === currentAdminId ? currentAdminName : 'System user');
                    const actorId = n.emp_id ? `<span class="notif-emp-id">(${escapeHtml(n.emp_id)})</span>` : '';
                    const action = n.action || 'Updated the system';
                    const module = n.module || 'System';
                    const summary = `${action} · ${module}`;
                    const notificationTime = formatNotificationTime(n.created_at);
                    bar.className = `notif-bar${roleClass}`;
                    bar.innerHTML = `<div class="notif-actor">
                            <strong class="notif-name" title="${escapeHtml(actorName)}">${escapeHtml(actorName)} ${actorId}</strong>
                            <span class="notif-role">${escapeHtml(roleLabel)}</span>
                        </div>
                        <span class="notif-summary" title="${escapeHtml(summary)}">${escapeHtml(summary)}</span>
                        <time class="notif-time">${escapeHtml(notificationTime)}</time>`;
                    notifContainer.appendChild(bar);
                });
            } else {
                notifContainer.innerHTML = '<div class="notif-empty">No recent notifications</div>';
            }

        } catch (e) {
            console.error("Error loading dashboard data:", e);
        }
    }

    setInterval(loadExactDashboardData, 30000);

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        localStorage.clear();
        window.location.replace('../login/index.html');
    });
});