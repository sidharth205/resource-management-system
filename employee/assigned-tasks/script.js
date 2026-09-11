document.addEventListener('DOMContentLoaded', async () => {
    // 1. Secure token validation & back-button cache check
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('../../admin/login/index.html');
        return;
    }

    // 2. Dynamic user name configuration
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);
    document.getElementById('userName').textContent = formattedName.toUpperCase();
    document.getElementById('headerName').textContent = formattedName;

    // 3. Load active tasks details from database
    await loadAssignedTaskData(token);

    // Secure Logout handling
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.replace('../../admin/login/index.html');
        });
    }
});

// Prevent back-button caching mechanism after logout
window.addEventListener('pageshow', (event) => {
    if (event.persisted || (performance.getEntriesByType("navigation")[0] && performance.getEntriesByType("navigation")[0].type === "back_forward")) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.replace('../../admin/login/index.html');
        }
    }
});

// 1. Helper function to instantly update the UI timeline
function appendTimelineActivity(taskId, text, userName = 'You') {
    const container = document.getElementById(`timeline-${taskId}`);
    if (!container) return;
    
    if (container.innerHTML.includes('No activity recorded yet')) {
        container.innerHTML = '';
    }

    const timeStr = new Date().toISOString().split('T')[0];
    const activityHTML = `
        <div class="timeline-item" style="margin-bottom: 10px; border-left: 2px solid #3b82f6; padding-left: 8px;">
            <span class="timeline-meta" style="font-size: 0.75rem; color: #64748b; display: block;">${timeStr} — <strong>${userName}</strong></span>
            <strong style="font-size: 0.85rem; color: #1e293b;">${text}</strong>
        </div>
    `;
    
    // 'afterbegin' ensures the latest item goes straight to the top
    container.insertAdjacentHTML('afterbegin', activityHTML);
}


