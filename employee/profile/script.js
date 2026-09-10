document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../login/index.html';
        return;
    }

    // Set dynamic profile names
    const storedName = localStorage.getItem('user_name') || 'Employee';
    const formattedName = storedName.charAt(0).toUpperCase() + storedName.slice(1);
    document.getElementById('userName').textContent = formattedName.toUpperCase();

    // Load profile data dynamically from database
    await loadEmployeeProfile(token);

    // Password Update Trigger
    const updatePassBtn = document.getElementById('updatePasswordBtn');
    if (updatePassBtn) {
        updatePassBtn.addEventListener('click', async () => {
            await updatePassword(token);
        });
    }

    // Handle logout button navigation
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../login/index.html';
        });
    }
});

async function loadEmployeeProfile(token) {
    try {
        const res = await fetch('http://localhost:3000/api/employee/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;
        const profile = await res.json();

        if (profile) {
            const fullName = profile.full_name || profile.name || 'Employee Name';
            document.getElementById('profileFullName').textContent = fullName;
            document.getElementById('profileEmail').textContent = profile.email || '';
            document.getElementById('profilePhone').textContent = profile.phone || '';
            document.getElementById('profileJoined').textContent = profile.joined_date ? `Joined on ${profile.joined_date}` : '';
            
            document.getElementById('profileEmpId').textContent = profile.employee_id || '-';
            document.getElementById('profileDepartment').textContent = profile.department || 'Project Management';
            document.getElementById('profileReporting').textContent = profile.reporting_to || '-';

            // Personal details card
            document.getElementById('detFullName').textContent = fullName;
            document.getElementById('detDob').textContent = profile.dob || '-';
            document.getElementById('detGender').textContent = profile.gender || '-';
            document.getElementById('detAddress').textContent = profile.address || '-';
            document.getElementById('detEmail').textContent = profile.email || '-';
            document.getElementById('detPhone').textContent = profile.phone || '-';

            // Account settings card
            document.getElementById('settingsTimezone').textContent = profile.timezone || '-';
            document.getElementById('settingsLanguage').textContent = profile.language || '-';
        }
    } catch (err) {
        console.error("Error loading profile data from database:", err);
    }
}

async function updatePassword(token) {
    const currentPassword = document.getElementById('currentPass').value;
    const newPassword = document.getElementById('newPass').value;
    const confirmPassword = document.getElementById('confirmPass').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill out all password fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match.');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/employee/profile/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (res.ok) {
            alert('Password updated successfully!');
            document.getElementById('changePasswordForm').reset();
        } else {
            alert('Failed to update password.');
        }
    } catch (err) {
        console.error("Password update error:", err);
    }
}