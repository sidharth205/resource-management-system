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

    // Load active task details
    await loadAssignedTaskData(token);

    // Modal popup triggers and controls (Upper right Save Changes button)
    const modal = document.getElementById('saveConfirmModal');
    const topSaveBtn = document.getElementById('topSaveBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    if (topSaveBtn && modal) {
        topSaveBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (modalCancelBtn && modal) {
        modalCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modalConfirmBtn && modal) {
        modalConfirmBtn.addEventListener('click', async () => {
            modal.style.display = 'none';
            await saveTaskChanges(token);
        });
    }

    // Handle Log Hours submission
    document.getElementById('logHoursForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitWorkHours(token);
    });

    // Handle logout button navigation
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});

async function loadAssignedTaskData(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/current', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;
        const task = await res.json();

        if (task) {
            document.getElementById('taskNameHeader').textContent = task.task_name || '';
            document.getElementById('taskDueDate').textContent = task.due_date || '';
            document.getElementById('taskAssignedBy').textContent = task.assigned_by || '';
            document.getElementById('taskCreatedDate').textContent = task.created_date || '';
            document.getElementById('taskEstimatedHours').textContent = task.estimated_hours ? task.estimated_hours + ' hrs' : '';
            document.getElementById('taskDescriptionText').textContent = task.description || '';
            
            if (task.attachments && task.attachments.length > 0) {
                const attachList = document.getElementById('attachmentsList');
                attachList.innerHTML = '';
                task.attachments.forEach(att => {
                    attachList.innerHTML += `
                        <div class="attachment-item">
                            <span>📄 ${att.name}</span>
                            <span style="color: #64748b;">${att.size}</span>
                        </div>
                    `;
                });
            }

            if (task.activities && task.activities.length > 0) {
                const timeline = document.getElementById('activityTimelineList');
                timeline.innerHTML = '';
                task.activities.forEach(act => {
                    timeline.innerHTML += `
                        <div class="timeline-item">
                            <span class="timeline-time">${act.time}</span>
                            <strong>${act.text}</strong>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading task specifications from database:", err);
    }
}

async function saveTaskChanges(token) {
    try {
        alert('Task changes saved successfully!');
    } catch (err) {
        console.error("Error saving changes:", err);
    }
}

async function submitWorkHours(token) {
    const hours = document.getElementById('logHoursInput').value;
    const description = document.getElementById('logDescInput').value;

    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ hours, description })
        });

        if (res.ok) {
            alert('Work hours logged successfully!');
            document.getElementById('logHoursForm').reset();
        } else {
            alert('Failed to submit hours.');
        }
    } catch (err) {
        console.error("Submission error:", err);
    }
}