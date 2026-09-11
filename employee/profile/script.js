document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    try {
        // Step 1: Discover the logged-in user's emp_id via the auth session
        const authRes = await fetch('http://localhost:3000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const authData = await authRes.json();
        if (!authRes.ok || !authData.emp_id) {
            throw new Error(authData.error || 'Could not resolve user identity');
        }

        const empId = authData.emp_id;

        // Step 2: Fetch full profile data using your generic user endpoint
        const profileRes = await fetch(`http://localhost:3000/api/users/${empId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const emp = await profileRes.json();

        if (!profileRes.ok) throw new Error(emp.error || 'Failed to load profile details');

        // Populate Banner & Meta Info
        document.getElementById('bannerName').textContent = emp.name || 'N/A';
        document.getElementById('bannerEmail').textContent = emp.email || 'N/A';
        document.getElementById('bannerPhone').textContent = emp.phone || 'Phone not provided';
        document.getElementById('bannerJoiningDate').textContent = emp.joining_date || 'N/A';
        document.getElementById('bannerStatus').textContent = (emp.status || 'Active').toUpperCase();
        
        document.getElementById('metaEmpId').textContent = emp.emp_id || '--';
        document.getElementById('metaDepartment').textContent = emp.department || 'Project Management';
        document.getElementById('metaReporting').textContent = emp.manager_id || '--';
        document.getElementById('metaRole').textContent = (emp.role || 'Employee').toUpperCase();

        // Populate Personal Details View
        document.getElementById('detFullName').textContent = emp.name || '--';
        document.getElementById('detDob').textContent = emp.dob || '--';
        document.getElementById('detGender').textContent = emp.gender || '--';
        document.getElementById('detAddress').textContent = emp.address || '--';
        document.getElementById('detEmail').textContent = emp.email || '--';
        document.getElementById('detPhone').textContent = emp.phone || '--';

        // Header and Sidebar Name Updates
        document.getElementById('headerName').textContent = emp.name || 'User';
        const firstName = (emp.name || 'User').split(' ')[0];
        const sidebarUserElem = document.getElementById('sidebarUserName');
        if (sidebarUserElem) {
            sidebarUserElem.textContent = firstName.toUpperCase();
        }

    } catch (err) {
        console.error("Error loading profile:", err);
        alert("Error loading profile details: " + err.message);
    }

    // Handle Password Update Form Submission
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match.');
                return;
            }

            try {
                const res = await fetch('http://localhost:3000/api/auth/change-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update password');

                alert('Password updated successfully!');
                passwordForm.reset();
            } catch (ex) {
                alert("Error: " + ex.message);
            }
        });
    }

    // Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../login/index.html';
        });
    }
});