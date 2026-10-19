document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const userName = localStorage.getItem('user_name');

    if (!token || role !== 'admin') {
        window.location.replace('../login/index.html');
        return;
    }

    document.getElementById('userName').textContent = localStorage.getItem('user_name') || 'User';
document.getElementById('headerName').textContent = localStorage.getItem('user_name') || 'User';
    const message = document.getElementById('updateRoleMessage');
    const backLink = document.getElementById('updateRoleBackLink');
    const updateForm = document.getElementById('updateRoleForm');
    const showMessage = (text, type) => {
        message.textContent = text;
        message.className = `form-message form-message--${type}`;
        message.setAttribute('role', type === 'error' ? 'alert' : 'status');
        message.hidden = false;
    };
    const params = new URLSearchParams(window.location.search);
    const roleId = params.get('id');

    if (!roleId) {
        showMessage('No role was specified to update. Return to System Configuration and select a role.', 'error');
        updateForm.hidden = true;
        return;
    }

    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // ---------- Load existing role ----------
    try {
        const res = await fetch(`http://localhost:3000/api/roles/${roleId}`, { headers: authHeaders });
        if (!res.ok) throw new Error('Role not found');
        const roleData = await res.json();

        document.getElementById('roleName').value = roleData.name || '';
        document.getElementById('roleDescription').value = roleData.description || '';

        const permissions = roleData.permissions || [];
        document.querySelectorAll('#permissionsGrid input[type="checkbox"]').forEach(cb => {
            if (permissions.includes(cb.value)) cb.checked = true;
        });
    } catch (e) {
        console.error(e);
        showMessage('Could not load this role. Return to System Configuration and try again.', 'error');
        updateForm.hidden = true;
        return;
    }

    // "Full Admin Access" helper checkbox
    const adminOverride = document.getElementById('adminOverride');
    const allCheckboxes = document.querySelectorAll('#permissionsGrid input[type="checkbox"]');
    adminOverride.addEventListener('change', (e) => {
        if (e.target.checked) {
            allCheckboxes.forEach(cb => { if (cb.id !== 'adminOverride') cb.checked = true; });
        }
    });

    // ---------- Submit update ----------
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnConfirm = document.getElementById('btnConfirmUpdate');
        message.hidden = true;
        backLink.hidden = true;
        btnConfirm.textContent = 'UPDATING...';
        btnConfirm.disabled = true;

        const roleName = document.getElementById('roleName').value.trim();
        const description = document.getElementById('roleDescription').value.trim();
        const checkedBoxes = document.querySelectorAll('#permissionsGrid input[type="checkbox"]:checked');
        const permissions = Array.from(checkedBoxes).map(cb => cb.value);

        if (permissions.length === 0) {
            showMessage('Please assign at least one permission to this role.', 'error');
            btnConfirm.textContent = 'Confirm Update';
            btnConfirm.disabled = false;
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/roles/${roleId}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ name: roleName, description, permissions })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'The role could not be updated. Please try again.');

            showMessage('Role updated successfully.', 'success');
            backLink.hidden = false;
            btnConfirm.textContent = 'Updated';
        } catch (error) {
            console.error(error);
            const reason = error instanceof Error ? error.message : 'An unexpected error occurred.';
            showMessage(`Could not update role: ${reason}`, 'error');
            btnConfirm.textContent = 'Confirm Update';
            btnConfirm.disabled = false;
        }
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