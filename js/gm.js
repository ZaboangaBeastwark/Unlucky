// js/gm.js

let gmState = {
    session: null,
    characters: [],
    adversaries: [],
    equipment: [],
    activeTab: 'session' // 'session' or 'catalog'
};

async function initGmView() {
    const container = document.getElementById('gm-dynamic-area');
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;">Carregando painel...</div>`;

    try {
        const res = await apiCall('gm.php?action=session_data');
        const eqRes = await apiCall('equipment.php?action=list');

        gmState.equipment = eqRes.equipment || [];

        if (res.session) {
            gmState.session = res.session;
            gmState.characters = res.characters;
            gmState.adversaries = res.adversaries;
            renderGmDashboard(container);
            startGmPolling(); // Initialize auto-sync
        } else {
            renderCreateSession(container);
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
            const rawRes = await fetch(`${API_BASE}gm.php?action=session_data`, { cache: 'no-store' });
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
        <div style="margin-bottom: 1.5rem; display:flex; gap:1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <button onclick="switchGmTab('session')" style="background:none; border:none; color:${gmState.activeTab === 'session' ? 'var(--accent-gold)' : 'white'}; padding:0.5rem 1rem; cursor:pointer; border-bottom: ${gmState.activeTab === 'session' ? '2px solid var(--accent-gold)' : 'none'}; font-weight: ${gmState.activeTab === 'session' ? 'bold' : 'normal'}; font-size:1.1rem;">Sessão Ativa</button>
            <button onclick="switchGmTab('catalog')" style="background:none; border:none; color:${gmState.activeTab === 'catalog' ? 'var(--accent-gold)' : 'white'}; padding:0.5rem 1rem; cursor:pointer; border-bottom: ${gmState.activeTab === 'catalog' ? '2px solid var(--accent-gold)' : 'none'}; font-weight: ${gmState.activeTab === 'catalog' ? 'bold' : 'normal'}; font-size:1.1rem;">Catálogo de Equipamentos</button>
        </div>
        <div id="gm-tab-content"></div>
    `;
    container.innerHTML = tabsHtml;

    const contentArea = document.getElementById('gm-tab-content');
    if (gmState.activeTab === 'session') {
        renderGmSessionTab(contentArea);
    } else {
        renderGmCatalogTab(contentArea);
    }
}

function renderGmSessionTab(container) {
    const s = gmState.session;

    const activeChars = gmState.characters.filter(c => c.session_status === 'approved');
    const pendingChars = gmState.characters.filter(c => c.session_status === 'pending');

    let charsHtml = activeChars.length === 0 ?
        '<p style="color:var(--text-muted);">Nenhum jogador na sessão ainda.</p>' : '';

    activeChars.forEach(c => {
        charsHtml += `
            <div style="background:rgba(0,0,0,0.3); padding:1.2rem; border-radius:8px; border:1px solid var(--accent-gold); margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; transition: transform 0.2s;" onmouseover="this.style.boxShadow='0 0 10px rgba(241,196,15,0.2)';" onmouseout="this.style.boxShadow='none';">
                <div style="flex-grow:1; min-width:200px;">
                    <h4 style="color:var(--accent-gold); margin-bottom:0.3rem; font-size:1.3rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer;" onclick="openGmCharacterSheet(${c.id})" title="Clique para Abrir a Ficha do Jogador">
                        <i class="fas fa-file-alt" style="font-size:1rem; opacity:0.7;"></i> ${c.name} 
                    </h4>
                    <div style="font-size:0.9rem; margin-bottom:0.3rem; color:var(--text-light);">
                        Jogador: <strong style="color:#3498db;">${c.player_name || 'Desconhecido'}</strong>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">
                        Nível ${c.level} ${c.class} (${c.subclass || 'Sem Subclasse'}) 
                        <span style="margin-left:1rem; padding:0.2rem 0.6rem; border-radius:4px; background:rgba(231,140,60,0.1); color:#e78c3c; border:1px solid rgba(231,140,60,0.3);">XP Atual: <b>${c.xp || 0}</b></span>
                        ${(parseInt(c.xp || 0) >= 6 && c.can_level_up == 0) ? `<button class="btn btn-sm" onclick="allowLevelUp(${c.id})" style="margin-left:1rem; background:linear-gradient(135deg, #2ecc71, #27ae60); border:none; color:white; padding:0.2rem 0.6rem;">Permitir Subir de Nível <i class="fas fa-arrow-up"></i></button>` : ''}
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
                    <button class="btn btn-primary" onclick="openGmCharacterSheet(${c.id})" style="padding:0.6rem 1.2rem; font-size:0.95rem; display:flex; gap:0.5rem; align-items:center; background:#f1c40f; color:#0f0f13; border:none; font-weight:bold;">Selecionar <i class="fas fa-play"></i></button>
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
