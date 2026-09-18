document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // 1. Auth Check
    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    // Set Header Info
   document.getElementById('userName').textContent = (localStorage.getItem('user_name') || 'User').toUpperCase();
document.getElementById('headerName').textContent = localStorage.getItem('user_name') || 'User';
    let allLogs = [];
    let visibleLogs = [];

    // 2. Fetch Audit Logs from Backend
    async function loadAuditLogs() {
        try {
            const response = await fetch('http://localhost:3000/api/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch audit logs');
            
            allLogs = await response.json();
            populateFilters();
            renderLogs(allLogs);
        } catch (error) {
            console.error("Error loading audit logs:", error);
            document.getElementById('auditTableBody').innerHTML = 
                `<tr><td colspan="5" style="text-align: center; color: red;">Error loading logs. Check backend connection.</td></tr>`;
        }
    }

    function populateFilters() {
        const employeeFilter = document.getElementById('employeeFilter');
        const moduleFilter = document.getElementById('moduleFilter');
        const employees = [...new Set(allLogs.map(log => log.emp_id || 'SYSTEM'))].sort();
        const modules = [...new Set(allLogs.map(log => log.module).filter(Boolean))].sort();

        employeeFilter.innerHTML = '<option value="">Employee</option>';
        moduleFilter.innerHTML = '<option value="">Module</option>';

        employees.forEach(employee => {
            employeeFilter.insertAdjacentHTML('beforeend', `<option value="${employee}">${employee}</option>`);
        });
        modules.forEach(module => {
            moduleFilter.insertAdjacentHTML('beforeend', `<option value="${module}">${module.toUpperCase()}</option>`);
        });
    }

    // 3. Render Logs to Table
    function renderLogs(logs) {
        visibleLogs = logs;
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
                <td title="Employee: ${empName}">
                    <div class="audit-employee-name">${empName}</div>
                    <div class="audit-employee-id">${empId}</div>
                </td>
                <td>${log.module.toUpperCase()}</td>
                <td>${log.action}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 4. Local Search Filtering Logic
    function applyFilters() {
        const searchTerm = document.getElementById('searchLogs').value.toLowerCase();
        const employee = document.getElementById('employeeFilter').value;
        const module = document.getElementById('moduleFilter').value;
        const dateFrom = document.getElementById('dateFrom');
        const dateTill = document.getElementById('dateTill');
        const fromDate = dateFrom.value;
        const tillDate = dateTill.value;

        dateFrom.max = tillDate || '';
        dateTill.min = fromDate || '';

        const validDateRange = !fromDate || !tillDate || fromDate <= tillDate;
        dateFrom.setCustomValidity(validDateRange ? '' : 'From date must be on or before the Till date.');
        dateTill.setCustomValidity(validDateRange ? '' : 'Till date must be on or after the From date.');

        if (!validDateRange) {
            dateFrom.reportValidity();
            return;
        }

        const filteredLogs = allLogs.filter(log => {
            const moduleMatch = log.module.toLowerCase().includes(searchTerm);
            const actionMatch = log.action.toLowerCase().includes(searchTerm);
            const empIdMatch = log.emp_id && log.emp_id.toLowerCase().includes(searchTerm);
            const nameMatch = log.profiles?.name && log.profiles.name.toLowerCase().includes(searchTerm);
            const employeeMatch = !employee || (log.emp_id || 'SYSTEM') === employee;
            const selectedModuleMatch = !module || log.module === module;
            const logDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date(log.created_at));
            const fromDateMatch = !fromDate || logDate >= fromDate;
            const tillDateMatch = !tillDate || logDate <= tillDate;

            return (moduleMatch || actionMatch || empIdMatch || nameMatch) && employeeMatch && selectedModuleMatch && fromDateMatch && tillDateMatch;
        });
        renderLogs(filteredLogs);
    }

    document.getElementById('searchLogs').addEventListener('input', applyFilters);
    document.getElementById('employeeFilter').addEventListener('change', applyFilters);
    document.getElementById('moduleFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFrom').addEventListener('change', applyFilters);
    document.getElementById('dateTill').addEventListener('change', applyFilters);

    // Toggle optional audit filters from the funnel icon.
    const filterPills = document.querySelector('.filter-pills');
    const filterToggle = document.getElementById('filterToggle');
    filterToggle.addEventListener('click', () => {
        const filtersVisible = filterPills.classList.toggle('filters-visible');
        filterToggle.setAttribute('aria-expanded', filtersVisible);
        filterToggle.setAttribute('aria-label', filtersVisible ? 'Hide filters' : 'Show filters');
    });

    function csvCell(value) {
        const text = value === null || value === undefined ? '' : String(value);
        return `"${text.replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
    }

    function setExportStatus(message, isError = false) {
        const status = document.getElementById('exportStatus');
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    // Export the rows currently visible after search and filters.
    document.getElementById('btnExport').addEventListener('click', () => {
        if (visibleLogs.length === 0) {
            setExportStatus('No logs match the current filters.', true);
            return;
        }

        const headers = ['Log ID', 'Timestamp', 'Employee Name', 'Employee ID', 'Module', 'Action', 'Record ID', 'Previous Value', 'New Value'];
        const rows = visibleLogs.map((log, index) => [
            `LOG${index + 1}`,
            log.created_at || '',
            log.profiles?.name || 'System Administrator',
            log.emp_id || 'SYSTEM',
            log.module || '',
            log.action || '',
            log.record_id || '',
            typeof log.previous_value === 'object' ? JSON.stringify(log.previous_value) : (log.previous_value || ''),
            typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : (log.new_value || '')
        ]);
        const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        setExportStatus(`${visibleLogs.length} log${visibleLogs.length === 1 ? '' : 's'} exported. Opens in Excel.`);
    });

    // 6. Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        localStorage.clear();
        window.location.replace('../login/index.html');
    });

    // Init
    loadAuditLogs();
});