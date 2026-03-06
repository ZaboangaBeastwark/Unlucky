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
    const panel = document.getElementById('action-log-panel');
    const logEntries = document.getElementById('log-entries');
    if (panel) panel.style.display = 'flex';
    if (logEntries) logEntries.innerHTML = '';
    lastLogId = 0;

    const poll = async () => {
        try {
            const res = await apiCall(`logs.php?session_id=${sessionId}&last_id=${lastLogId}`);
            if (res.logs && res.logs.length > 0) {
                const container = document.getElementById('log-entries');
                if (!container) return; // Prevent error if panel is not in DOM or view changed
                res.logs.forEach(log => {
                    lastLogId = Math.max(lastLogId, log.id);
                    const div = document.createElement('div');
                    div.className = 'log-entry';
                    div.id = `log-entry-${log.id}`;
                    div.style.position = 'relative';
                    if (log.critical == 1) div.classList.add('critical');
                    else if (log.hope_die < log.fear_die) div.classList.add('fear');
                    if (log.action_type === 'status_change') div.classList.add('alert');

                    let deleteBtn = '';
                    if (window.appState && window.appState.user && window.appState.user.role === 'gm') {
                        deleteBtn = `<button onclick="deleteActionLog(${log.id})" style="position:absolute; top:0.2rem; right:0.2rem; background:none; border:none; color:#e74c3c; cursor:pointer;" title="Excluir Registro"><i class="fas fa-trash"></i></button>`;
                    }

                    div.innerHTML = `
                        ${deleteBtn}
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.2rem;">${new Date(log.created_at).toLocaleTimeString().slice(0, 5)}</div>
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

async function deleteActionLog(logId) {
    if (!confirm('Deseja realmente excluir este registro do chat?')) return;
    try {
        await apiCall('logs.php', 'POST', { action: 'delete', id: logId });
        const el = document.getElementById(`log-entry-${logId}`);
        if (el) el.remove();
    } catch (e) {
        alert('Erro ao excluir log: ' + e.message);
    }
}
