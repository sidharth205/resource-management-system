document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('../login/index.html');
        return;
    }

    if (new URLSearchParams(window.location.search).has('id')) {
        window.location.replace('../profile/index.html');
        return;
    }

    try {
        // Use the selected employee when this page is opened from user management.
        const selectedEmpId = new URLSearchParams(window.location.search).get('id');
        let empId = selectedEmpId;

        if (!empId) {
            const authRes = await fetch('http://localhost:3000/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const authData = await authRes.json();
            if (!authRes.ok || !authData.emp_id) {
                throw new Error(authData.error || 'Could not resolve user identity');
            }
            empId = authData.emp_id;
        }

        // Step 2: Fetch full profile data using your generic user endpoint
        const profileRes = await fetch(`http://localhost:3000/api/users/${empId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const emp = await profileRes.json();

        if (!profileRes.ok) throw new Error(emp.error || 'Failed to load profile details');

        // Populate Banner & Meta Info
        document.getElementById('bannerName').textContent = window.getFirstName(emp.name || 'N/A');
        document.getElementById('bannerEmail').textContent = emp.email || 'N/A';
        document.getElementById('bannerPhone').textContent = emp.phone || 'Phone not provided';
        document.getElementById('bannerJoiningDate').textContent = emp.joining_date || 'N/A';
        document.getElementById('bannerStatus').textContent = emp.status || 'Active';
        
        document.getElementById('metaEmpId').textContent = emp.emp_id || '--';
        document.getElementById('metaDepartment').textContent = emp.department || 'Project Management';
        document.getElementById('metaReporting').textContent = emp.manager_id || '--';
        document.getElementById('metaRole').textContent = emp.role || 'Employee';

        // Populate Personal Details View
        document.getElementById('detFullName').textContent = emp.name || '--';
        document.getElementById('detEmail').textContent = emp.email || '--';
        document.getElementById('detPhone').textContent = emp.phone || '--';

        // Header and Sidebar Name Updates
        document.getElementById('headerName').textContent = window.getFirstName(emp.name || 'User');
        const firstName = (emp.name || 'User').split(' ')[0];
        const sidebarUserElem = document.getElementById('sidebarUserName');
        if (sidebarUserElem) {
            sidebarUserElem.textContent = firstName;
        }

    } catch (err) {
        console.error("Error loading profile:", err);
        const passwordMessage = document.getElementById('passwordMessage');
        if (passwordMessage) {
            passwordMessage.textContent = 'Unable to load profile details: ' + err.message;
            passwordMessage.className = 'password-message error';
        }
    }

    // Handle Password Update Form Submission
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        const currentPasswordInput = document.getElementById('currentPassword');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
        const updatePasswordBtn = document.getElementById('updatePasswordBtn');
        const passwordMessage = document.getElementById('passwordMessage');
        let passwordVerified = false;
        let passwordPolicy = { minLength: 6, requireUppercase: true, requireNumbers: true, requireSpecial: false };

        async function loadPasswordPolicy() {
            try {
                const policyRes = await fetch('http://localhost:3000/api/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const settings = await policyRes.json();
                if (policyRes.ok && settings.password_policy) passwordPolicy = { ...passwordPolicy, ...settings.password_policy };
            } catch (error) {
                console.error('Could not load password policy:', error);
            }
            updatePasswordRuleLabels();
        }

        function updatePasswordRuleLabels() {
            const rules = document.querySelectorAll('#passwordRules li');
            rules.forEach(rule => {
                const labels = {
                    length: `At least ${passwordPolicy.minLength} characters`,
                    uppercase: 'At least one uppercase letter',
                    numbers: 'At least one number',
                    special: 'At least one special character'
                };
                rule.textContent = labels[rule.dataset.rule];
                rule.hidden = rule.dataset.rule === 'special' && !passwordPolicy.requireSpecial;
            });
        }

        function validateNewPassword() {
            const value = newPasswordInput.value;
            const checks = {
                length: value.length >= passwordPolicy.minLength,
                uppercase: !passwordPolicy.requireUppercase || /[A-Z]/.test(value),
                numbers: !passwordPolicy.requireNumbers || /[0-9]/.test(value),
                special: !passwordPolicy.requireSpecial || /[^A-Za-z0-9]/.test(value)
            };
            Object.entries(checks).forEach(([rule, fulfilled]) => {
                const element = document.querySelector(`#passwordRules li[data-rule="${rule}"]`);
                if (element) element.classList.toggle('fulfilled', fulfilled);
                if (element) element.classList.toggle('unfulfilled', !fulfilled);
            });
            const allRulesFulfilled = Object.values(checks).every(Boolean);
            updatePasswordBtn.disabled = !passwordVerified || !allRulesFulfilled || value !== confirmPasswordInput.value;
            return allRulesFulfilled;
        }

        function lockNewPasswordFields() {
            passwordVerified = false;
            newPasswordInput.disabled = true;
            confirmPasswordInput.disabled = true;
            updatePasswordBtn.disabled = true;
            document.querySelectorAll('#passwordRules li').forEach(rule => rule.classList.remove('fulfilled', 'unfulfilled'));
        }

        currentPasswordInput.addEventListener('input', () => {
            lockNewPasswordFields();
            passwordMessage.textContent = '';
        });

        verifyPasswordBtn.addEventListener('click', async () => {
            if (!currentPasswordInput.value) {
                passwordMessage.textContent = 'Enter your current password first.';
                passwordMessage.className = 'password-message error';
                return;
            }

            verifyPasswordBtn.disabled = true;
            verifyPasswordBtn.textContent = 'Verifying...';
            try {
                const verifyRes = await fetch('http://localhost:3000/api/auth/verify-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword: currentPasswordInput.value })
                });
                const verifyData = await verifyRes.json();
                if (!verifyRes.ok) throw new Error(verifyData.error || 'Current password is incorrect.');

                passwordVerified = true;
                newPasswordInput.disabled = false;
                confirmPasswordInput.disabled = false;
                validateNewPassword();
                passwordMessage.textContent = 'Current password verified. You can enter a new password.';
                passwordMessage.className = 'password-message success';
            } catch (error) {
                lockNewPasswordFields();
                passwordMessage.textContent = error.message;
                passwordMessage.className = 'password-message error';
            } finally {
                verifyPasswordBtn.disabled = false;
                verifyPasswordBtn.textContent = 'Verify';
            }
        });

        newPasswordInput.addEventListener('input', validateNewPassword);
        confirmPasswordInput.addEventListener('input', validateNewPassword);
        loadPasswordPolicy();

        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!passwordVerified) return;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!validateNewPassword()) {
                passwordMessage.textContent = 'Your new password does not meet all requirements.';
                passwordMessage.className = 'password-message error';
                return;
            }
            if (newPassword !== confirmPassword) {
                passwordMessage.textContent = 'New passwords do not match.';
                passwordMessage.className = 'password-message error';
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

                passwordMessage.textContent = 'Password updated successfully. You will be redirected to login.';
                passwordMessage.className = 'password-message success';
                passwordForm.reset();
                setTimeout(async () => {
                    await fetch('http://localhost:3000/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => {});
                    localStorage.clear();
                    window.location.replace('../../Landing.html');
                }, 1500);
            } catch (ex) {
                passwordMessage.textContent = ex.message;
                passwordMessage.className = 'password-message error';
            }
        });
    }

    // Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
            localStorage.clear();
            window.location.replace('../login/index.html');
        });
    }
});