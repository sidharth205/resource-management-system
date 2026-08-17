document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    // Auth Check
    if (!token || role !== 'admin') {
        window.location.href = '../login/index.html';
        return;
    }

    // Set UI Header
    document.getElementById('userName').textContent = 'ADMIN';
    document.getElementById('headerName').textContent = 'Admin';

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
        btnSave.textContent = 'SAVING...';
        btnSave.disabled = true;

        const roleName = document.getElementById('roleName').value.trim();
        
        // Gather all checked permissions
        const checkedBoxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]:checked');
        const permissions = Array.from(checkedBoxes).map(cb => cb.value);

        if (permissions.length === 0) {
            alert("Please assign at least one permission to this role.");
            btnSave.textContent = 'SAVE ROLE';
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

            const data = await response.json();

            if (!response.ok) {
                // E.g., if a role with the same name already exists
                throw new Error(data.error || 'Failed to create role');
            }

            // Successfully created - redirect back to System Configuration
            window.location.href = '../system-configuration/index.html';

        } catch (error) {
            console.error(error);
            alert("Error creating role: " + error.message);
            btnSave.textContent = 'SAVE ROLE';
            btnSave.disabled = false;
        }
    });

    // Cancel Button Route
    document.getElementById('btnCancel').addEventListener('click', () => {
        window.location.href = '../system-configuration/index.html';
    });

    // Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});