// 2. Updated Task Generation (Removed Save Button, added timeline ID)
// Safely parse timestamps for frontend rendering
function formatActivityTime(dateString) {
    if (!dateString) return 'Just now';
    const safeString = dateString.includes(' ') && !dateString.includes('T') ? dateString.replace(' ', 'T') : dateString;
    const dateObj = new Date(safeString);
    return isNaN(dateObj.getTime()) ? dateString : dateObj.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

async function loadAssignedTaskData(token) {
    const container = document.getElementById('tasksContainer');
    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/current', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            container.innerHTML = '<p>Could not fetch current tasks.</p>';
            return;
        }
        
        let tasks = await res.json();
        if (!Array.isArray(tasks)) tasks = [tasks];

        if (tasks.length === 0) {
            container.innerHTML = '<p>No assigned tasks found.</p>';
            return;
        }

        container.innerHTML = '<div class="tasks-wrapper"></div>';
        const wrapper = container.querySelector('.tasks-wrapper');

        tasks.forEach((task, index) => {
            const taskId = task.id || `temp-${index}`;
            const taskName = task.title || task.task_name || task.name || 'Untitled Task';
            const projectId = task.project_id || task.projects?.id || null;
            const estimatedHours = task.estimated_hours || 0;
            
            // Build Attachments HTML (Scrollable + Download button)
            let attachmentsHTML = '<p style="font-size: 0.75rem; color: #64748b; text-align: center; margin: 8px 0;">No attachments available.</p>';
            if (task.task_attachments && task.task_attachments.length > 0) {
                attachmentsHTML = task.task_attachments.map(att => {
                    const fileName = att.file_url.split('/').pop().split('_').slice(1).join('_') || 'Document';
                    return `
                        <div class="attachment-item" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px;">
                            <span style="font-size: 0.85rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${fileName}">📄 ${fileName}</span>
                            <a href="${att.file_url}" target="_blank" download class="btn-download-small" style="background: #3b82f6; color: white; padding: 4px 10px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold;">Download</a>
                        </div>
                    `;
                }).join('');
            }

            // Build Timeline HTML
            let timelineHTML = '<p style="font-size: 0.75rem; color: #64748b;">No activity recorded yet.</p>';
            if (task.activities && task.activities.length > 0) {
                timelineHTML = task.activities.map(act => `
                    <div class="timeline-item" style="margin-bottom: 10px; border-left: 2px solid #3b82f6; padding-left: 8px;">
                        <span class="timeline-meta" style="font-size: 0.75rem; color: #64748b; display: block;">${formatActivityTime(act.time)} — <strong>${act.user_name}</strong></span>
                        <strong style="font-size: 0.85rem; color: #1e293b;">${act.text}</strong>
                    </div>
                `).join('');
            }

            // Task Block with dynamic IDs
            const taskHTML = `
                <div class="individual-task-block" id="${taskId}"> 
                    <div class="task-block-header">
                        <h2>${taskName}</h2>
                    </div>

                    <div class="task-grid-layout">
                        <!-- Left Column -->
                        <div class="task-col-left">
                            <div class="dash-card">
                                <div class="card-title-bar green-bar">Task Details</div>
                                <div class="meta-row"><span>📅 Due Date</span><strong>${task.due_date || 'N/A'}</strong></div>
                                <div class="meta-row"><span>👤 Assigned By</span><strong>${task.assigned_by || 'Manager'}</strong></div>
                                <div class="meta-row"><span>📅 Created</span><strong>${task.created_date || 'N/A'}</strong></div>
                                <div class="meta-row"><span>⏱️ Est. Hours</span><strong id="est-hours-${taskId}">${estimatedHours} hrs</strong></div>
                            </div>

                            <div class="dash-card">
                                <div class="card-title-bar brown-bar">Attachments</div>
                                <div class="attachments-list" id="attach-list-${taskId}" style="max-height: 140px; overflow-y: auto; margin-bottom: 10px; padding-right: 4px;">${attachmentsHTML}</div>
                                <div class="upload-dropzone" onclick="document.getElementById('file-${taskId}').click()" style="cursor: pointer; border: 2px dashed #cbd5e1; padding: 12px; text-align: center; border-radius: 8px; background: #fafafa;">
                                    <p style="margin: 0 0 2px 0; font-size: 0.85rem;">☁️ <strong>Upload Attachment</strong></p>
                                    <span style="font-size: 0.75rem; color: #64748b;">Click to browse and upload</span>
                                    <input type="file" id="file-${taskId}" style="display: none;" onchange="uploadFile(event, '${taskId}', '${token}')">
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="task-col-right">
                            <div class="dash-card">
                                <div class="card-title-bar blue-bar">Description</div>
                                <p class="description-text">${task.description || 'No description provided.'}</p>
                            </div>

                            <div class="dash-card">
                                <div class="card-title-bar blue-bar">Log Work Hours</div>
                                <form id="logHoursForm-${taskId}" class="log-hours-form" onsubmit="submitWorkHours(event, '${taskId}', '${projectId}', '${token}')">
                                    <div class="form-group">
                                        <label>Hours</label>
                                        <div class="input-with-suffix">
                                            <input type="number" id="logHoursInput-${taskId}" placeholder="4" min="0.5" step="0.5" max="24" required>
                                            <span>hrs</span>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Remarks</label>
                                        <textarea id="logDescInput-${taskId}" placeholder="Describe work completed..." rows="3" required></textarea>
                                    </div>
                                    <button type="submit" class="btn-submit-blue">Submit</button>
                                </form>
                            </div>

                            <div class="dash-card">
                                <div class="card-title-bar blue-bar">Activity Timeline</div>
                                <div class="timeline-container" id="timeline-${taskId}" style="max-height: 220px; overflow-y: auto; padding-right: 4px;">
                                    ${timelineHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            wrapper.insertAdjacentHTML('beforeend', taskHTML);
        });
    } catch (err) {
        console.error("Error loading tasks:", err);
    }
}

// 3. Updated Submission functions to call appendTimelineActivity
async function submitWorkHours(event, taskId, projectId, token) {
    event.preventDefault(); 

    const hoursInput = document.getElementById(`logHoursInput-${taskId}`);
    const loggedHours = parseFloat(hoursInput.value);
    const remarks = document.getElementById(`logDescInput-${taskId}`).value;

    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ task_id: taskId, project_id: projectId, hours: loggedHours, remarks })
        });

        if (res.ok) {
            alert('Work hours logged successfully!');
            document.getElementById(`logHoursForm-${taskId}`).reset();
            
            // Visually reduce estimated hours
            const estHoursEl = document.getElementById(`est-hours-${taskId}`);
            if (estHoursEl) {
                let currentEst = parseFloat(estHoursEl.innerText.replace(' hrs', ''));
                if (!isNaN(currentEst)) {
                    let newEst = Math.max(0, currentEst - loggedHours);
                    estHoursEl.innerText = `${newEst} hrs`;
                }
            }

            // Immediately update the timeline UI
            appendTimelineActivity(taskId, `Logged ${loggedHours} hrs: ${remarks}`);
            
        } else {
            const data = await res.json();
            alert(`Failed to submit hours: ${data.error}`);
        }
    } catch (err) {
        console.error("Submission error:", err);
    }
}

async function uploadFile(event, taskId, token) {
    const file = event.target.files[0];
    if (!file) return;

    const dropzone = event.target.closest('.upload-dropzone');
    const originalText = dropzone.innerHTML;
    dropzone.innerHTML = `<p>⏳ <strong>Uploading ${file.name}...</strong></p>`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId);

    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (res.ok) {
            alert('File uploaded successfully!');
            
            // Remove 'No attachments' text if present
            const attachList = document.getElementById(`attach-list-${taskId}`);
            if(attachList.innerHTML.includes('No attachments available')) attachList.innerHTML = '';

            // Append visual file
            attachList.innerHTML += `
                <div class="attachment-item">
                    <span>📄 ${file.name}</span>
                    <span style="color: #64748b;">Just now</span>
                </div>
            `;

            // Immediately update the timeline UI
            appendTimelineActivity(taskId, `Uploaded attachment: ${file.name}`);

        } else {
            alert('File upload failed.');
        }
    } catch (err) {
        console.error("Upload error:", err);
    } finally {
        dropzone.innerHTML = originalText;
    }
}

// Modal handling for multiple tasks
let activeTaskIdForSave = null;

function triggerSaveModal(taskId) {
    activeTaskIdForSave = taskId;
    document.getElementById('saveConfirmModal').style.display = 'flex';
}

document.getElementById('modalCancelBtn').addEventListener('click', () => {
    document.getElementById('saveConfirmModal').style.display = 'none';
    activeTaskIdForSave = null;
});

document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
    if (activeTaskIdForSave) {
        document.getElementById('saveConfirmModal').style.display = 'none';
        const token = localStorage.getItem('access_token');
        await saveTaskChanges(activeTaskIdForSave, token);
        activeTaskIdForSave = null;
    }
});

async function saveTaskChanges(taskId, token) {
    // Collect updated fields from inputs if available
    const description = document.getElementById(`descInput-${taskId}`)?.value;
    
    try {
        const res = await fetch(`http://localhost:3000/api/employee/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ description })
        });
        
        if (res.ok) {
            alert(`Changes saved successfully for task: ${taskId}!`);
        } else {
            const data = await res.json();
            alert(`Failed to save changes: ${data.error}`);
        }
    } catch (err) {
        console.error("Error saving changes:", err);
    }
}

