// js/gm.js

let gmState = {
    session: null,
    characters: [],
    adversaries: [],
    equipment: [],
    activeTab: 'session' // 'session' or 'catalog'
};

window.handleLinkClick = function (event, callback) {
    if (event.ctrlKey || event.metaKey || event.button === 1 || (event.button === 0 && event.shiftKey)) {
        return true; // Deixa o navegador abrir em nova aba
    }
    event.preventDefault();
    callback();
    // Clean up URL so it doesn't stick
    window.history.pushState({}, '', window.location.pathname);
    return false;
};

async function initGmView() {
    const container = document.getElementById('gm-dynamic-area');
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;">Carregando painel...</div>`;

    try {
        const res = await apiCall(`gm.php?action=session_data_live&_t=${Date.now()}`);
        const eqRes = await apiCall('equipment.php?action=list');

        gmState.equipment = eqRes.equipment || [];

        if (res.session) {
            gmState.session = res.session;
            gmState.characters = res.characters;
            gmState.adversaries = res.adversaries;
            gmState.bestiary = res.bestiary || [];
            gmState.encounter_groups = res.encounter_groups || [];
            renderGmDashboard(container);
            startGmPolling(); // Initialize auto-sync

            // Multi-Tab Support: Read URL deep links
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            const id = params.get('id');
            if (view && id) {
                if (view === 'npc') {
                    // Slight delay to ensure DOM is ready for modals
                    setTimeout(() => openBestiaryModalFromTemplate(id), 100);
                } else if (view === 'pc') {
                    setTimeout(() => openGmCharacterSheet(id), 100);
                }
            }
        } else {
            console.warn("Mestre sem sessão. Retorno da API:", res);
            renderCreateSession(container);
            if (res.debug_user) {
                container.innerHTML += `<p style="color:red">Debug UserID do PHP: ${res.debug_user}</p>`;
            }
        }
    } catch (e) {
        container.innerHTML = `<div class="error-msg">Erro do Mestre: ${e.message}</div>`;
    }
}

