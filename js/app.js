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
    // 1. Try Cache First
    const cachedUser = localStorage.getItem('unlucky_user_cache');
    if (cachedUser) {
        try {
            window.appState.user = JSON.parse(cachedUser);
            console.log("Loading from cache...", window.appState.user.username);
            initializeUserView();
        } catch(e) { localStorage.removeItem('unlucky_user_cache'); }
    }

    try {
        const res = await apiCall('auth.php?action=me');
        const newUser = res.user;
        
        // Update cache if changed
        if (JSON.stringify(window.appState.user) !== JSON.stringify(newUser)) {
            window.appState.user = newUser;
            localStorage.setItem('unlucky_user_cache', JSON.stringify(newUser));
            initializeUserView();
        }
    } catch (e) {
        if (e.status === 401) {
            localStorage.removeItem('unlucky_user_cache');
            window.appState.user = null;
            showView('view-auth');
        }
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
let currentLogSessionId = null;
let logPollInProgress = false;

// Helper to uniformly process logs from combined API responses
window.processNewLogs = function (logs) {
    if (!logs || logs.length === 0) return;
    const container = document.getElementById('log-entries');
    if (!container) return;

    logs.forEach(log => {
        if (log.id <= lastLogId) return; // Dedupe
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
};

function startLogPolling(sessionId) {
    if (currentLogSessionId === sessionId && logInterval) {
        return; // Already polling this session
    }

    if (logInterval) clearInterval(logInterval);
    currentLogSessionId = sessionId;

    const panel = document.getElementById('action-log-panel');
    const logEntries = document.getElementById('log-entries');
    if (panel) panel.style.display = 'flex';
    if (logEntries) logEntries.innerHTML = '';
    lastLogId = 0;
    logPollInProgress = false;

    // We no longer start a separate interval here if "Master Polling" is active.
    // However, for backward compatibility or cases where ONLY chat is shown, we can keep it
    // but the Master Pollers will call processNewLogs directly.
    console.log("Chat polling ready for session", sessionId);
}

function stopLogPolling() {
    if (logInterval) clearInterval(logInterval);
    logInterval = null;
    currentLogSessionId = null;
    const panel = document.getElementById('action-log-panel');
    if (panel) panel.style.display = 'none';
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
