// js/gm.js

let gmState = {
    session: null,
    characters: [],
    adversaries: []
};

async function initGmView() {
    const container = document.getElementById('gm-dynamic-area');
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;">Carregando sessão...</div>`;

    try {
        const res = await apiCall('gm.php?action=session_data');
        if (res.session) {
            gmState.session = res.session;
            gmState.characters = res.characters;
            gmState.adversaries = res.adversaries;
            renderGmDashboard(container);
        } else {
            renderCreateSession(container);
        }
    } catch (e) {
        container.innerHTML = `<div class="error-msg">Erro do Mestre: ${e.message}</div>`;
    }
}

function renderCreateSession(container) {
    container.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 500px; margin: 0 auto; text-align:center;">
            <h3 style="color:var(--accent-purple); margin-bottom:1rem;">Nenhuma Sessão Ativa</h3>
            <p style="color:var(--text-muted); margin-bottom:2rem;">Crie uma nova sessão para começar a mestrar.</p>
            <div class="input-group">
                <input type="text" id="gm-session-name" placeholder="Nome da Campanha (Ex: A Queda de Sabre)">
            </div>
            <button class="btn btn-primary w-100" onclick="createGmSession()">Iniciar Sessão</button>
        </div>
    `;
}

async function createGmSession() {
    const name = document.getElementById('gm-session-name').value;
    try {
        await apiCall('gm.php?action=create_session', 'POST', { name });
        initGmView();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

function renderGmDashboard(container) {
    const s = gmState.session;

    const activeChars = gmState.characters.filter(c => c.session_status === 'approved');
    const pendingChars = gmState.characters.filter(c => c.session_status === 'pending');

    let charsHtml = activeChars.length === 0 ?
        '<p style="color:var(--text-muted);">Nenhum jogador na sessão ainda.</p>' : '';

    activeChars.forEach(c => {
        charsHtml += `
            <div style="background:rgba(0,0,0,0.3); padding:1rem; border-radius:8px; border:1px solid var(--glass-border); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="flex-grow:1; min-width:200px;">
                    <h4 style="color:var(--accent-gold); margin-bottom:0.2rem;">${c.name}</h4>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${c.class} Nv${c.level}</span>
                    ${c.secret_note ? `<div style="margin-top:0.5rem;"><button class="btn btn-sm" onclick="alert('Segredo de ${c.name}:\\n\\n' + \`${c.secret_note.replace(/`/g, '\\`')}\`)" style="background:transparent; border:1px dashed #9b59b6; color:#9b59b6; font-size:0.75rem; padding:0.2rem 0.5rem;"><i class="fas fa-user-secret"></i> Ver Segredo</button></div>` : ''}
                </div>
                <div style="display:flex; gap:1.5rem; text-align:center;">
                    <div><span style="font-size:0.8rem; display:block;">PV</span><b>${c.hp_current}</b></div>
                    <div><span style="font-size:0.8rem; display:block;">Stress</span><b>${c.stress_current}</b></div>
                    <div>
                        <span style="font-size:0.8rem; display:block;">Evasão</span>
                        <b style="color:var(--accent-purple); cursor:pointer;" onclick="overridePlayerStat(${c.id}, 'evasion_current_override', prompt('Novo valor de Evasão?'))">
                            ${c.evasion_current_override ?? c.evasion_base} ✎
                        </b>
                    </div>
                </div>
            </div>
        `;
    });

    let pendingHtml = '';
    if (pendingChars.length > 0) {
        pendingHtml += `<h3 style="color:#e78c3c; margin-top: 2rem;">Solicitações de Entrada</h3>`;
        pendingChars.forEach(c => {
            pendingHtml += `
            <div style="background:rgba(231, 140, 60, 0.1); padding:1rem; border-radius:8px; border:1px solid rgba(231, 140, 60, 0.3); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="color:#e78c3c; margin-bottom:0.2rem;">${c.name}</h4>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${c.class} Nv${c.level}</span>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.4rem 0.8rem;" onclick="rejectCharacter(${c.id}, ${s.id})">Recusar</button>
                    <button class="btn btn-primary" style="padding:0.4rem 0.8rem; background:linear-gradient(135deg, #e78c3c, #d67b2a);" onclick="approveCharacter(${c.id}, ${s.id})">Aprovar ✓</button>
                </div>
            </div>
            `;
        });
    }

    let advHtml = '';
    gmState.adversaries.forEach(a => {
        advHtml += `
            <div style="background:rgba(231, 76, 60, 0.1); padding:1rem; border-radius:8px; border:1px solid rgba(231, 76, 60, 0.3); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="color:#e74c3c; margin-bottom:0.2rem;">${a.name}</h4>
                    <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">${a.type} | Tier ${a.tier}</span>
                </div>
                <div style="display:flex; gap:1rem; align-items:center;">
                    <div class="res-tracker">
                        <span style="font-size:0.8rem;">PV</span>
                        <button onclick="updateAdversary(${a.id}, 'hp', ${a.hp - 1})">-</button>
                        <span>${a.hp}</span>
                        <button onclick="updateAdversary(${a.id}, 'hp', ${a.hp + 1})">+</button>
                    </div>
                    <button class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.4rem 0.8rem;" onclick="deleteAdversary(${a.id})">X</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="sheet-header glass-panel" style="border-left: 4px solid var(--accent-purple);">
            <div class="sheet-title">
                <h2>${s.name} <span style="font-size:1rem; color:var(--text-muted);">(ID: ${s.id})</span></h2>
            </div>
            <div style="display:flex; align-items:center; gap:1rem; background:rgba(0,0,0,0.5); padding:0.5rem 1.5rem; border-radius:20px; border:1px solid var(--accent-purple);">
                <span style="font-size:0.9rem; text-transform:uppercase; letter-spacing:1px;">Economia de Medo</span>
                <button class="btn btn-outline" style="padding:0.2rem 0.8rem;" onclick="updateFear(${s.id}, -1)">-</button>
                <span style="font-size:1.5rem; font-weight:bold; color:var(--accent-purple); min-width:30px; text-align:center;">${s.fear_tokens}</span>
                <button class="btn btn-outline" style="padding:0.2rem 0.8rem;" onclick="updateFear(${s.id}, 1)">+</button>
            </div>
        </div>

        <div class="sheet-grid">
            <div class="sheet-col">
                <div class="glass-panel sheet-section">
                    <h3 style="color:var(--accent-gold);">Fichas dos Jogadores</h3>
                    ${charsHtml}
                    ${pendingHtml}
                </div>
            </div>
            
            <div class="sheet-col">
                <div class="glass-panel sheet-section" style="border-top:2px solid #e74c3c;">
                    <h3 style="color:#e74c3c; display:flex; justify-content:space-between; align-items:center;">
                        Rastreador de Adversários
                        <button class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem; background:linear-gradient(135deg, #e74c3c, #c0392b);" onclick="showAddAdversaryForm()">+ Adicionar</button>
                    </h3>
                    <div id="add-adv-form" style="display:none; background:rgba(0,0,0,0.3); padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid var(--glass-border);">
                        <input type="text" id="adv-name" placeholder="Nome" class="w-100" style="margin-bottom:0.5rem; padding:0.5rem; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px;">
                        <select id="adv-type" class="w-100" style="margin-bottom:0.5rem; padding:0.5rem; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px;">
                            <option value="minion">Lacaio (Minion)</option>
                            <option value="average">Comum (Average)</option>
                            <option value="elite">Elite</option>
                            <option value="solo">Solo</option>
                            <option value="horde">Horda</option>
                        </select>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="number" id="adv-hp" placeholder="PV" style="width:50%; padding:0.5rem; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px;">
                            <button class="btn btn-primary w-100" onclick="submitAdversary(${s.id})">Salvar</button>
                        </div>
                    </div>
                    ${advHtml}
                </div>
            </div>
        </div>
    `;

    startLogPolling(s.id);
}

// GM Actions
async function updateFear(sessionId, amount) {
    try {
        await apiCall('gm.php?action=update_fear', 'POST', { session_id: sessionId, amount });
        initGmView();
    } catch (e) { console.error(e); }
}

async function overridePlayerStat(charId, field, value) {
    if (value === null || value === '') return;
    try {
        await apiCall('gm.php?action=override_player_stat', 'POST', {
            character_id: charId, field, value: parseInt(value), session_id: gmState.session.id
        });
        initGmView();
    } catch (e) { alert(e.message); }
}

function showAddAdversaryForm() {
    document.getElementById('add-adv-form').style.display = 'block';
}

async function submitAdversary(sessionId) {
    const name = document.getElementById('adv-name').value;
    const type = document.getElementById('adv-type').value;
    const hp = document.getElementById('adv-hp').value;

    if (!name) return alert('Nome é obrigatório');

    try {
        await apiCall('gm.php?action=add_adversary', 'POST', {
            session_id: sessionId, name, type, hp
        });
        initGmView();
    } catch (e) { alert(e.message); }
}

async function updateAdversary(id, field, value) {
    if (value < 0) value = 0;
    try {
        await apiCall('gm.php?action=update_adversary', 'POST', { id, field, value });
        initGmView();
    } catch (e) { console.error(e); }
}

async function deleteAdversary(id) {
    if (!confirm('Remover adversário?')) return;
    try {
        await apiCall('gm.php?action=delete_adversary', 'POST', { id });
        initGmView();
    } catch (e) { console.error(e); }
}

async function approveCharacter(charId, sessionId) {
    try {
        await apiCall('gm.php?action=approve_character', 'POST', { character_id: charId, session_id: sessionId });
        initGmView();
    } catch (e) { alert(e.message); }
}

async function rejectCharacter(charId, sessionId) {
    if (!confirm('Tem certeza que deseja recusar a entrada deste jogador na campanha?')) return;
    try {
        await apiCall('gm.php?action=reject_character', 'POST', { character_id: charId, session_id: sessionId });
        initGmView();
    } catch (e) { alert(e.message); }
}
