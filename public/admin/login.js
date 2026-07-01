// public/admin/login.js
const API_BASE = 'https://luban-backend.vercel.app/api';
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('password');
const errorDiv = document.getElementById('error');

// Check if already logged in
if (localStorage.getItem('token')) {
    window.location.href = '/admin/dashboard.html';
}

async function login() {
    const password = passwordInput.value.trim();

    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    if (!password) {
        errorDiv.textContent = 'Please enter the password.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = '/admin/dashboard.html';
        } else {
            errorDiv.textContent = data.error || 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Network error. Please check your connection.';
        errorDiv.style.display = 'block';
        console.error('Login error:', err);
    }
}

loginBtn.addEventListener('click', login);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

passwordInput.focus();