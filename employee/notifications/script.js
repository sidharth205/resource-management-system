let allNotifications = [];

function activityReadStorageKey() {
    return `rms-read-activities-${localStorage.getItem('user_emp_id') || localStorage.getItem('user_name') || 'user'}`;
}

function getReadActivityIds() {
    try {
        return new Set(JSON.parse(localStorage.getItem(activityReadStorageKey()) || '[]'));
    } catch (error) {
        return new Set();
    }
}

function saveReadActivityIds(activityIds) {
    localStorage.setItem(activityReadStorageKey(), JSON.stringify([...activityIds]));
}

const NOTIFICATION_ICONS = {
    activity: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v16"></path></svg>',
    task: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h4M9 12h6M9 16h6"></path></svg>',
    hours: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    attachment: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h4"></path></svg>',
    reminder: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>'
};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('../login/index.html');
        return;
    }

    const storedName = window.getFirstName(localStorage.getItem('user_name') || 'Employee');
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1).toLowerCase();
    document.getElementById('userName').textContent = formattedName;
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
            window.location.replace('../login/index.html');
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

        const readActivityIds = getReadActivityIds();
        allNotifications = (await res.json()).map(notification => ({
            ...notification,
            is_read: notification.is_project_activity && readActivityIds.has(notification.id)
                ? true
                : Boolean(notification.is_read)
        }));
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
        let icon = NOTIFICATION_ICONS.activity;
        const type = (n.type || '').toLowerCase();
        
        if (type.includes('task') || type.includes('assigned')) {
            iconClass = 'icon-orange';
            icon = NOTIFICATION_ICONS.task;
        } else if (type.includes('hours') || type.includes('timesheet')) {
            iconClass = 'icon-blue';
            icon = NOTIFICATION_ICONS.hours;
        } else if (type.includes('attachment') || type.includes('file')) {
            iconClass = 'icon-green';
            icon = NOTIFICATION_ICONS.attachment;
        } else if (type.includes('reminder') || type.includes('due')) {
            iconClass = 'icon-pink';
            icon = NOTIFICATION_ICONS.reminder;
        }

        const timeFormatted = n.created_at ? new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently';
        const redirectUrl = n.task_id
            ? `../assigned-tasks/index.html#${encodeURIComponent(n.task_id)}`
            : '../assigned-tasks/index.html';

        container.innerHTML += `
            <div class="notif-card ${!n.is_read ? 'is-unread' : ''}" onclick="handleNotificationClick('${n.id}', '${redirectUrl}')">
                <div class="notif-card-main">
                    <div class="notif-icon-box ${iconClass}">${icon}</div>
                    <div class="notif-text-content">
                        <h4>${escapeHtml(n.title || 'Notification')}</h4>
                        <p>${escapeHtml(n.message || '')}</p>
                    </div>
                </div>
                <div class="notif-time">${timeFormatted}</div>
            </div>
        `;
    });
}

async function handleNotificationClick(notifId, redirectUrl) {
    const token = localStorage.getItem('access_token');
    if (String(notifId).startsWith('activity-')) {
        const readActivityIds = getReadActivityIds();
        readActivityIds.add(notifId);
        saveReadActivityIds(readActivityIds);
    } else {
        try {
            await fetch(`http://localhost:3000/api/employee/notifications/${notifId}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to mark notification read:", err);
        }
    }
    window.location.href = redirectUrl;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

async function markAllAsRead(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const readActivityIds = getReadActivityIds();
            allNotifications
                .filter(notification => notification.is_project_activity)
                .forEach(notification => readActivityIds.add(notification.id));
            saveReadActivityIds(readActivityIds);
            allNotifications.forEach(n => { n.is_read = true; });
            const activeFilter = document.querySelector('.tab-btn.active').getAttribute('data-filter');
            renderNotifications(activeFilter);
        }
    } catch (err) {
        console.error("Error marking notifications as read:", err);
    }
}