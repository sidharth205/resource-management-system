let allNotifications = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);
    document.getElementById('userName').textContent = formattedName.toUpperCase();
    document.getElementById('headerName').textContent = formattedName;

    await loadNotifications(token);

    // Tab filter event listeners
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.getAttribute('data-filter');
            renderNotifications(filter);
        });
    });

    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await markAllAsRead(token);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../login/index.html';
        });
    }
});

async function loadNotifications(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const container = document.getElementById('notificationsContainer');
        if (!res.ok) {
            container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 20px;">No notifications found.</p>`;
            return;
        }

        allNotifications = await res.json();
        renderNotifications('all');
    } catch (err) {
        console.error("Error loading notifications:", err);
        document.getElementById('notificationsContainer').innerHTML = `<p style="color: #ef4444; font-size: 0.8rem; text-align: center; padding: 20px;">Server connection error.</p>`;
    }
}

function renderNotifications(filter) {
    const container = document.getElementById('notificationsContainer');
    
    let filtered = allNotifications;
    if (filter === 'unread') {
        filtered = allNotifications.filter(n => !n.is_read);
    } else if (filter === 'read') {
        filtered = allNotifications.filter(n => n.is_read);
    }

    if (!filtered || filtered.length === 0) {
        container.innerHTML = `<p style="color: #64748b; font-size: 0.8rem; text-align: center; padding: 20px;">No notifications in this section.</p>`;
        return;
    }

    container.innerHTML = '';
    filtered.forEach(n => {
        let iconClass = 'icon-blue';
        let emoji = '📌';
        const type = (n.type || '').toLowerCase();
        
        if (type.includes('task') || type.includes('assigned')) {
            iconClass = 'icon-orange';
            emoji = '👥';
        } else if (type.includes('hours') || type.includes('timesheet')) {
            iconClass = 'icon-blue';
            emoji = '⏱️';
        } else if (type.includes('attachment') || type.includes('file')) {
            iconClass = 'icon-green';
            emoji = '📄';
        } else if (type.includes('reminder') || type.includes('due')) {
            iconClass = 'icon-pink';
            emoji = '⏰';
        }

        const timeFormatted = n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently';
        const redirectUrl = `../assigned-tasks/index.html`;

        container.innerHTML += `
            <div class="notif-card" onclick="handleNotificationClick('${n.id}', '${redirectUrl}')" style="cursor: pointer; ${!n.is_read ? 'background: #f8fafc; border-left: 3px solid #3b82f6;' : 'background: #ffffff;'}; padding: 12px; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <div class="notif-icon-box ${iconClass}">${emoji}</div>
                    <div class="notif-text-content">
                        <h4 style="margin: 0 0 4px 0; font-size: 0.85rem; color: #1e293b;">${n.title || 'Notification'}</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: #475569;">${n.message || ''}</p>
                    </div>
                </div>
                <div class="notif-time" style="font-size: 0.75rem; color: #94a3b8; white-space: nowrap;">${timeFormatted}</div>
            </div>
        `;
    });
}

async function handleNotificationClick(notifId, redirectUrl) {
    const token = localStorage.getItem('access_token');
    try {
        await fetch(`http://localhost:3000/api/employee/notifications/${notifId}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (err) {
        console.error("Failed to mark notification read:", err);
    }
    window.location.href = redirectUrl;
}

async function markAllAsRead(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allNotifications.forEach(n => { n.is_read = true; });
            const activeFilter = document.querySelector('.tab-btn.active').getAttribute('data-filter');
            renderNotifications(activeFilter);
        }
    } catch (err) {
        console.error("Error marking notifications as read:", err);
    }
}