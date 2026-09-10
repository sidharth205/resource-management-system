let allNotifications = [];

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

    // Load notifications from database
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

    // Mark all as read button
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            await markAllAsRead(token);
        });
    }

    // Handle logout button navigation
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
        document.getElementById('notificationsContainer').innerHTML = `<p style="color: #ef4444; font-size: 0.8rem; text-align: center; padding: 20px;">Server connection error. Make sure backend is running.</p>`;
    }
}

function renderNotifications(filter) {
    const container = document.getElementById('notificationsContainer');
    
    let filtered = allNotifications;
    if (filter === 'unread') {
        filtered = allNotifications.filter(n => !n.is_read && n.unread);
    } else if (filter === 'read') {
        filtered = allNotifications.filter(n => n.is_read || !n.unread);
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
        } else if (type.includes('comment')) {
            iconClass = 'icon-blue';
            emoji = '💬';
        } else if (type.includes('status') || type.includes('update')) {
            iconClass = 'icon-green';
            emoji = '✅';
        } else if (type.includes('reminder') || type.includes('due')) {
            iconClass = 'icon-pink';
            emoji = '⏰';
        }

        container.innerHTML += `
            <div class="notif-card">
                <div class="notif-card-left">
                    <div class="notif-icon-box ${iconClass}">${emoji}</div>
                    <div class="notif-text-content">
                        <h4>${n.title || n.subject || 'Notification'}</h4>
                        <p>${n.message || n.text || ''}</p>
                    </div>
                </div>
                <div class="notif-time">${n.time_ago || 'Recently'}</div>
            </div>
        `;
    });
}

async function markAllAsRead(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allNotifications.forEach(n => { n.is_read = true; n.unread = false; });
            renderNotifications('all');
        }
    } catch (err) {
        console.error("Error marking notifications as read:", err);
    }
}