document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // 1. Auth Check
    if (!token || role !== 'admin') {
        window.location.href = '../login/index.html';
        return;
    }

    // Set Header Info
    document.getElementById('userName').textContent = 'ADMIN';
    document.getElementById('headerName').textContent = 'Admin';

    let allLogs = [];

    // 2. Fetch Audit Logs from Backend
    async function loadAuditLogs() {
        try {
            const response = await fetch('http://localhost:3000/api/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch audit logs');
            
            allLogs = await response.json();
            renderLogs(allLogs);
        } catch (error) {
            console.error("Error loading audit logs:", error);
            document.getElementById('auditTableBody').innerHTML = 
                `<tr><td colspan="5" style="text-align: center; color: red;">Error loading logs. Check backend connection.</td></tr>`;
        }
    }

    // 3. Render Logs to Table
    function renderLogs(logs) {
        const tbody = document.getElementById('auditTableBody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No audit logs found.</td></tr>`;
            return;
        }

        logs.forEach((log, index) => {
            // Ensure PostgreSQL timestamp is parsed as UTC by appending 'Z' if missing
            let rawTime = log.created_at;
            if (rawTime && !rawTime.endsWith('Z') && !rawTime.includes('+')) {
                rawTime += 'Z';
            }

            const dateObj = new Date(rawTime);
            const timeString = dateObj.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const logId = `LOG${index + 1}`; 
            
            // Extract EMP ID and Name
            const empId = log.emp_id || 'SYSTEM';
            const empName = log.profiles?.name || 'System Administrator';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${logId}</strong></td>
                <td>${timeString}</td>
                <td title="Name: ${empName}" style="cursor: help; text-decoration: underline dotted #cbd5e0;">
                    ${empId}
                </td>
                <td>${log.module.toUpperCase()}</td>
                <td>${log.action}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 4. Local Search Filtering Logic
    document.getElementById('searchLogs').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredLogs = allLogs.filter(log => {
            const moduleMatch = log.module.toLowerCase().includes(searchTerm);
            const actionMatch = log.action.toLowerCase().includes(searchTerm);
            const empIdMatch = log.emp_id && log.emp_id.toLowerCase().includes(searchTerm);
            const nameMatch = log.profiles?.name && log.profiles.name.toLowerCase().includes(searchTerm);
            
            return moduleMatch || actionMatch || empIdMatch || nameMatch;
        });
        renderLogs(filteredLogs);
    });

    // 5. Export Functionality Mock
    document.getElementById('btnExport').addEventListener('click', () => {
        alert('Exporting logs to CSV...');
    });

    // 6. Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });

    // Init
    loadAuditLogs();
});