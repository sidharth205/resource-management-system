let lastToggleTime = 0;

// Global toggle password visibility handler
function togglePasswordVisibility(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        e.stopPropagation();
    }

    const now = Date.now();
    if (now - lastToggleTime < 300) {
        return; // Guard against duplicate calls on same click event
    }
    lastToggleTime = now;

    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (!passwordInput) return;

    const isCurrentlyPassword = passwordInput.type === 'password';
    passwordInput.type = isCurrentlyPassword ? 'text' : 'password';

    if (toggleBtn) {
        toggleBtn.setAttribute('title', isCurrentlyPassword ? 'Hide password' : 'Show password');
        toggleBtn.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');
        toggleBtn.innerHTML = isCurrentlyPassword
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    try {
        passwordInput.focus();
    } catch (err) {}
}
window.togglePasswordVisibility = togglePasswordVisibility;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    if (new URLSearchParams(window.location.search).get('passwordChanged') === 'true') {
        successMessage.textContent = 'Password changed successfully. Please log in again with your new password.';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        loginBtn.innerHTML = `<span>Signing in...</span>`;
        loginBtn.disabled = true;
        errorMessage.textContent = '';

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save the token and profile details safely for future requests
            localStorage.setItem('user_name', data.name || 'User');
            localStorage.setItem('user_emp_id', data.empId || '');
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('access_token', data.session.access_token);

            // Redirect based on role
            if (data.role === 'admin') {
                window.location.href = '../dashboard/index.html';
            } else if (data.role === 'manager') {
                window.location.href = '../../manager/dashboard/index.html';
            } else if (data.role === 'employee') {
                window.location.href = '../../employee/dashboard/index.html';
            } else {
                throw new Error('Unknown user role');
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            loginBtn.innerHTML = `Sign In to Dashboard →`;
            loginBtn.disabled = false;
        }
    });
});

// Quick fill credentials for seamless demo testing
function fillCreds(email, password) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
        emailInput.focus();
    }
}
window.fillCreds = fillCreds;