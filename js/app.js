// js/app.js

window.appState = {
    user: null,
    session: null
};

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

async function initAuthCheck() {
    try {
        const res = await apiCall('auth.php?action=me');
        window.appState.user = res.user;
        initializeUserView();
    } catch (e) {
        showView('view-auth');
    }
}

function initializeUserView() {
    const user = window.appState.user;
    if (!user) {
        showView('view-auth');
        return;
    }

    if (user.role === 'gm') {
        document.getElementById('gm-username').textContent = `Mestre ${user.username}`;
        showView('view-gm');
        if (typeof initGmView === 'function') initGmView();
    } else {
        document.getElementById('player-username').textContent = user.username;
        showView('view-player');
        if (typeof initPlayerView === 'function') initPlayerView();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthCheck();
});

// --- Action Log Polling ---
let logInterval;
let lastLogId = 0;

function startLogPolling(sessionId) {
    if (logInterval) clearInterval(logInterval);
    document.getElementById('action-log-panel').style.display = 'flex';
    document.getElementById('log-entries').innerHTML = '';
    lastLogId = 0;

    const poll = async () => {
        try {
            const res = await apiCall(`logs.php?session_id=${sessionId}&last_id=${lastLogId}`);
            if (res.logs && res.logs.length > 0) {
                const container = document.getElementById('log-entries');
                res.logs.forEach(log => {
                    lastLogId = Math.max(lastLogId, log.id);
                    const div = document.createElement('div');
                    div.className = 'log-entry';
                    if (log.critical == 1) div.classList.add('critical');
                    else if (log.hope_die < log.fear_die) div.classList.add('fear');
                    if (log.action_type === 'status_change') div.classList.add('alert');

                    div.innerHTML = `<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.2rem;">${new Date(log.created_at).toLocaleTimeString().slice(0, 5)}</div>
                                     ${log.message}`;
                    container.appendChild(div);
                });
                container.scrollTop = container.scrollHeight;
            }
        } catch (e) { console.error('Log poll error', e); }
    };

    poll();
    logInterval = setInterval(poll, 3000); // 3 seconds
}

function stopLogPolling() {
    if (logInterval) clearInterval(logInterval);
    document.getElementById('action-log-panel').style.display = 'none';
}
