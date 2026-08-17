document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        window.location.href = '../login/index.html';
        return;
    }

    // 1. Initialize Constraints & Auto-Generators
    setupFormConstraints();

    // 2. Load Dynamic Data
    await loadDynamicRolesDropdown();
    await loadLiveUsers();
    await loadLiveActivityFeed();

    function setupFormConstraints() {
        // Auto-Generate Unique EMP ID
        const generateEmpId = () => `EMP-${Math.floor(10000 + Math.random() * 90000)}`;
        document.getElementById('empId').value = generateEmpId();

        // Block Future Dates for Joining Date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('joiningDate').max = today;
    }

    async function loadDynamicRolesDropdown() {
        try {
            const res = await fetch('http://localhost:3000/api/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const roles = await res.json();
            const roleSelect = document.getElementById('roleSelect');
            roleSelect.innerHTML = '<option value="">Select Role</option>';
            
            roles.forEach(r => {
                roleSelect.innerHTML += `<option value="${r.name}">${r.name}</option>`;
            });
        } catch (e) {
            console.error("Failed to load roles for dropdown:", e);
        }
    }

    async function loadLiveUsers() {
        try {
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await res.json();
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';

            if (!users || users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No employees found in database.</td></tr>`;
                return;
            }

            users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${u.emp_id}</strong></td>
        <td>
            <a href="../profile/index.html?id=${u.emp_id}" style="color: #3182ce; text-decoration: none; font-weight: bold;" title="View Profile">
                ${u.name}
            </a>
        </td>
        <td>${u.department || 'N/A'}</td>
        <td><span style="text-transform: uppercase; font-weight: 600;">${u.role}</span></td>
        <td>${u.employment_type || 'N/A'}</td>
        <td><span class="status-badge status-active">${u.status || 'active'}</span></td>
    `;
    tbody.appendChild(tr);
});
        } catch (err) {
            console.error("Error loading users:", err);
        }
    }

async function loadLiveActivityFeed() {
    try {
        const res = await fetch('http://localhost:3000/api/activities', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activities = await res.json();
        const feedContainer = document.getElementById('activityFeed');
        
        if (!activities || activities.length === 0) {
            feedContainer.innerHTML = `<div class="activity-item"><p>No recent activity logs found.</p></div>`;
            return;
        }

        feedContainer.innerHTML = '';
        activities.forEach(act => {
            // Ensure PostgreSQL timestamp is parsed as UTC by appending 'Z' if missing
            let rawTime = act.created_at;
            if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) {
                rawTime += 'Z';
            }
            const dateObj = new Date(rawTime);
            const dateTimeString = dateObj.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            const empName = act.profiles?.name || 'System User';
            
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <p><strong>${empName}</strong><br>${act.action} (${act.module})</p>
                <span class="time">${dateTimeString}</span>
            `;
            feedContainer.appendChild(item);
        });
    } catch (err) {
        console.error("Error loading activities:", err);
    }
}

    // Form Submission for Real Account Creation
    document.getElementById('createEmployeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.querySelector('.btn-add');
        btn.textContent = 'CREATING...';
        btn.disabled = true;

        const payload = {
            name: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('tempPassword').value,
            empId: document.getElementById('empId').value,
            role: document.getElementById('roleSelect').value,
            department: document.getElementById('department').value,
            employmentType: document.getElementById('employmentType').value,
            joiningDate: document.getElementById('joiningDate').value
        };

        try {
            const res = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create employee');
            
            alert(`Employee account created successfully with ID: ${payload.empId}`);
            document.getElementById('createEmployeeForm').reset();
            
            // Reset constraints & refresh tables
            setupFormConstraints();
            loadLiveUsers();
            loadLiveActivityFeed();
        } catch (ex) {
            alert("Error: " + ex.message);
        } finally {
            btn.textContent = 'ADD EMPLOYEE';
            btn.disabled = false;
        }
    });

    // Search filter
    document.getElementById('searchEmployeeInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});