let gmPollInterval;
function startGmPolling() {
    if (gmPollInterval) clearInterval(gmPollInterval);

    gmPollInterval = setInterval(async () => {
        try {
            // Fetch raw JSON to avoid state mutation before comparison
            const rawRes = await fetch(`${API_BASE}gm.php?action=session_data_live&_t=${Date.now()}`, { cache: 'no-store' });
            const data = await rawRes.json();

            if (data.session) {
                const s1 = JSON.stringify(gmState.characters);
                const s2 = JSON.stringify(data.characters);

                const a1 = JSON.stringify(gmState.adversaries);
                const a2 = JSON.stringify(data.adversaries);

                let needsRender = false;

                if (s1 !== s2) {
                    gmState.characters = data.characters;
                    needsRender = true;
                }

                if (a1 !== a2) {
                    gmState.adversaries = data.adversaries;
                    needsRender = true;
                }

                const b1 = JSON.stringify(gmState.bestiary);
                const b2 = JSON.stringify(data.bestiary || []);
                if (b1 !== b2) {
                    gmState.bestiary = data.bestiary || [];
                    needsRender = true;
                }

                const e1 = JSON.stringify(gmState.encounter_groups);
                const e2 = JSON.stringify(data.encounter_groups || []);
                if (e1 !== e2) {
                    gmState.encounter_groups = data.encounter_groups || [];
                    needsRender = true;
                }

                if (needsRender) {
                    const scrollY = window.scrollY;
                    const scrollX = window.scrollX;

                    // If viewing a specific character sheet, re-render it
                    if (window.viewingCharId) {
                        const updatedChar = gmState.characters.find(c => c.id === window.viewingCharId);
                        if (updatedChar) {
                            openGmCharacterSheet(updatedChar.id);
                        } else {
                            // Character was deleted or removed
                            window.viewingCharId = null;
                            initGmView();
                        }
                    } else if (gmState.activeTab === 'session') {
                        // Re-render dashboard
                        const container = document.getElementById('gm-tab-content');
                        if (container) renderGmSessionTab(container);
                    }

                    window.scrollTo(scrollX, scrollY);
                }
            }
        } catch (e) {
            console.error("Erro no polling do GM:", e);
        }
    }, 2000);
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

window.switchGmTab = function (tabName) {
    gmState.activeTab = tabName;
    initGmView(); // Re-fetch to guarantee fresh data
}

function renderGmDashboard(container) {
    let tabsHtml = `
        <div style="margin-bottom: 1.5rem; display:flex; gap:1rem; border-bottom: 1px solid rgba(255,255,255,0.1); overflow-x:auto;">
            <button onclick="switchGmTab('session')" style="background:none; border:none; color:${gmState.activeTab === 'session' ? 'var(--accent-gold)' : 'white'}; padding:0.5rem 1rem; cursor:pointer; border-bottom: ${gmState.activeTab === 'session' ? '2px solid var(--accent-gold)' : 'none'}; font-weight: ${gmState.activeTab === 'session' ? 'bold' : 'normal'}; font-size:1.1rem; white-space:nowrap;">Sessão Ativa</button>
            <button onclick="switchGmTab('bestiary')" style="background:none; border:none; color:${gmState.activeTab === 'bestiary' ? 'var(--accent-gold)' : 'white'}; padding:0.5rem 1rem; cursor:pointer; border-bottom: ${gmState.activeTab === 'bestiary' ? '2px solid var(--accent-gold)' : 'none'}; font-weight: ${gmState.activeTab === 'bestiary' ? 'bold' : 'normal'}; font-size:1.1rem; white-space:nowrap;">Bestiário / NPCs</button>
            <button onclick="switchGmTab('catalog')" style="background:none; border:none; color:${gmState.activeTab === 'catalog' ? 'var(--accent-gold)' : 'white'}; padding:0.5rem 1rem; cursor:pointer; border-bottom: ${gmState.activeTab === 'catalog' ? '2px solid var(--accent-gold)' : 'none'}; font-weight: ${gmState.activeTab === 'catalog' ? 'bold' : 'normal'}; font-size:1.1rem; white-space:nowrap;">Catálogo de Itens</button>
        </div>
        <div id="gm-tab-content"></div>
    `;
    container.innerHTML = tabsHtml;

    const contentArea = document.getElementById('gm-tab-content');
    if (gmState.activeTab === 'session') {
        renderGmSessionTab(contentArea);
    } else if (gmState.activeTab === 'bestiary') {
        renderGmBestiaryTab(contentArea);
    } else {
        renderGmCatalogTab(contentArea);
    }
}

function renderGmSessionTab(container) {
    const s = gmState.session;

    const activeChars = gmState.characters.filter(c => ['approved', 'suspended', 'deceased'].includes(c.session_status));
    const pendingChars = gmState.characters.filter(c => c.session_status === 'pending');

    let charsHtml = activeChars.length === 0 ?
        '<p style="color:var(--text-muted);">Nenhum jogador na sessão ainda.</p>' : '';

    activeChars.forEach(c => {
        let statusIcon = '';
        let cardStyle = 'background:rgba(0,0,0,0.3); padding:1.2rem; border-radius:8px; border:1px solid var(--accent-gold); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; transition: transform 0.2s;';

        if (c.session_status === 'deceased') {
            statusIcon = '<i class="fas fa-skull" style="color:#e74c3c; margin-right:5px;" title="Falecido"></i>';
            cardStyle = 'background:rgba(231, 76, 60, 0.1); padding:1.2rem; border-radius:8px; border:1px solid rgba(231, 76, 60, 0.5); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; opacity:0.7; filter: grayscale(50%);';
        } else if (c.session_status === 'suspended') {
            statusIcon = '<i class="fas fa-user-clock" style="color:#f39c12; margin-right:5px;" title="Suspenso"></i>';
            cardStyle = 'background:rgba(243, 156, 18, 0.1); padding:1.2rem; border-radius:8px; border:1px solid rgba(243, 156, 18, 0.5); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; opacity:0.8;';
        }

        charsHtml += `
            <div style="${cardStyle}" onmouseover="this.style.boxShadow='0 0 10px rgba(241,196,15,0.2)';" onmouseout="this.style.boxShadow='none';">
                <div style="flex-grow:1; min-width:200px;">
                    <a href="?view=pc&id=${c.id}" onclick="return window.handleLinkClick(event, () => openGmCharacterSheet(${c.id}))" style="color:var(--accent-gold); margin-bottom:0.3rem; font-size:1.3rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; text-decoration:none;" title="Clique para Abrir a Ficha do Jogador">
                        ${statusIcon} <i class="fas fa-file-alt" style="font-size:1rem; opacity:0.7;"></i> ${c.name} 
                    </a>
                    <div style="font-size:0.9rem; margin-bottom:0.3rem; color:var(--text-light);">
                        Jogador: <strong style="color:#3498db;">${c.player_name || 'Desconhecido'}</strong>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <span>Nível ${c.level} ${c.class} (${c.subclass || 'Sem Subclasse'})</span>
                        <span style="padding:0.2rem 0.6rem; border-radius:4px; background:rgba(231,140,60,0.1); color:#e78c3c; border:1px solid rgba(231,140,60,0.3);">XP Atual: <b>${c.xp || 0}</b></span>
                        ${(parseInt(c.xp || 0) >= 6 && c.can_level_up == 0) ? `<button class="btn btn-sm" onclick="allowLevelUp(${c.id})" style="background:linear-gradient(135deg, #2ecc71, #27ae60); border:none; color:white; padding:0.2rem 0.6rem;">Permitir Subir de Nível <i class="fas fa-arrow-up"></i></button>` : ''}
                        
                        <div style="display:inline-flex; align-items:center; margin-left: auto;">
                            <label style="margin-right:0.5rem; font-size:0.8rem; color:var(--text-light);">Status:</label>
                            <select onchange="changeCharacterStatus(${c.id}, this.value, ${s.id})" style="background:rgba(0,0,0,0.5); color:white; border:1px solid var(--glass-border); border-radius:4px; padding:0.2rem 0.5rem; font-size:0.8rem;">
                                <option value="approved" ${c.session_status === 'approved' ? 'selected' : ''}>Ativo</option>
                                <option value="suspended" ${c.session_status === 'suspended' ? 'selected' : ''}>Suspenso</option>
                                <option value="deceased" ${c.session_status === 'deceased' ? 'selected' : ''}>Falecido</option>
                            </select>
                        </div>
                    </div>
                    ${c.secret_note ? `<div style="margin-top:0.8rem;"><button class="btn btn-sm" onclick="alert('Segredo de ${c.name}:\\n\\n' + \`${c.secret_note.replace(/`/g, '\\`')}\`)" style="background:transparent; border:1px dashed #9b59b6; color:#9b59b6; font-size:0.75rem; padding:0.2rem 0.5rem;"><i class="fas fa-user-secret"></i> Ver Nota Secreta</button></div>` : ''}
                </div>
                <div style="display:flex; gap:1.5rem; text-align:center; align-items:center;">
                    <div><span style="font-size:0.8rem; display:block; color:var(--text-muted);">PV</span><b style="font-size:1.2rem;">${c.hp_current}</b></div>
                    <div><span style="font-size:0.8rem; display:block; color:var(--text-muted);">Stress</span><b style="font-size:1.2rem;">${c.stress_current}</b></div>
                    <div>
                        <span style="font-size:0.8rem; display:block; color:var(--text-muted);">Evasão</span>
                        <b style="color:var(--accent-purple); cursor:pointer; font-size:1.2rem;" onclick="overridePlayerStat(${c.id}, 'evasion_current_override', prompt('Novo valor de Evasão?'))" title="Editar Evasão Manualmente">
                            ${c.evasion_current_override ?? c.evasion_base} <i class="fas fa-pencil-alt" style="font-size:0.8rem;"></i>
                        </b>
                    </div>
                    <a href="?view=pc&id=${c.id}" onclick="return window.handleLinkClick(event, () => openGmCharacterSheet(${c.id}))" style="padding:0.6rem 1.2rem; font-size:0.95rem; display:inline-flex; gap:0.5rem; align-items:center; background:#f1c40f; color:#0f0f13; border:none; font-weight:bold; text-decoration:none; border-radius:4px;">Selecionar <i class="fas fa-play"></i></a>
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

    let encountersHtml = '';
    const encounters = gmState.encounter_groups || [];

    const advByEncounter = { 'none': [] };
    encounters.forEach(e => advByEncounter[e.id] = []);

    gmState.adversaries.forEach(a => {
        if (a.encounter_id && advByEncounter[a.encounter_id]) {
            advByEncounter[a.encounter_id].push(a);
        } else {
            advByEncounter['none'].push(a);
        }
    });

    function renderAdvCard(a) {
        const imageHtml = a.token || a.avatar
            ? `<img src="${a.token || a.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #e74c3c; margin-right:10px;">`
            : `<div style="width:40px; height:40px; border-radius:50%; background:rgba(231,76,60,0.2); border:2px solid rgba(231,76,60,0.5); display:flex; align-items:center; justify-content:center; margin-right:10px;"><i class="fas fa-ghost" style="color:#e74c3c;"></i></div>`;

        return `
            <div style="background:rgba(231, 76, 60, 0.1); padding:0.8rem; border-radius:8px; border:1px solid rgba(231, 76, 60, 0.3); margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center;">
                    ${imageHtml}
                    <div>
                        <h4 style="color:#e74c3c; margin-bottom:0.2rem; font-size:1rem;">${a.name}</h4>
                        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
                            ${a.type} | Tier ${a.tier}
                            ${a.template_id ? `<a href="?view=npc&id=${a.template_id}" onclick="return window.handleLinkClick(event, () => openBestiaryModalFromTemplate(${a.template_id}))" style="background:none; border:none; color:var(--accent-gold); cursor:pointer; margin-left:5px; text-decoration:none;" title="Ver Ficha Completa"><i class="fas fa-search"></i></a>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div class="res-tracker" style="gap:2px;">
                        <span style="font-size:0.7rem;">PV</span>
                        <button onclick="updateAdversary(${a.id}, 'hp', ${a.hp - 1})" style="padding:2px 6px;">-</button>
                        <span style="font-weight:bold;">${a.hp}</span>
                        <button onclick="updateAdversary(${a.id}, 'hp', ${a.hp + 1})" style="padding:2px 6px;">+</button>
                    </div>
                    <button class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.2rem 0.6rem;" onclick="deleteAdversary(${a.id})" title="Remover da Cena"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    }

    encountersHtml += `
        <div style="display:flex; gap:10px; margin-bottom:1.5rem; justify-content:space-between; align-items:center;">
            <input type="text" id="new-encounter-name" placeholder="Nome do Novo Grupo (ex: Emboscada na Floresta)" style="flex:1; padding:0.6rem; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.5); color:white;">
            <button class="btn btn-primary" onclick="createEncounter(${s.id})" style="background:linear-gradient(135deg, #e74c3c, #c0392b);">Criar Grupo</button>
        </div>
    `;

    encounters.forEach(enc => {
        let groupAdvs = advByEncounter[enc.id] || [];
        let groupAdvsHtml = groupAdvs.length > 0 ? groupAdvs.map(renderAdvCard).join('') : '<p style="font-size:0.85rem; color:var(--text-muted); opacity:0.8;">O grupo está vazio.</p>';

        encountersHtml += `
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.8rem;">
                    <h4 style="color:white; font-size:1.1rem; margin:0;"><i class="fas fa-users" style="color:#e74c3c; margin-right:5px;"></i> ${enc.name}</h4>
                    <div>
                        <button class="btn btn-outline" style="padding:0.3rem 0.6rem; font-size:0.75rem; border-color:var(--accent-gold); color:var(--accent-gold);" onclick="openAddAdvPicker(${enc.id})"><i class="fas fa-plus"></i> Oponente</button>
                        <button class="btn btn-outline" style="padding:0.3rem 0.6rem; font-size:0.75rem; border-color:#e74c3c; color:#e74c3c; margin-left:5px;" onclick="deleteEncounter(${enc.id}, '${enc.name.replace(/'/g, "\\'")}')" title="Excluir Grupo"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div>
                    ${groupAdvsHtml}
                </div>
            </div>
        `;
    });

    let ungrouped = advByEncounter['none'] || [];
    if (ungrouped.length > 0) {
        encountersHtml += `
            <div style="background:rgba(0,0,0,0.2); border:1px dashed rgba(231, 76, 60, 0.3); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <div style="border-bottom:1px solid rgba(231,76,60,0.2); padding-bottom:0.5rem; margin-bottom:0.8rem;">
                    <h4 style="color:var(--text-muted); font-size:1rem; margin:0;">Inimigos Sem Grupo / Soltos</h4>
                    <button class="btn btn-outline" style="padding:0.2rem 0.4rem; font-size:0.7rem; border-color:var(--text-muted); color:var(--text-muted); display:inline-block; margin-top:5px;" onclick="openAddAdvPicker(null)"><i class="fas fa-plus"></i> Oponente Avulso</button>
                </div>
                <div>
                    ${ungrouped.map(renderAdvCard).join('')}
                </div>
            </div>
        `;
    } else {
        encountersHtml += `
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding:0.2rem 0.5rem; font-size:0.75rem; border-color:var(--text-muted); color:var(--text-muted);" onclick="openAddAdvPicker(null)"><i class="fas fa-plus"></i> Oponente Avulso (Sem Grupo)</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="sheet-header glass-panel" style="border-left: 4px solid var(--accent-purple); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div class="sheet-title">
                <h2>${s.name} <span style="font-size:1rem; color:var(--text-muted);">(ID: ${s.id})</span></h2>
            </div>
            <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:1rem; background:rgba(0,0,0,0.5); padding:0.5rem 1.5rem; border-radius:20px; border:1px solid var(--accent-gold);">
                    <span style="font-size:0.9rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent-gold);"><i class="fas fa-store"></i> Mercado</span>
                    <button class="btn ${s.shop_open ? 'btn-primary' : 'btn-outline'}" style="padding:0.2rem 0.8rem; ${s.shop_open ? 'background:#2ecc71; border-color:#2ecc71; color:white;' : 'color:var(--text-muted);'}" onclick="toggleShop(${s.id}, ${s.shop_open ? 0 : 1})">
                        ${s.shop_open ? 'Aberto' : 'Fechado'}
                    </button>
                </div>
                <div style="display:flex; align-items:center; gap:1rem; background:rgba(0,0,0,0.5); padding:0.5rem 1.5rem; border-radius:20px; border:1px solid var(--accent-purple);">
                    <span style="font-size:0.9rem; text-transform:uppercase; letter-spacing:1px;">Economia de Medo</span>
                    <button class="btn btn-outline" style="padding:0.2rem 0.8rem;" onclick="updateFear(${s.id}, -1)">-</button>
                    <span style="font-size:1.5rem; font-weight:bold; color:var(--accent-purple); min-width:30px; text-align:center;">${s.fear_tokens}</span>
                    <button class="btn btn-outline" style="padding:0.2rem 0.8rem;" onclick="updateFear(${s.id}, 1)">+</button>
                </div>
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
                    <h3 style="color:#e74c3c; display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                        <i class="fas fa-khanda"></i> Rastreador de Combate (Sessão)
                    </h3>
                    ${encountersHtml}
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

window.allowLevelUp = async function (charId) {
    if (!confirm("Tem certeza que deseja permitir que este personagem suba de nível?")) return;
    try {
        await apiCall('character.php?action=allow_level_up', 'POST', { character_id: charId });
        initGmView();
    } catch (e) {
        alert("Erro ao autorizar subida de nível: " + e.message);
    }
};

async function overridePlayerStat(charId, field, value) {
    if (value === null || value === '') return;
    try {
        const finalVal = parseInt(value);
        if (isNaN(finalVal)) {
            alert('Valor inválido. Por favor, insira um número.');
            return;
        }
        const payload = {
            session_id: gmState.session.id,
            character_id: charId,
            field: field,
            value: finalVal
        };
        await apiCall('gm.php?action=override_player_stat', 'POST', payload);

        // Optimistic UI Update avoiding full reload
        const char = gmState.characters.find(c => c.id === charId);
        if (char) char[field] = finalVal; // Use finalVal here

        // Let the polling or local update handle the re-render.
    } catch (e) {
        alert("Erro ao alterar stat: " + e.message);
    }
}

window.toggleShop = async function (sessionId, isOpen) {
    try {
        await apiCall('gm.php?action=toggle_shop', 'POST', {
            session_id: sessionId,
            is_open: isOpen
        });
        initGmView();
    } catch (e) {
        alert('Erro ao alterar mercado: ' + e.message);
    }
};

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

window.changeCharacterStatus = async function (charId, newStatus, sessionId) {
    let confirmMsg = '';
    if (newStatus === 'deceased') confirmMsg = 'Tem certeza de que este personagem faleceu? Ele ainda ficará visível no painel para consulta, mas será marcado como morto.';
    else if (newStatus === 'suspended') confirmMsg = 'Tem certeza de que deseja suspender este personagem? Ele será tratado como ausente da campanha atual.';

    if (confirmMsg && !confirm(confirmMsg)) {
        // Revert select visually if cancelled
        initGmView();
        return;
    }

    try {
        await apiCall('gm.php?action=update_character_status', 'POST', {
            character_id: charId,
            status: newStatus,
            session_id: sessionId
        });

        // Optimistic update
        const char = gmState.characters.find(c => c.id === charId);
        if (char) char.session_status = newStatus;

        initGmView();
    } catch (e) {
        alert("Erro ao alterar status: " + e.message);
        initGmView();
    }
};

window.viewingCharId = null;

window.openGmCharacterSheet = async function (charId) {
    window.viewingCharId = charId;
    try {
        const char = await apiCall(`character.php?action=get_player_character&id=${charId}`);
        const container = document.getElementById('gm-dynamic-area');

        container.innerHTML = `
            <div style="position:absolute; top:1rem; left:1rem; cursor:pointer; color:var(--text-muted); font-size:1.5rem;" onclick="window.viewingCharId=null; initGmView()" title="Voltar para o Painel">
            <i class="fas fa-arrow-left"></i>
        </div>
            <div id="gm-char-sheet-container"></div>
        `;

        // This is necessary so player.js functions like updateResource() affect this character
        window.currentPlayingCharacter = char;

        // Render the exact same sheet the player sees
        window.renderCharacterSheet(char, document.getElementById('gm-char-sheet-container'));

    } catch (e) {
        alert("Erro ao abrir a ficha do jogador: " + e.message);
    }
};

// =====================================
// EQUIPMENT CATALOG TAB
// =====================================
function formatEquipmentData(data, category) {
    if (!data || Object.keys(data).length === 0) return '<em>Nenhum atributo numérico especial. Consulte a descrição.</em>';

    const keyMap = {
        'damage': 'Dano',
        'attr': 'Rolado com',
        'slots': 'Espaços (Mãos)',
        'armor_base': 'Pontos de Armadura',
        'armor_slots': 'Slots de Quebra',
        'evasion_mod': 'Evasão (Peso)',
        'range': 'Alcance',
        'uses': 'Usos Rápidos',
        'healing': 'Poder de Cura',
        'bonus': 'Bônus Passivo'
    };

    let htmlParts = [];
    for (let key in data) {
        let label = keyMap[key] || key;
        let value = data[key];

        if (key === 'evasion_mod' && value < 0) {
            value = `<span style="color:#e74c3c">${value}</span>`;
        } else if (key === 'damage') {
            value = `<strong style="color:var(--accent-gold)">${value}</strong>`;
        } else if (key === 'armor_base') {
            value = `<strong style="color:#3498db">${value}</strong>`;
        }

        htmlParts.push(`<div style="background:rgba(0,0,0,0.3); padding:0.3rem 0.6rem; border-radius:4px; border:1px solid var(--glass-border);"><b>${label}:</b> ${value}</div>`);
    }

    return htmlParts.join('');
}

function renderGmCatalogTab(container) {
    let eqHtml = `
    <div class="glass-panel" style="padding: 1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:1rem;">
            <h2 style="color:var(--accent-gold); font-family: 'Crimson Text', serif;">Armazém do Mestre</h2>
            <div style="display:flex; gap:1rem;">
                <input type="text" id="gm-catalog-search" placeholder="Pesquisar item..." onkeyup="filterGmCatalog()" style="background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; padding:0.5rem; border-radius:4px;">
                <select id="gm-catalog-filter" onchange="filterGmCatalog()" style="background:rgba(255,255,255,0.1); border:1px solid var(--glass-border); color:white; padding:0.5rem; border-radius:4px;">
                    <option value="all">Todas Categorias</option>
                    <option value="primary_weapon">Arma Primária</option>
                    <option value="secondary_weapon">Arma Secundária</option>
                    <option value="armor">Armadura</option>
                    <option value="adventure_item">Item de Aventura</option>
                    <option value="consumable">Consumível</option>
                    <option value="professional_kit">Kit Profissional</option>
                </select>
                <div style="display:flex; gap:0.5rem; margin-right:1rem; border-right:1px solid rgba(255,255,255,0.2); padding-right:1rem;">
                    <button class="btn btn-outline" onclick="toggleBulkVisibility(true)" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:#2ecc71; border-color:#2ecc71;" title="Marcar todos listados">
                        <i class="fas fa-check-square"></i> Todos
                    </button>
                    <button class="btn btn-outline" onclick="toggleBulkVisibility(false)" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:#e74c3c; border-color:#e74c3c;" title="Desmarcar todos listados">
                        <i class="far fa-square"></i> Nenh.
                    </button>
                </div>
                <button class="btn btn-primary" onclick="openGmItemModal()" style="box-shadow: 0 0 10px rgba(241,196,15,0.3);">+ Forjar Novo Item</button>
            </div>
        </div>
        
        <table style="width:100%; text-align:left; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom: 1px solid rgba(241,196,15,0.5); color:var(--accent-gold);">
                    <th style="padding:0.5rem;">Nome</th>
                    <th style="padding:0.5rem;">Categoria</th>
                    <th style="padding:0.5rem;">Tier</th>
                    <th style="padding:0.5rem;">Custo</th>
                    <th style="padding:0.5rem;">Visibilidade</th>
                    <th style="padding:0.5rem; text-align:right;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    const catNames = {
        'primary_weapon': 'Arma Primária',
        'secondary_weapon': 'Arma Secundária',
        'armor': 'Armadura',
        'adventure_item': 'Item de Aventura',
        'consumable': 'Consumível',
        'professional_kit': 'Kit Profissional'
    };

    gmState.equipment.forEach(item => {
        const isVis = item.is_visible;
        eqHtml += `
            <tr class="gm-catalog-row" data-name="${item.name.toLowerCase()}" data-category="${item.category}" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding:0.8rem 0.5rem; font-weight:bold;">${item.name}</td>
                <td style="padding:0.8rem 0.5rem; color:var(--text-muted); font-size:0.9rem;">${catNames[item.category] || item.category}</td>
                <td style="padding:0.8rem 0.5rem;">${item.tier}</td>
                <td style="padding:0.8rem 0.5rem; color:#e78c3c; font-size:0.9rem;">${item.cost_base}</td>
                <td style="padding:0.8rem 0.5rem;">
                    <label style="display:flex; align-items:center; cursor:pointer;">
                        <input type="checkbox" ${isVis ? 'checked' : ''} onchange="toggleEquipmentVisibility(${item.id}, this.checked)" style="margin-right:0.5rem; accent-color:var(--accent-gold);">
                        <span style="font-size:0.85rem; color:${isVis ? '#2ecc71' : '#e74c3c'}">${isVis ? 'Liberado' : 'Oculto'}</span>
                    </label>
                </td>
                <td style="padding:0.8rem 0.5rem; text-align:right;">
                    <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size:0.8rem; border-color:#3498db; color:#3498db; margin-right:0.5rem;" onclick="toggleItemDetails(${item.id})">Ver Info</button>
                    <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size:0.8rem;" onclick="openGmItemModal(${item.id})">Editar</button>
                </td>
            </tr>
                <tr id="eq-details-${item.id}" style="display:none; background:rgba(0,0,0,0.5);">
                <td colspan="6" style="padding:1rem;">
                    <div style="color:var(--accent-gold); margin-bottom:0.8rem; font-size:0.95rem;"><b>Traços / Descrição:</b> <span style="color:var(--text-light); font-weight:normal;">${item.description || 'Nenhuma descrição detalhada cadastra.'}</span></div>
                    <div style="font-size:0.85rem; display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
                        ${formatEquipmentData(item.data, item.category)}
                    </div>
                </td>
            </tr>
        `;
    });

    eqHtml += `
            </tbody>
        </table>
    </div>
    `;

    container.innerHTML = eqHtml;
    filterGmCatalog(); // apply filters if there was a re-render
}

window.filterGmCatalog = function () {
    const term = (document.getElementById('gm-catalog-search')?.value || '').toLowerCase();
    const cat = document.getElementById('gm-catalog-filter')?.value || 'all';

    document.querySelectorAll('.gm-catalog-row').forEach(row => {
        const matchesTerm = row.dataset.name.includes(term);
        const matchesCat = cat === 'all' || row.dataset.category === cat;

        row.style.display = (matchesTerm && matchesCat) ? 'table-row' : 'none';

        // Hide expanded details if the parent row is hidden
        const detailsId = row.nextElementSibling?.id;
        if (detailsId && detailsId.startsWith('eq-details-') && (!matchesTerm || !matchesCat)) {
            document.getElementById(detailsId).style.display = 'none';
        }
    });
}

async function toggleEquipmentVisibility(itemId, isVisible) {
    try {
        await apiCall('equipment.php?action=toggle_visibility', 'POST', {
            id: itemId,
            is_visible: isVisible ? 1 : 0
        });
        // Update local state without full reload
        const item = gmState.equipment.find(e => e.id === itemId);
        if (item) item.is_visible = isVisible;
    } catch (e) {
        alert("Erro ao alterar visibilidade: " + e.message);
        initGmView(); // Reload to fix sync out of state
    }
}

window.toggleBulkVisibility = async function (isVisible) {
    const term = (document.getElementById('gm-catalog-search')?.value || '').toLowerCase();
    const cat = document.getElementById('gm-catalog-filter')?.value || 'all';

    // Find all item IDs that match the current filter search
    const idsToUpdate = gmState.equipment.filter(item => {
        const matchesTerm = item.name.toLowerCase().includes(term);
        const matchesCat = cat === 'all' || item.category === cat;
        // Only update items that actually need to change state
        return matchesTerm && matchesCat && !!item.is_visible !== isVisible;
    }).map(i => i.id);

    if (idsToUpdate.length === 0) return; // Nothing to change

    if (!confirm(`Deseja ${isVisible ? 'LIBERAR' : 'OCULTAR'} os ${idsToUpdate.length} itens listados atualmente?`)) return;

    try {
        await apiCall('equipment.php?action=toggle_visibility_bulk', 'POST', {
            ids: idsToUpdate,
            is_visible: isVisible ? 1 : 0
        });

        // Render again to reflect changes visually
        initGmView();
    } catch (e) {
        alert("Erro ao alterar visibilidade em massa: " + e.message);
    }
};

function toggleItemDetails(id) {
    const el = document.getElementById(`eq-details-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

function openGmItemModal(itemId = null) {
    document.getElementById('gm-item-form').reset();
    document.getElementById('gm-item-id').value = '';
    const modalTitle = document.getElementById('gm-item-modal-title');
    const deleteBtn = document.getElementById('gm-item-delete-btn');

    if (itemId) {
        modalTitle.textContent = "Editar Item";
        deleteBtn.style.display = "block";
        const item = gmState.equipment.find(e => e.id === itemId);
        if (item) {
            document.getElementById('gm-item-id').value = item.id;
            document.getElementById('gm-item-name').value = item.name;
            document.getElementById('gm-item-category').value = item.category;
            document.getElementById('gm-item-tier').value = item.tier;
            document.getElementById('gm-item-cost').value = item.cost_base;
            document.getElementById('gm-item-desc').value = item.description;
            document.getElementById('gm-item-data').value = JSON.stringify(item.data, null, 2);
        }
    } else {
        modalTitle.textContent = "Forjar Novo Item";
        deleteBtn.style.display = "none";
        document.getElementById('gm-item-tier').value = 1;
        document.getElementById('gm-item-cost').value = '1 Punhado';
    }

    document.getElementById('gm-item-modal').style.display = 'flex';
}

async function saveGmItem() {
    const id = document.getElementById('gm-item-id').value;
    const name = document.getElementById('gm-item-name').value;
    const category = document.getElementById('gm-item-category').value;
    const tier = document.getElementById('gm-item-tier').value;
    const cost_base = document.getElementById('gm-item-cost').value;
    const description = document.getElementById('gm-item-desc').value;
    const dataRaw = document.getElementById('gm-item-data').value;

    if (!name) return alert("O nome do item é obrigatório!");

    let parsedData = {};
    if (dataRaw.trim() !== '') {
        try {
            parsedData = JSON.parse(dataRaw);
        } catch (e) {
            return alert("Erro no JSON de Estatísticas Específicas: " + e.message);
        }
    }

    const payload = { id, name, category, tier, cost_base, description, data: parsedData };
    const action = id ? 'update' : 'create';

    try {
        await apiCall(`equipment.php?action=${action}`, 'POST', payload);
        document.getElementById('gm-item-modal').style.display = 'none';
        initGmView(); // Reload catalog
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
}

async function deleteGmItem() {
    const id = document.getElementById('gm-item-id').value;
    if (!id) return;

    if (!confirm("Tem certeza que deseja desintegrar este item do Armazém? Ele desaparecerá das opções dos jogadores.")) return;

    try {
        await apiCall('equipment.php?action=delete', 'POST', { id });
        document.getElementById('gm-item-modal').style.display = 'none';
        initGmView();
    } catch (e) {
        alert("Erro ao excluir: " + e.message);
    }
}

// Bestiary / NPCs Tab
function renderGmBestiaryTab(container) {
    if (!gmState.bestiary) gmState.bestiary = [];

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="color:var(--accent-gold);">Bestiário & NPCs</h3>
            <button class="btn btn-primary" onclick="openBestiaryModal()" style="display:flex; align-items:center; gap:0.5rem;"><i class="fas fa-plus"></i> Forjar Oponente</button>
        </div>
        
        <div style="margin-bottom:1.5rem;">
            <input type="text" id="bestiary-search" placeholder="Buscar fichas por nome ou tipo..." style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.5); color:white;" oninput="filterBestiary()">
        </div>
        
        <div id="bestiary-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1rem;">
    `;

    html += generateBestiaryCardsHTML(gmState.bestiary);

    html += `</div>`;
    container.innerHTML = html;
}

function generateBestiaryCardsHTML(list) {
    if (list.length === 0) {
        return `<p style="color:var(--text-muted); grid-column:1/-1;">Nenhuma ficha encontrada.</p>`;
    }

    let html = '';
    list.forEach(b => {
        const isCanonical = !b.gm_id;
        const borderColor = isCanonical ? 'rgba(255,255,255,0.2)' : 'var(--accent-purple)';
        const tagColor = isCanonical ? '#7f8c8d' : '#9b59b6';

        const imageHtml = b.avatar || b.token
            ? `<div style="float:right; margin-left:15px; margin-bottom:10px;"><img src="${b.avatar || b.token}" style="width:80px; height:80px; border-radius:12px; object-fit:cover; border:2px solid ${tagColor}; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`
            : '';

        html += `
            <div class="glass-panel" style="padding:1.5rem; text-align:left; border:1px solid ${borderColor}; position:relative; display:flex; flex-direction:column; justify-content:space-between;">
                ${isCanonical ? `<span style="position:absolute; top:10px; right:10px; font-size:0.7rem; background:${tagColor}; color:white; padding:2px 6px; border-radius:4px; opacity:0.7;">Livro Base</span>` : ''}
                
                <div style="flex:1;">
                    ${imageHtml}
                    <h4 style="color:var(--accent-gold); margin-bottom:0.2rem; font-size:1.2rem; max-width: ${imageHtml ? '70%' : '100%'}">${b.name}</h4>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem; display:flex; gap:10px;">
                        <span style="border-right:1px solid rgba(255,255,255,0.2); padding-right:10px;">Tier ${b.tier}</span>
                        <span style="border-right:1px solid rgba(255,255,255,0.2); padding-right:10px; font-weight:bold;">${b.type}</span>
                        <span>DF: ${b.difficulty}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:0.5rem; border-radius:4px; margin-bottom:1rem; clear:both;">
                        <div style="text-align:center;">
                            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">PV</span>
                            <b>${b.hp_max}</b>
                        </div>
                        <div style="text-align:center;">
                            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Fadiga</span>
                            <b>${b.stress_max}</b>
                        </div>
                        <div style="text-align:center;">
                            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Dano (M / G)</span>
                            <b style="color:#e67e22;">${b.threshold_major || '-'}</b> / <b style="color:#e74c3c;">${b.threshold_severe || '-'}</b>
                        </div>
                    </div>
                    
                    <p style="font-size:0.85rem; color:var(--text-light); margin-bottom:1.5rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">
                        ${b.description || b.motivations || 'Sem descrição.'}
                    </p>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:auto;">
                    <a href="?view=npc&id=${b.id}" class="btn btn-outline" style="flex:1; padding:0.6rem; border-color:var(--accent-purple); color:white; text-decoration:none; text-align:center; font-size:0.9rem;" onclick="return window.handleLinkClick(event, () => openBestiaryModalFromTemplate(${b.id}))">
                        <i class="fas fa-edit"></i> Editar
                    </a>
                    ${gmState.session ? `<button class="btn btn-primary" style="padding:0.6rem 1rem; background:linear-gradient(135deg, #e74c3c, #c0392b); font-size:0.9rem;" title="Adicionar à Cena" onclick="openAddAdvPicker(${b.id}, true)"><i class="fas fa-plus"></i></button>` : ''}
                </div>
            </div>
        `;
    });
    return html;
}

function filterBestiary() {
    const term = document.getElementById('bestiary-search').value.toLowerCase();
    const grid = document.getElementById('bestiary-grid');
    if (!grid) return;

    if (!term) {
        grid.innerHTML = generateBestiaryCardsHTML(gmState.bestiary);
        return;
    }

    const filtered = gmState.bestiary.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.type.toLowerCase().includes(term)
    );

    grid.innerHTML = generateBestiaryCardsHTML(filtered);
}

function toggleHordeMultiplier() {
    const type = document.getElementById('gm-bestiary-type').value;
    const cont = document.getElementById('gm-horde-mult-container');
    if (type === 'Horda') {
        cont.style.display = 'block';
    } else {
        cont.style.display = 'none';
        document.getElementById('gm-bestiary-horde-mult').value = '';
    }
}

function openBestiaryModal(b = null) {
    const modal = document.getElementById('gm-bestiary-modal');
    const delBtn = document.getElementById('gm-bestiary-delete-btn');
    const form = document.getElementById('gm-bestiary-form');

    const saveBtn = document.getElementById('gm-bestiary-save-btn');

    // Unlock form in case it was explicitly locked by the Quick View modal
    Array.from(form.elements).forEach(el => el.removeAttribute('readonly'));
    Array.from(form.getElementsByTagName('select')).forEach(el => el.removeAttribute('disabled'));
    saveBtn.style.display = 'block';

    const duplicateBtn = document.getElementById('gm-bestiary-duplicate-btn');

    form.reset();
    document.getElementById('gm-bestiary-horde-mult').value = '';

    if (b) {
        document.getElementById('gm-bestiary-modal-title').innerText = 'Ficha do Oponente';

        // Everyone edits the exact ID now
        document.getElementById('gm-bestiary-id').value = b.id;

        document.getElementById('gm-bestiary-name').value = b.name;
        document.getElementById('gm-bestiary-tier').value = b.tier;
        document.getElementById('gm-bestiary-diff').value = b.difficulty;
        document.getElementById('gm-bestiary-type').value = b.type;
        document.getElementById('gm-bestiary-horde-mult').value = b.horde_multiplier || '';
        document.getElementById('gm-bestiary-hp').value = b.hp_max;
        document.getElementById('gm-bestiary-pf').value = b.stress_max;
        document.getElementById('gm-bestiary-tmajor').value = b.threshold_major || '';
        document.getElementById('gm-bestiary-tsevere').value = b.threshold_severe || '';
        document.getElementById('gm-bestiary-motifs').value = b.motivations || '';
        document.getElementById('gm-bestiary-desc').value = b.description || '';

        document.getElementById('gm-bestiary-avatar-url').value = b.avatar || '';
        document.getElementById('gm-bestiary-avatar-img').src = b.avatar || 'img/default_avatar.png';

        if (b.attack) {
            document.getElementById('gm-atk-mod').value = b.attack.modifier || '';
            document.getElementById('gm-atk-name').value = b.attack.name || '';
            document.getElementById('gm-atk-range').value = b.attack.range || 'corpo a corpo';
            document.getElementById('gm-atk-dmg').value = b.attack.damage || '';
        }

        renderBestiaryXp(b.experiences || []);
        renderBestiaryHab(b.abilities || []);

        delBtn.style.display = b.gm_id ? 'inline-block' : 'none'; // Only show delete if user owns it
        duplicateBtn.style.display = 'inline-block';
        saveBtn.innerText = 'Salvar Edições';
    } else {
        document.getElementById('gm-bestiary-modal-title').innerText = 'Forjar Novo Oponente';
        document.getElementById('gm-bestiary-id').value = '';
        saveBtn.innerText = 'Criar Ficha';
        renderBestiaryXp([]);
        renderBestiaryHab([]);
        delBtn.style.display = 'none';
        duplicateBtn.style.display = 'none';

        document.getElementById('gm-bestiary-avatar-url').value = '';
        document.getElementById('gm-bestiary-avatar-img').src = '';
    }

    toggleHordeMultiplier();
    modal.style.display = 'flex';
}

window.openBestiaryModal = openBestiaryModal;
window.filterBestiary = filterBestiary;
window.toggleHordeMultiplier = toggleHordeMultiplier;

async function saveBestiaryTemplate() {
    const id = document.getElementById('gm-bestiary-id').value;

    // Parse the standard attack
    const attack = {
        modifier: document.getElementById('gm-atk-mod').value,
        name: document.getElementById('gm-atk-name').value,
        range: document.getElementById('gm-atk-range').value,
        damage: document.getElementById('gm-atk-dmg').value
    };

    let exp = [];
    document.querySelectorAll('.gm-xp-row').forEach(row => {
        const name = row.querySelector('.xp-name').value.trim();
        const modifier = row.querySelector('.xp-mod').value.trim();
        if (name || modifier) exp.push({ name, modifier });
    });

    let hab = [];
    document.querySelectorAll('.gm-hab-row').forEach(row => {
        const type = row.querySelector('.hab-type').value;
        const name = row.querySelector('.hab-name').value.trim();
        const description = row.querySelector('.hab-desc').value.trim();
        if (name || description) hab.push({ type, name, description });
    });

    let avatarUrl = document.getElementById('gm-bestiary-avatar-img').src;
    if (avatarUrl.includes("placeholder") || avatarUrl.endsWith("index.html") || avatarUrl === window.location.href || avatarUrl.includes("img/default_avatar")) {
        avatarUrl = null;
    }

    const payload = {
        id: id || undefined,
        name: document.getElementById('gm-bestiary-name').value,
        tier: document.getElementById('gm-bestiary-tier').value,
        difficulty: document.getElementById('gm-bestiary-diff').value,
        type: document.getElementById('gm-bestiary-type').value,
        horde_multiplier: document.getElementById('gm-bestiary-horde-mult').value || null,
        hp_max: document.getElementById('gm-bestiary-hp').value,
        stress_max: document.getElementById('gm-bestiary-pf').value,
        threshold_major: document.getElementById('gm-bestiary-tmajor').value || null,
        threshold_severe: document.getElementById('gm-bestiary-tsevere').value || null,
        motivations: document.getElementById('gm-bestiary-motifs').value,
        description: document.getElementById('gm-bestiary-desc').value,
        attack: attack,
        experiences: exp,
        abilities: hab,
        avatar: avatarUrl,
        token: avatarUrl
    };

    console.log("PAYLOAD INDO PRO SERVIDOR:", payload);

    try {
        const action = id ? 'update_bestiary_template' : 'create_bestiary_template';
        await apiCall(`gm.php?action=${action}`, 'POST', payload);
        document.getElementById('gm-bestiary-modal').style.display = 'none';
        initGmView(); // Refresh dashboard
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
}

async function deleteBestiaryTemplate() {
    if (!confirm("Excluir esta ficha permanentemente do banco?")) return;
    const id = document.getElementById('gm-bestiary-id').value;
    try {
        await apiCall('gm.php?action=delete_bestiary_template', 'POST', { id });
        document.getElementById('gm-bestiary-modal').style.display = 'none';
        initGmView();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

window.saveBestiaryTemplate = saveBestiaryTemplate;
window.deleteBestiaryTemplate = deleteBestiaryTemplate;
window.duplicateBestiaryTemplate = duplicateBestiaryTemplate;

// ==========================================
// BESTIARY DYNAMIC ARRAYS UI
// ==========================================

function renderBestiaryXp(experiences) {
    const list = document.getElementById('gm-bestiary-xp-list');
    list.innerHTML = '';
    experiences.forEach(ex => addBestiaryXpRow(ex.name, ex.modifier));
}

function addBestiaryXpRow(name = '', modifier = '') {
    const list = document.getElementById('gm-bestiary-xp-list');
    const div = document.createElement('div');
    div.className = 'gm-xp-row input-group';
    div.style = 'display:grid; grid-template-columns: 1fr 80px 40px; gap:10px; align-items:center; background:rgba(0,0,0,0.3); padding:0.5rem; border-radius:4px; border:1px solid rgba(255,255,255,0.1);';
    div.innerHTML = `
        <input type="text" class="xp-name" placeholder="Nome (Ex: Ladino)" value="${name}" style="padding:0.4rem; border-radius:4px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white;">
        <input type="text" class="xp-mod" placeholder="Mod (+2)" value="${modifier}" style="padding:0.4rem; border-radius:4px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white;">
        <button type="button" class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.4rem;" onclick="this.parentElement.remove()" title="Remover"><i class="fas fa-trash"></i></button>
    `;
    list.appendChild(div);
}

function renderBestiaryHab(abilities) {
    const list = document.getElementById('gm-bestiary-hab-list');
    list.innerHTML = '';
    abilities.forEach(ab => addBestiaryHabRow(ab.type, ab.name, ab.description));
}

function addBestiaryHabRow(type = 'passive', name = '', desc = '') {
    const list = document.getElementById('gm-bestiary-hab-list');
    const div = document.createElement('div');
    div.className = 'gm-hab-row input-group';
    div.style = 'background:rgba(0,0,0,0.3); padding:0.5rem; border-radius:4px; border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; gap:0.5rem; position:relative;';
    div.innerHTML = `
        <div style="display:grid; grid-template-columns: 120px 1fr auto; gap:10px;">
            <select class="hab-type" style="padding:0.4rem; border-radius:4px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white;">
                <option value="passive" ${type === 'passive' ? 'selected' : ''}>Passiva</option>
                <option value="action" ${type === 'action' ? 'selected' : ''}>Ação</option>
                <option value="reaction" ${type === 'reaction' ? 'selected' : ''}>Reação</option>
                <option value="fear" ${type === 'fear' ? 'selected' : ''}>Medo</option>
            </select>
            <input type="text" class="hab-name" placeholder="Nome da Habilidade" value="${name}" style="padding:0.4rem; border-radius:4px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white;">
            <button type="button" class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.4rem 0.8rem;" onclick="this.parentElement.parentElement.remove()" title="Remover"><i class="fas fa-trash"></i> Remover</button>
        </div>
        <textarea class="hab-desc" rows="2" placeholder="Descrição da habilidade..." style="width:100%; padding:0.6rem; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:white;">${desc}</textarea>
    `;
    list.appendChild(div);
}

window.addBestiaryXpRow = addBestiaryXpRow;
window.addBestiaryHabRow = addBestiaryHabRow;
window.duplicateBestiaryTemplate = duplicateBestiaryTemplate;

async function duplicateBestiaryTemplate() {
    // Treat the current form data as a brand new insert but with '(Cópia)' appended
    document.getElementById('gm-bestiary-id').value = '';
    const nameField = document.getElementById('gm-bestiary-name');
    if (!nameField.value.endsWith('(Cópia)')) {
        nameField.value = nameField.value + ' (Cópia)';
    }

    // Switch the UI to 'Creating' mode visually
    document.getElementById('gm-bestiary-modal-title').innerText = 'Forjar Novo Oponente (Cópia)';
    document.getElementById('gm-bestiary-delete-btn').style.display = 'none';
    document.getElementById('gm-bestiary-duplicate-btn').style.display = 'none';
    document.getElementById('gm-bestiary-save-btn').innerText = 'Salvar Cópia';

    alert("Oponente marcado para cópia! Altere o que quiser e clique em 'Salvar Cópia'.");
}

// Image Upload (Base64)
window.uploadAdversaryImage = function (inputEl, type) {
    if (!inputEl.files || !inputEl.files[0]) return;

    const file = inputEl.files[0];

    // Check file size (optional safety restriction, e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert("A imagem é muito grande. Escolha uma imagem de até 2MB para não sobrecarregar o banco de dados.");
        inputEl.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Url = e.target.result;

        // Update hidden input and image preview
        document.getElementById(`gm-bestiary-${type}-url`).value = base64Url;
        document.getElementById(`gm-bestiary-${type}-img`).src = base64Url;
    };

    reader.onerror = function () {
        alert("Erro ao ler o arquivo de imagem.");
    };

    reader.readAsDataURL(file);

    // Reset file input so same file can be selected again
    inputEl.value = '';
};

// --- Encounter Groups Functions ---

async function createEncounter(sessionId) {
    const name = document.getElementById('new-encounter-name').value.trim();
    if (!name) return alert("Digite um nome para o grupo.");

    try {
        await apiCall('gm.php?action=create_encounter', 'POST', { session_id: sessionId, name });
        initGmView();
    } catch (e) { alert(e.message); }
}

async function deleteEncounter(id, name) {
    if (!confirm(`Remover permanentemente o grupo '${name}' da sessão? Oponentes dentro dele ficarão soltos na cena.`)) return;
    try {
        await apiCall('gm.php?action=delete_encounter', 'POST', { id });
        initGmView();
    } catch (e) { alert(e.message); }
}

function openAddAdvPicker(targetId = null, isFromBestiary = false) {
    // If isFromBestiary is true, targetId is the template_id and we pick an Encounter Group
    // If isFromBestiary is false, targetId is the encounter_id and we pick a Template

    let html = `
        <div class="glass-panel" style="width:95%; max-width:600px; padding:2rem; position:relative; max-height:85vh; overflow-y:auto;">
            <button onclick="document.getElementById('gm-adv-picker-modal').style.display='none'" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
            <h3 style="color:var(--accent-gold); margin-bottom:1.5rem;">${isFromBestiary ? 'Enviar para qual Grupo?' : 'Adicionar ao Grupo'}</h3>
            <div style="display:flex; flex-direction:column; gap:0.8rem;">
    `;

    if (isFromBestiary) {
        // We are holding a Template, let's list the Encounters to drop it in
        const encounters = gmState.encounter_groups || [];

        // Option for "Solto na Cena" (No group)
        html += `
            <div style="background:rgba(231, 76, 60, 0.1); border:1px dashed #e74c3c; padding:1rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:white; display:block;">Inimigo Avulso (Sem Grupo)</strong>
                <button class="btn btn-outline" style="border-color:#e74c3c; color:#e74c3c; padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="addAdversaryFromTemplate(${targetId}, null)">
                    <i class="fas fa-share"></i> Enviar
                </button>
            </div>
        `;

        if (encounters.length === 0) {
            html += `<p style="color:var(--text-muted)">Nenhum grupo criado na sessão.</p>`;
        } else {
            encounters.forEach(enc => {
                html += `
                    <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); padding:1rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:white; display:block;"><i class="fas fa-users" style="color:#e74c3c;"></i> ${enc.name}</strong>
                        <button class="btn btn-outline" style="border-color:var(--accent-gold); color:var(--accent-gold); padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="addAdversaryFromTemplate(${targetId}, ${enc.id})">
                            <i class="fas fa-share"></i> Enviar
                        </button>
                    </div>
                 `;
            });
        }
    } else {
        // We are holding an Encounter, let's list the Bestiary to pick from
        const bList = [...gmState.bestiary].sort((a, b) => a.name.localeCompare(b.name));

        if (bList.length === 0) {
            html += `<p style="color:var(--text-muted)">Nenhuma ficha no bestiário. Feche e vá na aba Bestiário forjar um oponente.</p>`;
        } else {
            // Search Input inside picker
            html += `
                <input type="text" id="picker-search" placeholder="Buscar..." style="width:100%; padding:0.6rem; margin-bottom:1rem; background:rgba(0,0,0,0.5); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:4px;" oninput="
                    const val = this.value.toLowerCase();
                    document.querySelectorAll('.picker-adv-item').forEach(el => {
                        el.style.display = el.dataset.name.includes(val) ? 'flex' : 'none';
                    });
                ">
            `;

            bList.forEach(b => {
                html += `
                    <div class="picker-adv-item" data-name="${b.name.toLowerCase()}" style="background:rgba(0,0,0,0.5); padding:0.8rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center; border-left:3px solid ${b.gm_id ? 'var(--accent-purple)' : 'rgba(255,255,255,0.2)'};">
                        <div>
                            <strong style="color:white; display:block;">${b.name}</strong>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${b.type} | Tier ${b.tier} | DF ${b.difficulty}</span>
                        </div>
                        <button class="btn btn-outline" style="border-color:var(--accent-gold); color:var(--accent-gold); padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="addAdversaryFromTemplate(${b.id}, ${targetId})">
                            <i class="fas fa-plus"></i> Inserir
                        </button>
                    </div>
                 `;
            });
        }
    }

    html += `</div></div>`;

    let wrap = document.getElementById('gm-adv-picker-modal');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'gm-adv-picker-modal';
        wrap.style.cssText = "display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; align-items:center; justify-content:center;";
        document.body.appendChild(wrap);
    }
    wrap.innerHTML = html;
    wrap.style.display = 'flex';
}

async function addAdversaryFromTemplate(templateId, encounterId) {
    const tpl = gmState.bestiary.find(b => b.id == templateId);
    if (!tpl) return;

    // Create new adversary from template
    const payload = {
        session_id: gmState.session.id,
        name: tpl.name,
        type: tpl.type,
        hp: tpl.hp_max,
        stress: tpl.stress_max,
        tier: tpl.tier,
        encounter_id: encounterId,
        template_id: templateId,
        avatar: tpl.avatar,
        token: tpl.token
    };

    try {
        await apiCall('gm.php?action=add_adversary', 'POST', payload);
        document.getElementById('gm-adv-picker-modal').style.display = 'none';
        initGmView();
        // Switch to session tab to see the change
        switchGmTab('session');
    } catch (e) { alert("Erro ao inserir: " + e.message); }
}

function openBestiaryModalFromTemplate(templateId) {
    const tpl = gmState.bestiary.find(b => b.id == templateId);
    if (tpl) {
        openBestiaryModal(tpl);
    }
}

window.createEncounter = createEncounter;
window.deleteEncounter = deleteEncounter;
window.openAddAdvPicker = openAddAdvPicker;
window.addAdversaryFromTemplate = addAdversaryFromTemplate;
window.openBestiaryModalFromTemplate = openBestiaryModalFromTemplate;
