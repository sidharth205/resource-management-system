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

    function formatChange(value) {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
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
                document.getElementById('statActiveNow').textContent = stats.activeUsersToday ?? '--';
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
                    const progress = p.progress ?? 0; // Exact database progress or 0
                    const row = document.createElement('div');
                    row.className = 'project-progress-row';
                    row.innerHTML = `
                        <span class="proj-name">${p.name || '--'}</span>
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

            // 4. Show detailed system changes from the audit log.
                    const notifications = activities.filter(activity =>
                !activity.profiles?.role || activity.profiles.role.toLowerCase() === 'admin'
            );
            const notifContainer = document.getElementById('systemNotificationsList');
            
            if (Array.isArray(notifications) && notifications.length > 0) {
                notifContainer.innerHTML = '';
                notifications.forEach(n => {
                    const bar = document.createElement('div');
                    bar.className = 'notif-bar';
                    const actorName = n.emp_id === currentAdminId ? 'You' : (n.profiles?.name || 'System user');
                    const actorId = n.emp_id || 'SYSTEM';
                    const previousValue = formatChange(n.previous_value);
                    const newValue = formatChange(n.new_value);
                    bar.innerHTML = `<strong>${escapeHtml(actorName)} <span class="notif-meta">${escapeHtml(actorId)}</span></strong>
                        <span class="notif-summary">${escapeHtml(n.action || 'Updated the system')} (${escapeHtml(n.module || 'System')})</span>
                        <span class="notif-meta">${escapeHtml(formatIstTime(n.created_at))}</span>
                        <span class="notif-details">${n.record_id ? `Record: ${escapeHtml(n.record_id)}<br>` : ''}${previousValue ? `Before: ${escapeHtml(previousValue)}<br>` : ''}${newValue ? `After: ${escapeHtml(newValue)}` : ''}</span>
                        <button type="button" class="notif-toggle" aria-expanded="false">Read more</button>`;
                    const toggle = bar.querySelector('.notif-toggle');
                    toggle.addEventListener('click', () => {
                        const expanded = bar.classList.toggle('expanded');
                        toggle.textContent = expanded ? 'Show less' : 'Read more';
                        toggle.setAttribute('aria-expanded', expanded);
                    });
                    notifContainer.appendChild(bar);
                });
            } else {
                notifContainer.innerHTML = `<div class="notif-bar" style="display: flex; align-items: center; justify-content: center; color: #718096; font-size: 0.8rem; font-weight: bold;">--</div>`;
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