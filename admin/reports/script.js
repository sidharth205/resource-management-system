document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');

    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    document.getElementById('userName').textContent = userName || 'Admin';
    document.getElementById('headerName').textContent = userName || 'Admin';

    const authHeaders = { 'Authorization': `Bearer ${token}` };
    let selectedProjectId = null;
    let currentReportTitle = '';
    let currentReportRows = [];

    async function apiGet(path) {
        const res = await fetch(`http://localhost:3000${path}`, { headers: authHeaders });
        if (!res.ok) throw new Error(`Request failed: ${path}`);
        return res.json();
    }

    function shortProjectId(projectId) {
        return projectId.length > 8 ? `${projectId.slice(0, 8)}...` : projectId;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function setReportStatus(message, isError = false) {
        const status = document.getElementById('reportStatus');
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    function pdfSafeText(value) {
        return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E]/g, '?');
    }

    function reportLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
    }

    function reportValue(value) {
        if (value === null || value === undefined || value === '') return '--';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function objectReportRows(object) {
        return Object.entries(object || {}).map(([key, value]) => `${reportLabel(key)}: ${reportValue(value)}`);
    }

    function createPdfBlob(title, rows) {
        const lines = [title, '', ...rows].flatMap(row => {
            const text = pdfSafeText(row);
            const chunks = text.match(/.{1,100}(?:\s+|$)/g) || [''];
            return chunks.map(chunk => chunk.trim());
        });
        const pageLines = 44;
        const pages = [];
        for (let index = 0; index < lines.length; index += pageLines) pages.push(lines.slice(index, index + pageLines));

        const objects = [];
        const addObject = content => { objects.push(content); return objects.length; };
        const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
        const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
        const pageIds = [];
        const contentIds = [];
        pages.forEach(pageLinesForPage => {
            const commands = ['BT', '/F1 10 Tf', '50 760 Td'];
            pageLinesForPage.forEach((line, lineIndex) => {
                const escaped = pdfSafeText(line).replace(/[\\()]/g, character => `\\${character}`);
                const isHeading = line && line === line.toUpperCase() && !line.includes(':');
                commands.push(isHeading ? '/F2 11 Tf' : '/F1 10 Tf');
                commands.push(`(${escaped}) Tj`);
                if (lineIndex < pageLinesForPage.length - 1) commands.push('0 -16 Td');
            });
            commands.push('ET');
            const stream = commands.join('\n');
            contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
            pageIds.push(addObject(''));
        });
        const pagesId = addObject('');
        pageIds.forEach((pageId, index) => {
            objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
        });
        objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
        const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        objects.forEach((object, index) => {
            offsets[index + 1] = pdf.length;
            pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });
        const xrefOffset = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
        return new Blob([pdf], { type: 'application/pdf' });
    }

    function downloadCurrentReport() {
        if (!currentReportRows.length) {
            setReportStatus('Generate a report before downloading it.', true);
            return;
        }
        const blob = createPdfBlob(currentReportTitle, currentReportRows);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentReportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
        setReportStatus('PDF report downloaded.');
    }

    async function shareCurrentReport() {
        if (!currentReportRows.length) {
            setReportStatus('Generate a report before sharing it.', true);
            return;
        }
        const shareText = `${currentReportTitle}\n\n${currentReportRows.join('\n')}`;
        try {
            const pdfBlob = createPdfBlob(currentReportTitle, currentReportRows);
            const pdfFile = new File([pdfBlob], `${currentReportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, { type: 'application/pdf' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({ title: currentReportTitle, files: [pdfFile] });
                setReportStatus('PDF report shared.');
            } else if (navigator.share) {
                await navigator.share({ title: currentReportTitle, text: shareText });
                setReportStatus('Report shared.');
            } else {
                await navigator.clipboard.writeText(shareText);
                setReportStatus('Report details copied to the clipboard.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') setReportStatus('Unable to share the report from this browser.', true);
        }
    }

    // ---------- 1. Project Reports ----------
    async function loadProjectReports() {
        try {
            const summary = await apiGet('/api/reports/summary');
            document.getElementById('statOngoing').textContent = summary.counts.ongoing;
            document.getElementById('statCompleted').textContent = summary.counts.completed;
            document.getElementById('statDelayed').textContent = summary.counts.delayed;

            const tbody = document.getElementById('projectReportsBody');
            if (!summary.projects || summary.projects.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No projects found.</td></tr>`;
                return;
            }

            tbody.innerHTML = summary.projects.map(p => `
                <tr>
                    <td class="project-id-cell" title="${p.id}">
                        <span>${shortProjectId(p.id)}</span>
                        <button type="button" class="copy-project-id" data-project-id="${p.id}" aria-label="Copy project ID" title="Copy full project ID"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"></path></svg></button>
                    </td>
                    <td>${p.name}</td>
                    <td>${p.managerName || 'Unassigned'}</td>
                    <td>${p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : '--'}</td>
                    <td>${p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '--'}</td>
                    <td><input type="radio" name="selectedProject" value="${p.id}" data-name="${p.name}"></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('input[name="selectedProject"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    selectedProjectId = e.target.value;
                    setReportStatus(`Project selected: ${e.target.dataset.name}`);
                });
            });

            tbody.querySelectorAll('.copy-project-id').forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(button.dataset.projectId);
                        button.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"></path></svg>';
                        button.title = 'Copied';
                        setTimeout(() => {
                            button.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"></path></svg>';
                            button.title = 'Copy full project ID';
                        }, 1500);
                    } catch (e) {
                        button.title = 'Unable to copy project ID';
                    }
                });
            });
        } catch (e) {
            console.error(e);
            document.getElementById('projectReportsBody').innerHTML = `<tr><td colspan="6" class="empty-row">Error loading projects.</td></tr>`;
        }
    }

    async function generateProjectReport() {
        if (!selectedProjectId) { setReportStatus('Select a project before generating its report.', true); return null; }
        try {
            const report = await apiGet(`/api/reports/project/${encodeURIComponent(selectedProjectId)}`);
            const { project, members, tasks, timesheets, metrics } = report;
            const rows = [
                'PROJECT DETAILS',
                ...objectReportRows({ ...project, manager_name: project.managerName }),
                '',
                `REPORT METRICS`,
                ...objectReportRows(metrics),
                '',
                `PROJECT MEMBERS (${members.length})`,
                ...(members.length ? members.flatMap((member, index) => [`Member ${index + 1}`, ...objectReportRows(member), '']) : ['No team members assigned']),
                `TASK DETAILS (${tasks.length})`,
                ...(tasks.length ? tasks.flatMap((task, index) => [`Task ${index + 1}`, ...objectReportRows(task), '']) : ['No tasks recorded']),
                `TIMESHEET DETAILS (${timesheets.length})`,
                ...(timesheets.length ? timesheets.flatMap((sheet, index) => [`Timesheet ${index + 1}`, ...objectReportRows(sheet), '']) : ['No timesheets recorded'])
            ];
            openModal(`PROJECT REPORT: ${project.name}`, rows);
            return report;
        } catch (e) {
            setReportStatus('Could not generate the project report.', true);
            return null;
        }
    }

    document.getElementById('btnViewProjectReport').addEventListener('click', async () => { await generateProjectReport(); });
    document.getElementById('btnExportProjectReport').addEventListener('click', async () => {
        if (!selectedProjectId) { setReportStatus('Select a project before downloading its report.', true); return; }
        const report = await generateProjectReport();
        if (report) downloadCurrentReport();
    });

    // ---------- 2. Employee Activity Reports ----------
    async function loadActivityFilters() {
        try {
            const users = await apiGet('/api/users');
            const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

            const deptSelect = document.getElementById('activityDepartment');
            departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d; opt.textContent = d;
                deptSelect.appendChild(opt);
            });

            const empSelect = document.getElementById('activityEmployee');
            function renderEmployees(filterDept) {
                empSelect.innerHTML = '<option value="">Select Employee</option>';
                users.filter(u => !filterDept || u.department === filterDept).forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.emp_id; opt.textContent = u.name;
                    empSelect.appendChild(opt);
                });
            }
            renderEmployees(null);
            deptSelect.addEventListener('change', () => renderEmployees(deptSelect.value));
        } catch (e) {
            console.error('Failed to load employees:', e);
        }
    }

    document.getElementById('btnViewActivityReport').addEventListener('click', async () => {
        const department = document.getElementById('activityDepartment').value;
        const empId = document.getElementById('activityEmployee').value;
        try {
            const result = await apiGet(`/api/reports/employee-activity?department=${encodeURIComponent(department)}&empId=${encodeURIComponent(empId)}`);
            const rows = result.activity.length
                ? result.activity.map(a => `${a.action || 'Activity'} — ${new Date(a.created_at).toLocaleString()}`)
                : ['No activity found for this selection'];
            openModal('EMPLOYEE ACTIVITY REPORT', rows);
        } catch (e) {
            setReportStatus('Could not load the employee activity report.', true);
        }
    });
    document.getElementById('btnExportActivityReport').addEventListener('click', async () => {
        const department = document.getElementById('activityDepartment').value;
        const empId = document.getElementById('activityEmployee').value;
        try {
            const result = await apiGet(`/api/reports/employee-activity?department=${encodeURIComponent(department)}&empId=${encodeURIComponent(empId)}`);
            const rows = result.activity.length
                ? result.activity.map(a => `${a.action || 'Activity'} - ${new Date(a.created_at).toLocaleString()}`)
                : ['No activity found for this selection'];
            openModal('EMPLOYEE ACTIVITY REPORT', rows);
            downloadCurrentReport();
        } catch (e) {
            setReportStatus('Could not download the employee activity report.', true);
        }
    });

    // ---------- 3. Resource Allocation Reports ----------
    async function loadResourceProjects() {
        try {
            const projects = await apiGet('/api/projects');
            const select = document.getElementById('resProject');
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id; opt.textContent = p.name;
                select.appendChild(opt);
            });
            select.addEventListener('change', () => {
                if (select.value) {
                    loadAllocation(select.value);
                    setReportStatus(`Loading allocation for ${select.options[select.selectedIndex].textContent}...`);
                } else {
                    resetAllocationDisplay();
                    setReportStatus('Select a project to view its allocation.');
                }
            });
            resetAllocationDisplay();
        } catch (e) {
            console.error('Failed to load projects:', e);
        }
    }

    let currentAllocation = null;

    function resetAllocationDisplay() {
        currentAllocation = null;
        document.getElementById('allocFill').style.width = '0%';
        document.getElementById('allocFigures').textContent = '--/--';
        document.getElementById('utilPercentage').textContent = '--%';
    }

    async function loadAllocation(projectId) {
        try {
            const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
            const alloc = await apiGet(`/api/reports/resource-allocation${query}`);
            currentAllocation = alloc;
            document.getElementById('allocFill').style.width = `${alloc.utilizationPercentage}%`;
            document.getElementById('allocFigures').textContent = `${alloc.allocatedEmployees}/${alloc.totalEmployees}`;
            document.getElementById('utilPercentage').textContent = `${alloc.utilizationPercentage}%`;
        } catch (e) {
            console.error('Failed to load allocation:', e);
        }
    }

    document.getElementById('btnViewResourceReport').addEventListener('click', () => {
        if (!currentAllocation) { setReportStatus('Select a project before viewing its allocation report.', true); return; }
        const figures = document.getElementById('allocFigures').textContent;
        const util = document.getElementById('utilPercentage').textContent;
        const selectedProject = document.getElementById('resProject');
        const projectName = selectedProject.value
            ? selectedProject.options[selectedProject.selectedIndex].textContent
            : 'All projects';
        openModal('RESOURCE ALLOCATION REPORT', [
            `Project: ${projectName}`,
            `Allocated employees: ${figures}`,
            `Organization utilization: ${util}`,
            `Tracked projects: ${currentAllocation.projects.length}`,
            currentAllocation.members.length
                ? `Assigned employee IDs: ${currentAllocation.members.map(member => member.emp_id).join(', ')}`
                : 'No employees are assigned to this project'
        ]);
    });

    // ---------- Report View Modal ----------
    const modal = document.getElementById('reportModal');
    function openModal(title, rows) {
        currentReportTitle = title;
        currentReportRows = rows.map(row => String(row));
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = currentReportRows
            .map(row => `<div class="modal-row">${escapeHtml(row)}</div>`)
            .join('');

        const now = new Date();
        document.getElementById('metaDate').textContent = now.toLocaleDateString('en-GB');
        document.getElementById('metaTime').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('metaCreatedBy').textContent = `${userName || 'Admin'}`;
        setReportStatus('');

        modal.classList.add('show');
    }
    document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    document.getElementById('btnExportModalReport').addEventListener('click', downloadCurrentReport);
    document.getElementById('btnShareReport').addEventListener('click', shareCurrentReport);

    // ---------- Boot ----------
    await Promise.all([loadProjectReports(), loadActivityFilters(), loadResourceProjects()]);

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        localStorage.clear();
        window.location.replace('../login/index.html');
    });
});