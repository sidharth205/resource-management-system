document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // Auth Check
    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    // Set UI Header
    document.getElementById('userName').textContent = localStorage.getItem('user_name') || 'User';
document.getElementById('headerName').textContent = localStorage.getItem('user_name') || 'User';
    const message = document.getElementById('createRoleMessage');
    const backLink = document.getElementById('createRoleBackLink');
    const showMessage = (text, type) => {
        message.textContent = text;
        message.className = `form-message form-message--${type}`;
        message.setAttribute('role', type === 'error' ? 'alert' : 'status');
        message.hidden = false;
    };

    // UI Helper: If "Full Admin Access" is checked, visually check everything else
    const adminOverride = document.getElementById('adminOverride');
    const allCheckboxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]');

    adminOverride.addEventListener('change', (e) => {
        if (e.target.checked) {
            allCheckboxes.forEach(cb => {
                if (cb.id !== 'adminOverride') cb.checked = true;
            });
        }
    });

    // Handle Form Submission
    document.getElementById('createRoleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSave = document.getElementById('btnSaveRole');
        message.hidden = true;
        backLink.hidden = true;
        btnSave.textContent = 'SAVING...';
        btnSave.disabled = true;

        const roleName = document.getElementById('roleName').value.trim();
        
        // Gather all checked permissions
        const checkedBoxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]:checked');
        const permissions = Array.from(checkedBoxes).map(cb => cb.value);

        if (permissions.length === 0) {
            showMessage('Please assign at least one permission to this role.', 'error');
            btnSave.textContent = 'Save Role';
            btnSave.disabled = false;
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/roles', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    name: roleName, 
                    permissions: permissions 
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // E.g., if a role with the same name already exists
                throw new Error(data.error || 'The role could not be created. Please try again.');
            }

            showMessage('Role created successfully.', 'success');
            backLink.hidden = false;
            btnSave.textContent = 'Saved';

        } catch (error) {
            console.error(error);
            const reason = error instanceof Error ? error.message : 'An unexpected error occurred.';
            showMessage(`Could not create role: ${reason}`, 'error');
            btnSave.textContent = 'Save Role';
            btnSave.disabled = false;
        }
    });

    // Cancel Button Route
    document.getElementById('btnCancel').addEventListener('click', () => {
        window.location.href = '../system-configuration/index.html';
    });

    // Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        localStorage.clear();
        window.location.replace('../login/index.html');
    });
});