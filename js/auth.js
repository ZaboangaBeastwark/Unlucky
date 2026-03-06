// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab-btn');

    // Auth Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');

            try {
                errorDiv.textContent = 'Carregando...';
                const res = await apiCall('auth.php?action=login', 'POST', { username: user, password: pass });
                window.appState.user = res.user;
                initializeUserView();
            } catch (err) {
                errorDiv.textContent = err.message;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('reg-username').value;
            const pass = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            const errorDiv = document.getElementById('reg-error');

            try {
                errorDiv.textContent = 'Carregando...';
                const res = await apiCall('auth.php?action=register', 'POST', { username: user, password: pass, role });
                window.appState.user = res.user;
                initializeUserView();
            } catch (err) {
                errorDiv.textContent = err.message;
            }
        });
    }

    // Logout logic made global for reliability with dynamic elements
    window.handleLogout = async () => {
        try {
            await apiCall('auth.php?action=logout', 'POST');
            window.appState.user = null;
            if (typeof stopLogPolling === 'function') stopLogPolling();
            if (typeof gmPollInterval !== 'undefined') clearInterval(gmPollInterval);
            showView('view-auth');
        } catch (err) {
            console.error('Logout failed', err);
            // Force return to auth anyway if session is dead
            showView('view-auth');
        }
    };
});
