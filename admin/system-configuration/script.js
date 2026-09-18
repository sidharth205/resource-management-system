document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // 1. Auth Check
    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    // Set UI Header
    document.getElementById('userName').textContent = (localStorage.getItem('user_name') || 'User').toUpperCase();
document.getElementById('headerName').textContent = localStorage.getItem('user_name') || 'User';
    // Boot up the system data
    await loadSystemSettings();
    await loadDynamicRoles();

    document.getElementById('settingsSearch').addEventListener('input', (event) => {
        const searchTerm = event.target.value.trim().toLowerCase();
        const roleCards = document.querySelectorAll('#dynamicRolesCards .role-card');
        const roleTabs = document.querySelectorAll('#dynamicRolesTabs .tab:not(.create-role)');
        const rolePanel = document.getElementById('dynamicRolesCards').closest('.dark-card');
        const sectionTitles = document.querySelectorAll('.section-title h3');
        const roleSectionMatches = !searchTerm || sectionTitles[0].textContent.toLowerCase().includes(searchTerm);
        let visibleRoleCount = 0;

        roleCards.forEach(card => {
            const matches = roleSectionMatches || !searchTerm || card.dataset.searchText.includes(searchTerm);
            card.hidden = !matches;
            if (matches) visibleRoleCount += 1;
        });
        roleTabs.forEach(tab => {
            tab.hidden = Boolean(searchTerm) && !roleSectionMatches && !tab.textContent.toLowerCase().includes(searchTerm);
        });
        rolePanel.hidden = Boolean(searchTerm) && visibleRoleCount === 0;

        const securityPanel = document.querySelector('.config-forms');
        const securitySectionMatches = !searchTerm || sectionTitles[1].textContent.toLowerCase().includes(searchTerm);
        let visiblePolicyCount = 0;
        securityPanel.querySelectorAll('.policy-group').forEach(group => {
            const groupHeadingMatches = securitySectionMatches || group.querySelector('h4').textContent.toLowerCase().includes(searchTerm);
            const policyRows = group.querySelectorAll('.policy-row');
            let visibleRows = 0;
            policyRows.forEach(row => {
                const rowMatches = groupHeadingMatches || !searchTerm || row.textContent.toLowerCase().includes(searchTerm);
                row.hidden = !rowMatches;
                if (rowMatches) visibleRows += 1;
            });
            group.hidden = Boolean(searchTerm) && visibleRows === 0;
            if (visibleRows > 0) visiblePolicyCount += 1;
        });
        securityPanel.hidden = Boolean(searchTerm) && visiblePolicyCount === 0;

        let emptyState = document.getElementById('roleSearchEmpty');
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'roleSearchEmpty';
            emptyState.className = 'search-empty-state';
            emptyState.textContent = 'No system configuration settings match your search.';
            document.querySelector('.config-layout').appendChild(emptyState);
        }
        emptyState.style.display = searchTerm && visibleRoleCount === 0 && visiblePolicyCount === 0 ? 'block' : 'none';
    });

    // ==========================================
    // MODULE 1: SYSTEM SETTINGS
    // ==========================================
    async function loadSystemSettings() {
        try {
            const res = await fetch('http://localhost:3000/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const settings = await res.json();
            
            if (settings.password_policy) {
                const pp = settings.password_policy;
                document.getElementById('pp-length').textContent = pp.minLength;
                document.getElementById('pp-uppercase').checked = pp.requireUppercase;
                document.getElementById('pp-numbers').checked = pp.requireNumbers;
                document.getElementById('pp-special').checked = pp.requireSpecial;
                document.getElementById('pp-expiry').value = pp.expiryDays; // Set editable input
            }

            if (settings.access_policy) {
                const ap = settings.access_policy;
                document.getElementById('ap-attempts').textContent = ap.maxAttempts;
                document.getElementById('ap-multiple').checked = ap.allowMultipleSessions;
                document.getElementById('ap-reset').checked = ap.allowPasswordReset;
                document.getElementById('ap-timeout').value = ap.timeoutMins; // Set editable input
            }
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    }

    // Save Password Policy
    document.getElementById('btnSavePasswordPolicy').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.textContent = 'SAVING...';
        
        const payload = {
            minLength: parseInt(document.getElementById('pp-length').textContent),
            requireUppercase: document.getElementById('pp-uppercase').checked,
            requireNumbers: document.getElementById('pp-numbers').checked,
            requireSpecial: document.getElementById('pp-special').checked,
            expiryDays: parseInt(document.getElementById('pp-expiry').value) || 90 // Read editable input
        };

        await updateSetting('password_policy', payload, btn);
    });

    // Save Access Policy
    document.getElementById('btnSaveAccessPolicy').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.textContent = 'SAVING...';
        
        const payload = {
            maxAttempts: parseInt(document.getElementById('ap-attempts').textContent),
            allowMultipleSessions: document.getElementById('ap-multiple').checked,
            allowPasswordReset: document.getElementById('ap-reset').checked,
            timeoutMins: parseInt(document.getElementById('ap-timeout').value) || 30 // Read editable input
        };

        await updateSetting('access_policy', payload, btn);
    });

    async function updateSetting(key, value, btn) {
        try {
            await fetch(`http://localhost:3000/api/settings/${key}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ value })
            });
            btn.innerHTML = 'SAVED <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"></path></svg>';
            btn.style.backgroundColor = '#48bb78';
            setTimeout(() => { btn.textContent = 'SAVE'; btn.style.backgroundColor = '#3182ce'; }, 2000);
        } catch (e) {
            console.error(e);
            btn.textContent = 'ERROR';
        }
    }

    // ==========================================
    // MODULE 2: DYNAMIC ROLES
    // ==========================================
    async function loadDynamicRoles() {
        try {
            const res = await fetch('http://localhost:3000/api/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const roles = await res.json();
            
            const tabsContainer = document.getElementById('dynamicRolesTabs');
            const cardsContainer = document.getElementById('dynamicRolesCards');
            
            tabsContainer.innerHTML = '';
            cardsContainer.innerHTML = '';

            // Handle empty state explicitly
            if (!roles || roles.length === 0) {
                cardsContainer.innerHTML = `<div class="empty-roles-state">No roles have been created yet.</div>`;
            } else {
                roles.forEach(role => {
                    // Build Tabs
                    const tab = document.createElement('button');
                    tab.className = 'tab';
                    tab.textContent = role.name;
                    tabsContainer.appendChild(tab);

                    // Build Permission Cards
                    const card = document.createElement('div');
                    card.className = 'role-card';
                    card.dataset.searchText = `${role.name} ${(role.permissions || []).join(' ')}`.toLowerCase();
                    
                    let pillsHtml = '';
                    if (role.permissions && role.permissions.length > 0) {
                        role.permissions.forEach(perm => {
                            pillsHtml += `<span class="pill">${perm.replace(/_/g, ' ').toUpperCase()}</span>`;
                        });
                    } else {
                        pillsHtml = `<span style="color: #a0aec0; font-size: 0.8rem;">No permissions assigned</span>`;
                    }

                    const dateStr = new Date(role.created_at).toLocaleDateString('en-GB');

                    card.innerHTML = `
                        <h4>${role.name.toUpperCase()}</h4>
                        <p class="section-label">PERMISSIONS</p>
                        <div class="permissions-list">${pillsHtml}</div>
                        <div class="role-card-footer">
                            <div class="role-actions">
                                <button class="btn-edit" data-id="${role.id}">Edit Permissions <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 6l4 4"></path></svg></button>
                                <button class="btn-clone">Clone <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"></path></svg></button>
                                <button class="btn-archive">Archive <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3M10 11v5M14 11v5"></path></svg></button>
                            </div>
                            <div class="role-meta">CREATED ON: ${dateStr}</div>
                        </div>
                    `;
                    cardsContainer.appendChild(card);
                });

                // Wire up "Edit Permissions" buttons to the Update Role page
                document.querySelectorAll('.btn-edit[data-id]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        window.location.href = `../roles-permissions-update/index.html?id=${btn.dataset.id}`;
                    });
                });
            }

            // Always append the Create Role button at the end of the tabs
            tabsContainer.innerHTML += `<button class="tab create-role" id="btnCreateRole">Create Role <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 6l4 4"></path></svg></button>`;
            
            document.getElementById('btnCreateRole').addEventListener('click', () => {
                window.location.href = '../roles-permissions-create/index.html'; 
            });

        } catch (e) {
            console.error("Failed to load roles:", e);
            document.getElementById('dynamicRolesCards').innerHTML = `<div class="empty-roles-state">Error connecting to database.</div>`;
        }
    }

    // ==========================================
    // UI STEPPER LOGIC (+/- Buttons)
    // ==========================================
    document.querySelectorAll('.stepper').forEach(stepper => {
        const minusBtn = stepper.querySelector('.btn-minus');
        const plusBtn = stepper.querySelector('.btn-plus');
        const valSpan = stepper.querySelector('.stepper-val');
        
        minusBtn.addEventListener('click', () => {
            let val = parseInt(valSpan.textContent);
            if (val > 1) valSpan.textContent = val - 1;
        });
        
        plusBtn.addEventListener('click', () => {
            let val = parseInt(valSpan.textContent);
            valSpan.textContent = val + 1;
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        localStorage.clear();
        window.location.replace('../login/index.html');
    });
});