document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // 1. Auth Check
    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    // Set Header Info
   document.getElementById('userName').textContent = localStorage.getItem('user_name') || 'User';
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
                `<tr><td colspan="6" class="audit-table-message">Error loading logs. Check the backend connection and try again.</td></tr>`;
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
            moduleFilter.insertAdjacentHTML('beforeend', `<option value="${module}">${module.charAt(0).toUpperCase() + module.slice(1).toLowerCase()}</option>`);
        });
    }

    // 3. Render Logs to Table
    function formatAuditValue(value) {
        if (value === null || value === undefined) return 'None';
        if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
        if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
        if (typeof value === 'object') return 'Details recorded';
        return String(value);
    }

    function formatLogNumber(log) {
        if (log.log_number !== null && log.log_number !== undefined) {
            return `LOG-${String(log.log_number).padStart(6, '0')}`;
        }
        return `LOG-${String(log.id || '').toUpperCase()}`;
    }

    const changeLabels = {
        minLength: 'Minimum password length (characters)',
        requireUppercase: 'Uppercase letters',
        requireNumbers: 'Numbers',
        requireSpecial: 'Special characters',
        expiryDays: 'Password expiry (days)',
        maxAttempts: 'Maximum login attempts',
        allowMultipleSessions: 'Multiple sessions',
        allowPasswordReset: 'Password reset',
        timeoutMins: 'Session timeout (minutes)'
    };

    function getChangeItems(log) {
        const previousValue = log.previous_value;
        const newValue = log.new_value;
        const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

        if (isRecord(previousValue) || isRecord(newValue)) {
            const previousRecord = isRecord(previousValue) ? previousValue : {};
            const newRecord = isRecord(newValue) ? newValue : {};
            const changedKeys = [...new Set([...Object.keys(previousRecord), ...Object.keys(newRecord)])]
                .filter(key => JSON.stringify(previousRecord[key]) !== JSON.stringify(newRecord[key]));
            return changedKeys.map(key => ({
                label: changeLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase()),
                previous: Object.prototype.hasOwnProperty.call(previousRecord, key) ? formatAuditValue(previousRecord[key]) : null,
                current: Object.prototype.hasOwnProperty.call(newRecord, key) ? formatAuditValue(newRecord[key]) : null
            }));
        }

        if (previousValue !== undefined || newValue !== undefined) {
            return [{
                label: 'Value',
                previous: previousValue === undefined ? null : formatAuditValue(previousValue),
                current: newValue === undefined ? null : formatAuditValue(newValue)
            }];
        }
        return [];
    }

    function changeItemsText(log) {
        const items = getChangeItems(log);
        return items.length
            ? items.map(item => `${item.label}: ${item.previous === null ? 'Set to ' + item.current : item.current === null ? 'Removed (was ' + item.previous + ')' : item.previous + ' → ' + item.current}`).join('; ')
            : 'No setting changes';
    }

    function appendChangeDetails(cell, log) {
        const items = getChangeItems(log);
        if (items.length === 0) {
            const note = document.createElement('span');
            note.className = 'change-empty';
            note.textContent = 'No setting changes';
            cell.appendChild(note);
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'change-item';
            const label = document.createElement('span');
            label.className = 'change-label';
            label.textContent = item.label;
            row.appendChild(label);

            const values = document.createElement('span');
            values.className = 'change-values';
            if (item.previous !== null && item.current !== null) {
                const previous = document.createElement('span');
                previous.className = 'change-previous';
                previous.textContent = item.previous;
                const arrow = document.createElement('span');
                arrow.className = 'change-arrow';
                arrow.setAttribute('aria-label', 'changed to');
                arrow.textContent = '→';
                const current = document.createElement('strong');
                current.className = 'change-current';
                current.textContent = item.current;
                values.append(previous, arrow, current);
            } else {
                const current = document.createElement('strong');
                current.className = 'change-current';
                current.textContent = item.current === null ? `Removed (was ${item.previous})` : item.current;
                values.appendChild(current);
            }
            row.appendChild(values);
            cell.appendChild(row);
        });
    }

    function renderLogs(logs) {
        visibleLogs = logs;
        const tbody = document.getElementById('auditTableBody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="audit-table-message">No audit logs found.</td></tr>`;
            return;
        }

        logs.forEach(log => {
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
            
            const logId = formatLogNumber(log);
            
            // Extract EMP ID and Name
            const empId = log.emp_id || 'SYSTEM';
            const empName = log.profiles?.name || 'System Administrator';

            const tr = document.createElement('tr');
            const logIdCell = document.createElement('td');
            const logIdText = document.createElement('strong');
            logIdText.textContent = logId;
            logIdCell.appendChild(logIdText);
            tr.append(logIdCell);

            const timestampCell = document.createElement('td');
            timestampCell.textContent = timeString;
            tr.append(timestampCell);

            const employeeCell = document.createElement('td');
            employeeCell.title = `Employee: ${empName}`;
            const employeeName = document.createElement('div');
            employeeName.className = 'audit-employee-name';
            employeeName.textContent = empName;
            const employeeId = document.createElement('div');
            employeeId.className = 'audit-employee-id';
            employeeId.textContent = empId;
            employeeCell.append(employeeName, employeeId);
            tr.append(employeeCell);

            [log.module || '—', log.action || '—'].forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                tr.append(cell);
            });
            const detailsCell = document.createElement('td');
            detailsCell.className = 'audit-change-details';
            appendChangeDetails(detailsCell, log);
            tr.append(detailsCell);
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
            const moduleMatch = (log.module || '').toLowerCase().includes(searchTerm);
            const actionMatch = (log.action || '').toLowerCase().includes(searchTerm);
            const detailsMatch = changeItemsText(log).toLowerCase().includes(searchTerm);
            const empIdMatch = log.emp_id && String(log.emp_id).toLowerCase().includes(searchTerm);
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

            return (moduleMatch || actionMatch || detailsMatch || empIdMatch || nameMatch) && employeeMatch && selectedModuleMatch && fromDateMatch && tillDateMatch;
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

        const headers = ['Log ID', 'Timestamp', 'Employee Name', 'Employee ID', 'Module', 'Action', 'Change Details', 'Record ID', 'Previous Value', 'New Value'];
        const rows = visibleLogs.map(log => [
            formatLogNumber(log),
            log.created_at || '',
            log.profiles?.name || 'System Administrator',
            log.emp_id || 'SYSTEM',
            log.module || '',
            log.action || '',
            changeItemsText(log),
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