document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'manager') {
        window.location.replace('../../admin/login/index.html');
        return;
    }

    const BASE_URL = 'http:' + String.fromCharCode(47, 47) + 'localhost:3000';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const mobileBtn = document.getElementById('mobileToggleBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Notifications counter badge
    try {
        const notifRes = await fetch(`${BASE_URL}/api/notifications`, { headers });
        if (notifRes.ok) {
            const notifs = await notifRes.json();
            if (Array.isArray(notifs)) {
                const unreadCount = notifs.filter(n => !n.is_read).length;
                if (unreadCount > 0) {
                    const bellBadge = document.getElementById('bellBadge');
                    const navBadge = document.getElementById('navNotifBadge');
                    if (bellBadge) bellBadge.style.display = 'block';
                    if (navBadge) {
                        navBadge.textContent = unreadCount;
                        navBadge.style.display = 'inline-block';
                    }
                }
            }
        }
    } catch (e) {}

    // Step 1: Fetch Profile Data
    try {
        let emp = null;

        // Try primary employee profile endpoint
        try {
            const res = await fetch(`${BASE_URL}/api/employee/profile`, { headers });
            if (res.ok) {
                emp = await res.json();
            }
        } catch (e) {}

        // Fallback: discover emp_id via /api/auth/me then fetch from /api/users/:empId
        if (!emp || !emp.emp_id) {
            try {
                const authRes = await fetch(`${BASE_URL}/api/auth/me`, { headers });
                if (authRes.ok) {
                    const authData = await authRes.json();
                    const empId = authData.emp_id || localStorage.getItem('emp_id');
                    if (empId) {
                        const uRes = await fetch(`${BASE_URL}/api/users/${empId}`, { headers });
                        if (uRes.ok) {
                            emp = await uRes.json();
                        }
                    }
                }
            } catch (e) {}
        }

        if (!emp) throw new Error('Could not load profile details');

        // Populate Banner Info
        const bannerNameEl = document.getElementById('bannerName');
        if (bannerNameEl) bannerNameEl.textContent = emp.name || 'Manager';

        const bannerEmailEl = document.getElementById('bannerEmail');
        if (bannerEmailEl) bannerEmailEl.textContent = emp.email || 'N/A';

        const bannerPhoneEl = document.getElementById('bannerPhone');
        if (bannerPhoneEl) bannerPhoneEl.textContent = emp.phone || 'Phone not provided';

        let joinDate = 'N/A';
        if (emp.joining_date) {
            const d = new Date(emp.joining_date);
            joinDate = isNaN(d.getTime()) ? emp.joining_date : d.toISOString().split('T')[0];
        }
        const bannerJoiningDateEl = document.getElementById('bannerJoiningDate');
        if (bannerJoiningDateEl) bannerJoiningDateEl.textContent = joinDate;

        const bannerStatusEl = document.getElementById('bannerStatus');
        if (bannerStatusEl) {
            const isActive = (emp.status || (emp.active ? 'active' : 'inactive') || 'active').toLowerCase() === 'active';
            bannerStatusEl.textContent = isActive ? 'active' : 'inactive';
        }

        // Populate Meta Info (2x2 Grid)
        const metaEmpIdEl = document.getElementById('metaEmpId');
        if (metaEmpIdEl) metaEmpIdEl.textContent = emp.emp_id || '--';

        const metaDepartmentEl = document.getElementById('metaDepartment');
        if (metaDepartmentEl) metaDepartmentEl.textContent = emp.department || 'Project Management';

        const metaReportingEl = document.getElementById('metaReporting');
        if (metaReportingEl) metaReportingEl.textContent = emp.manager_id || '--';

        const desig = (emp.designations && emp.designations.name) || emp.designation || emp.role || 'Project Manager';
        const metaRoleEl = document.getElementById('metaRole');
        if (metaRoleEl) metaRoleEl.textContent = desig;

        // Populate Personal Details View
        const detFullNameEl = document.getElementById('detFullName');
        if (detFullNameEl) detFullNameEl.textContent = emp.name || '--';

        const detEmailEl = document.getElementById('detEmail');
        if (detEmailEl) detEmailEl.textContent = emp.email || '--';

        const detPhoneEl = document.getElementById('detPhone');
        if (detPhoneEl) detPhoneEl.textContent = emp.phone || '--';

        // Header and Sidebar Name Updates
        const firstName = typeof window.getFirstName === 'function' ? window.getFirstName(emp.name || 'Manager') : (emp.name || 'Manager').split(' ')[0];
        const headerNameEl = document.getElementById('headerName');
        if (headerNameEl) headerNameEl.textContent = firstName;

        const sidebarUserElem = document.getElementById('userName');
        if (sidebarUserElem) sidebarUserElem.textContent = firstName;

    } catch (err) {
        console.error('Error loading profile:', err);
        const passwordMessage = document.getElementById('passwordMessage');
        if (passwordMessage) {
            passwordMessage.textContent = 'Unable to load profile details: ' + err.message;
            passwordMessage.className = 'password-message error';
        }
    }

    // Step 2: Password Verification, Policy Validation, and Update
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
                const policyRes = await fetch(`${BASE_URL}/api/settings`, { headers });
                const settings = await policyRes.json();
                if (policyRes.ok && settings.password_policy) {
                    passwordPolicy = { ...passwordPolicy, ...settings.password_policy };
                }
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
                rule.textContent = labels[rule.dataset.rule] || rule.textContent;
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
                if (element) {
                    element.classList.toggle('fulfilled', fulfilled);
                    element.classList.toggle('unfulfilled', !fulfilled);
                }
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
                const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-password`, {
                    method: 'POST',
                    headers,
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
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

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
                const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update password');

                passwordMessage.textContent = 'Password updated successfully. You will be redirected to login.';
                passwordMessage.className = 'password-message success';
                passwordForm.reset();
                setTimeout(async () => {
                    await fetch(`${BASE_URL}/api/auth/logout`, {
                        method: 'POST',
                        headers
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

    // Step 3: Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers
                });
            } catch (e) {}
            localStorage.clear();
            window.location.replace('../../admin/login/index.html');
        });
    }
});