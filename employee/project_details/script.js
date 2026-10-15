const PROJECT_DETAIL_ICONS = {
    user: '<svg class="ui-icon detail-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
    file: '<svg class="ui-icon detail-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h4"></path></svg>'
};

let currentProjectId = null;
let currentAuthToken = null;
let allProjectActivities = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('../login/index.html');
        return;
    }

    // Set dynamic profile names
    const storedName = window.getFirstName(localStorage.getItem('user_name') || 'Employee');
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1).toLowerCase();
    document.getElementById('userName').textContent = formattedName;
    document.getElementById('headerName').textContent = formattedName;

    // Extract project ID from URL query parameters (e.g. ?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    currentProjectId = projectId;
    currentAuthToken = token;

    // Load project details dynamically from database
    await loadProjectDetails(token, projectId);

    // Logout handling redirects to login/signup page
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.replace('../login/index.html');
    });

    setupActivityModal();
});

async function loadProjectDetails(token, projectId) {
    try {
        const endpoint = projectId 
            ? `http://localhost:3000/api/employee/projects/${projectId}` 
            : 'http://localhost:3000/api/employee/projects/current';

        const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;
        const project = await res.json();

        if (project) {
            document.getElementById('projectTitle').textContent = project.project_name || project.name || 'Project';
            document.getElementById('projectDescription').textContent = project.description || '';
            document.getElementById('projectStartDate').textContent = project.start_date || 'N/A';
            document.getElementById('projectDueDate').textContent = project.end_date || 'N/A';
            document.getElementById('projectMembersCount').textContent = project.members_count || (project.team ? project.team.length : 0);

            // Populate Team Members List
            if (project.team && project.team.length > 0) {
                const teamList = document.getElementById('teamMembersList');
                teamList.innerHTML = '';
                project.team.forEach(member => {
                    teamList.innerHTML += `
                        <div class="team-member-row">
                            <div class="member-avatar">${PROJECT_DETAIL_ICONS.user}</div>
                            <div class="member-info">
                                <p>${escapeHtml(member.name)}</p>
                                <span>${escapeHtml(member.role)}</span>
                            </div>
                        </div>
                    `;
                });
            }

            // Populate Recent Activity List
            if (project.activities && project.activities.length > 0) {
                const activityList = document.getElementById('projectActivityList');
                activityList.innerHTML = '';
                project.activities.forEach(act => {
                    activityList.innerHTML += `
                        <div class="activity-row">
                            <div class="member-avatar" style="width:24px; height:24px; font-size:0.6rem;">${PROJECT_DETAIL_ICONS.user}</div>
                            <div>
                                <p>${escapeHtml(act.text)}</p>
                                <span class="activity-time">${act.time}</span>
                            </div>
                        </div>
                    `;
                });
            }

            // Populate Project Documents List
            if (project.documents && project.documents.length > 0) {
                const docList = document.getElementById('projectDocumentsList');
                docList.innerHTML = '';
                project.documents.forEach(doc => {
                    docList.innerHTML += `
                        <div class="document-badge">
                            <a href="${escapeHtml(doc.file_url)}" target="_blank" rel="noopener" download>
                                ${PROJECT_DETAIL_ICONS.file} ${escapeHtml(doc.name)}
                            </a>
                            <span class="doc-size">${escapeHtml(doc.task_name)}</span>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading project details from database:", err);
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function setupActivityModal() {
    const activityLink = document.getElementById('viewAllActivityLink');
    const modal = document.getElementById('activityModal');
    const closeButton = document.getElementById('closeActivityModal');
    const dateFilter = document.getElementById('activityDateFilter');
    const clearDateButton = document.getElementById('clearActivityDate');
    if (!activityLink || !modal || !closeButton || !dateFilter || !clearDateButton) return;

    activityLink.addEventListener('click', async event => {
        event.preventDefault();
        modal.hidden = false;
        document.body.classList.add('modal-open');
        await loadAllProjectActivity();
    });

    closeButton.addEventListener('click', closeActivityModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeActivityModal();
    });
    dateFilter.addEventListener('change', () => renderAllProjectActivity(dateFilter.value));
    clearDateButton.addEventListener('click', () => {
        dateFilter.value = '';
        renderAllProjectActivity('');
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) closeActivityModal();
    });
}

function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
}

async function loadAllProjectActivity() {
    const list = document.getElementById('allActivityList');
    if (!list || !currentProjectId) return;
    list.innerHTML = '<p class="activity-empty-state">Loading activity...</p>';

    try {
        const response = await fetch(`http://localhost:3000/api/projects/${encodeURIComponent(currentProjectId)}/activity`, {
            headers: { 'Authorization': `Bearer ${currentAuthToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load project activity.');
        allProjectActivities = Array.isArray(data) ? data : [];
        renderAllProjectActivity(document.getElementById('activityDateFilter').value);
    } catch (error) {
        list.innerHTML = `<p class="activity-empty-state error">${escapeHtml(error.message)}</p>`;
    }
}

function renderAllProjectActivity(selectedDate) {
    const list = document.getElementById('allActivityList');
    if (!list) return;
    const filteredActivities = selectedDate
        ? allProjectActivities.filter(activity => activity.created_at && activity.created_at.slice(0, 10) === selectedDate)
        : allProjectActivities;

    if (filteredActivities.length === 0) {
        list.innerHTML = '<p class="activity-empty-state">No activity found for this date.</p>';
        return;
    }

    list.innerHTML = filteredActivities.map(activity => `
        <div class="all-activity-row">
            <div class="member-avatar">${PROJECT_DETAIL_ICONS.user}</div>
            <div class="all-activity-content">
                <p>${escapeHtml(activity.description || 'Project activity')}</p>
                <span>${escapeHtml(formatActivityDate(activity.created_at))}</span>
            </div>
        </div>
    `).join('');
}

function formatActivityDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}