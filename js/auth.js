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
                localStorage.setItem('unlucky_user_cache', JSON.stringify(res.user));
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
                localStorage.setItem('unlucky_user_cache', JSON.stringify(res.user));
                initializeUserView();
            } catch (err) {
                errorDiv.textContent = err.message;
            }
        });
    }

    // Logout logic made global for reliability with dynamic elements
    window.handleLogout = async () => {
        try {
            // Stop ALL active polling immediately
            if (typeof stopLogPolling === 'function') stopLogPolling();
            if (typeof gmPollInterval !== 'undefined' && gmPollInterval) clearInterval(gmPollInterval);
            if (typeof gmSyncInterval !== 'undefined' && gmSyncInterval) clearInterval(gmSyncInterval);
            
            // Wait for the logout API call to finish before shifting view
            await apiCall('auth.php?action=logout', 'POST');
            
            localStorage.removeItem('unlucky_user_cache');
            window.appState.user = null;
            showView('view-auth');
        } catch (err) {
            console.error('Logout failed', err);
            // Force return to auth anyway if session is dead
            showView('view-auth');
        }
    };
});
