document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // 1. Auth Check
    if (!token || role !== 'admin') {
        window.location.href = '../login/index.html';
        return;
    }

    // Set UI Header
    document.getElementById('userName').textContent = 'ADMIN';
    document.getElementById('headerName').textContent = 'Admin';

    // Boot up the system data
    await loadSystemSettings();
    await loadDynamicRoles();

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
            btn.textContent = 'SAVED ✓';
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
                                <button class="btn-edit" data-id="${role.id}">Edit Permissions ✏️</button>
                                <button class="btn-clone">Clone 📄</button>
                                <button class="btn-archive">Archive 🗑️</button>
                            </div>
                            <div class="role-meta">CREATED ON: ${dateStr}</div>
                        </div>
                    `;
                    cardsContainer.appendChild(card);
                });
            }

            // Always append the Create Role button at the end of the tabs
            tabsContainer.innerHTML += `<button class="tab create-role" id="btnCreateRole">Create Role ✏️</button>`;
            
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

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});