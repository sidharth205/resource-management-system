document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    // Set dynamic profile names
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);
    document.getElementById('userName').textContent = formattedName.toUpperCase();
    document.getElementById('headerName').textContent = formattedName;

    // Extract project ID from URL query parameters (e.g. ?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    // Load project details dynamically from database
    await loadProjectDetails(token, projectId);

    // Logout handling redirects to login/signup page
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
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
            document.getElementById('projectTitle').textContent = project.project_name || project.name || '';
            document.getElementById('projectDescription').textContent = project.description || '';
            document.getElementById('projectStartDate').textContent = project.start_date || '';
            document.getElementById('projectDueDate').textContent = project.due_date || '';
            document.getElementById('projectMembersCount').textContent = project.members_count || (project.team ? project.team.length : 0);

            // Populate Team Members List
            if (project.team && project.team.length > 0) {
                const teamList = document.getElementById('teamMembersList');
                teamList.innerHTML = '';
                project.team.forEach(member => {
                    teamList.innerHTML += `
                        <div class="team-member-row">
                            <div class="member-avatar">👤</div>
                            <div class="member-info">
                                <p>${member.name}</p>
                                <span>${member.role}</span>
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
                            <div class="member-avatar" style="width:24px; height:24px; font-size:0.6rem;">👤</div>
                            <div>
                                <p>${act.text}</p>
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
                            <span>📄 ${doc.name}</span>
                            <span class="doc-size">${doc.size}</span>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading project details from database:", err);
    }
}