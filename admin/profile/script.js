document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    // 1. Get Employee ID from URL query params (e.g. ?id=EMP-0001)
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get('id');

    if (!empId) {
        alert('No employee specified.');
        window.location.href = '../user-management/index.html';
        return;
    }

    // 2. Fetch Employee Profile from Backend
    try {
        const res = await fetch(`http://localhost:3000/api/users/${empId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const emp = await res.json();

        if (!res.ok) throw new Error(emp.error || 'Failed to load profile');

        // Populate Banner & Meta info
        document.getElementById('bannerName').textContent = emp.name;
        document.getElementById('bannerEmail').textContent = emp.email;
        document.getElementById('bannerPhone').textContent = emp.phone || 'Phone not provided';
        document.getElementById('bannerJoiningDate').textContent = emp.joining_date || 'N/A';
        document.getElementById('bannerStatus').textContent = (emp.status || 'Active').toUpperCase();
        
        document.getElementById('metaEmpId').textContent = emp.emp_id;
        document.getElementById('metaDepartment').textContent = emp.department || 'N/A';
        document.getElementById('metaReporting').textContent = emp.manager_id || 'System Admin';
        document.getElementById('metaRole').textContent = emp.role.toUpperCase();

        // Populate Personal Details Form View
        document.getElementById('detFullName').textContent = emp.name;
        document.getElementById('detDob').textContent = emp.dob || 'Not specified';
        document.getElementById('detGender').textContent = emp.gender || 'Not specified';
        document.getElementById('detAddress').textContent = emp.address || 'Not specified';
        document.getElementById('detEmail').textContent = emp.email;
        document.getElementById('detPhone').textContent = emp.phone || 'Not specified';

        // Header name update
        document.getElementById('headerName').textContent = emp.name;
        document.getElementById('sidebarUserName').textContent = emp.name.split(' ')[0].toUpperCase();

    } catch (err) {
        console.error("Error loading profile:", err);
        alert("Error loading profile details.");
    }

    // 3. Handle Password Update Form Submission
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
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
                body: JSON.stringify({ newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update password');

            alert('Password updated successfully!');
            document.getElementById('changePasswordForm').reset();
        } catch (ex) {
            alert("Error: " + ex.message);
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../login/index.html';
    });
});