async function submitWorkHours(event, taskId, projectId, token) {
    event.preventDefault(); 

    const hoursInput = document.getElementById(`logHoursInput-${taskId}`);
    const loggedHours = parseFloat(hoursInput.value);
    const remarks = document.getElementById(`logDescInput-${taskId}`).value;

    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ task_id: taskId, project_id: projectId, hours: loggedHours, remarks })
        });

        if (res.ok) {
            alert('Work hours logged successfully!');
            document.getElementById(`logHoursForm-${taskId}`).reset();
            
            const estHoursEl = document.getElementById(`est-hours-${taskId}`);
            if (estHoursEl) {
                let currentEst = parseFloat(estHoursEl.innerText.replace(' hrs', ''));
                if (!isNaN(currentEst)) {
                    let newEst = Math.max(0, currentEst - loggedHours);
                    estHoursEl.innerText = `${newEst} hrs`;
                }
            }
        } else {
            const data = await res.json();
            alert(`Failed to submit hours: ${data.error}`);
        }
    } catch (err) {
        console.error("Submission error:", err);
    }
}

async function uploadFile(event, taskId, token) {
    const file = event.target.files[0];
    if (!file) return;

    const dropzone = event.target.closest('.upload-dropzone');
    const originalText = dropzone.innerHTML;
    dropzone.innerHTML = `<p>⏳ <strong>Uploading ${file.name}...</strong></p>`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId);

    try {
        const res = await fetch('http://localhost:3000/api/employee/tasks/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (res.ok) {
            alert('File uploaded successfully!');
            document.getElementById(`attach-list-${taskId}`).innerHTML += `
                <div class="attachment-item">
                    <span>📄 ${file.name}</span>
                    <span style="color: #64748b;">Just now</span>
                </div>
            `;
        } else {
            alert('File upload failed.');
        }
    } catch (err) {
        console.error("Upload error:", err);
    } finally {
        dropzone.innerHTML = originalText;
    }
}