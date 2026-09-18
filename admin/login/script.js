// JavaScript for Admin/User Login - Updated
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

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        loginBtn.textContent = 'LOGGING IN...';
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

            // Safely extract user name from whichever format the backend returns
            const userName = data.user?.name ||
                data.session?.user?.user_metadata?.name ||
                data.name ||
                'Employee';

            // Save the token and profile details safely for future requests
            localStorage.setItem('user_name', data.name);
            localStorage.setItem('user_emp_id', data.empId);
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
            loginBtn.textContent = 'LOGIN';
            loginBtn.disabled = false;
        }
    });
});