// JavaScript for Admin - Login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

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

            // Save the token and role for future requests
            localStorage.setItem('access_token', data.session.access_token);
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('user_id', data.session.user.id);

            // Redirect based on role[cite: 2]
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