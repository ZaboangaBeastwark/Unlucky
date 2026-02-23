import os

js_content = """// js/player.js

const DH_CLASSES = {
    'Bardo': { evasion: 10, hp: 6, subclasses: ['Beletrista', 'Trovador'] },
    'Druida': { evasion: 9, hp: 7, subclasses: ['Protetor dos Elementos', 'Protetor da Renovação'] },
    'Feiticeiro': { evasion: 7, hp: 6, subclasses: ['Elementalista', 'Primordialista'] },
    'Guardião': { evasion: 8, hp: 10, subclasses: ['Baluarte', 'Vingador'] },
    'Guerreiro': { evasion: 8, hp: 9, subclasses: ['Escolhido da Bravura', 'Escolhido da Matança'] },
    'Ladino': { evasion: 10, hp: 6, subclasses: ['Gatuno', 'Mafioso'] },
    'Mago': { evasion: 7, hp: 6, subclasses: ['Discípulo do Conhecimento', 'Discípulo da Guerra'] },
    'Patrulheiro': { evasion: 9, hp: 7, subclasses: ['Rastreador', 'Treinador'] },
    'Serafim': { evasion: 8, hp: 8, subclasses: ['Portador Divino', 'Sentinela Alada'] }
};

const DH_ANCESTRIES = ['Anão', 'Firbolg', 'Infernis', 'Clank', 'Fungril', 'Katari', 'Drakona', 'Galapa', 'Orc', 'Elfo', 'Gigante', 'Pequenino', 'Fada', 'Goblin', 'Quacho', 'Fauno', 'Humano', 'Símio'];
const DH_COMMUNITIES = ['Aristocrática', 'Fora da lei', 'Nômade', 'Disciplinada', 'Marítima', 'Silvestre', 'Erudita', 'Montanhesa', 'Subterrânea'];

const INVENTORY_ITEMS = {
    weapons: {
        'Espada Longa': { type: 'Primária', slots: 1 },
        'Arco Curto': { type: 'Primária', slots: 1 },
        'Adaga': { type: 'Secundária', slots: 1 },
        'Cajado': { type: 'Duas Mãos', slots: 2 },
        'Machado de Batalha': { type: 'Duas Mãos', slots: 2 },
        'Sabre': { type: 'Primária', slots: 1 },
        'Varinha': { type: 'Secundária', slots: 1 }
    },
    armors: {
        'Nenhuma / Roupas': { armor_base: 0 },
        'Couro Leve': { armor_base: 3 },
        'Cota de Malha': { armor_base: 4 },
        'Armadura de Placas': { armor_base: 5 }
    }
};

const STAT_BLOCK = [2, 1, 1, 0, 0, -1];

let wizardState = {
    name: '',
    class: 'Guerreiro',
    subclass: '',
    ancestry: 'Humano',
    community: 'Aristocrática',
    attributes: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    experiences: [{ name: '', value: 2 }, { name: '', value: 1 }],
    potion: 'Vida',
    weapon: 'Espada Longa',
    armor: 'Nenhuma / Roupas',
    gold: 1,
    availableStats: [...STAT_BLOCK]
};

async function initPlayerView() {
    const container = document.getElementById('player-dynamic-area');
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;">Carregando sua ficha...</div>`;
    try {
        const res = await apiCall('character.php?action=mine');
        if (res.character) {
            renderCharacterSheet(res.character, container);
        } else {
            renderCharacterWizard(container);
        }
    } catch (e) {
        if (e.status === 404 || e.message.includes('404')) {
            renderCharacterWizard(container);
        } else {
            container.innerHTML = `<div class="error-msg">Erro ao carregar personagem: ${e.message}</div>`;
        }
    }
}

// ================= WIZARD ================= //
function renderCharacterWizard(container) {
    container.innerHTML = `
        <div class="wizard-container glass-panel" style="padding: 2rem;">
            <h2>Criação de Personagem</h2>
            <div id="wizard-step-content"></div>
            <div style="margin-top: 1.5rem; display: flex; justify-content: space-between;">
                <button id="wiz-prev" class="btn btn-outline" style="display:none;">Anterior</button>
                <button id="wiz-next" class="btn btn-primary">Próximo</button>
            </div>
        </div>
    `;
    let currentStep = 1;
    const maxSteps = 6;

    const updateStep = () => {
        document.getElementById('wiz-prev').style.display = currentStep > 1 ? 'block' : 'none';
        document.getElementById('wiz-next').textContent = currentStep === maxSteps ? 'Criar Personagem' : 'Próximo';

        const content = document.getElementById('wizard-step-content');
        if (currentStep === 1) content.innerHTML = step1HTML();
        else if (currentStep === 2) content.innerHTML = step2HTML();
        else if (currentStep === 3) content.innerHTML = step3HTML();
        else if (currentStep === 4) content.innerHTML = step4HTML();
        else if (currentStep === 5) content.innerHTML = step5HTML();
        else if (currentStep === 6) content.innerHTML = step6HTML();

        attachStepListeners(currentStep);
    };

    document.getElementById('wiz-next').addEventListener('click', async () => {
        if (currentStep === 3) {
            const sumAttr = Object.values(wizardState.attributes).reduce((a,b)=>a+b,0);
            const expectedSum = STAT_BLOCK.reduce((a,b)=>a+b,0);
            
            // Verificação rigorosa do bloco [2, 1, 1, 0, 0, -1]
            const vals = Object.values(wizardState.attributes).sort((a,b)=>b-a);
            const valid = vals[0]===2 && vals[1]===1 && vals[2]===1 && vals[3]===0 && vals[4]===0 && vals[5]===-1;
            
            if (!valid) {
                alert('A distribuição de atributos deve ser exatamente: +2, +1, +1, 0, 0, -1. Distribua corretamente antes de avançar.');
                return;
            }
        }

        saveStepData(currentStep);
        if (currentStep < maxSteps) {
            currentStep++;
            updateStep();
        } else {
            await submitCharacter();
        }
    });

    document.getElementById('wiz-prev').addEventListener('click', () => {
        saveStepData(currentStep);
        if (currentStep > 1) {
            currentStep--;
            updateStep();
        }
    });

    // Inicialize state subclasses if not match class
    if (!DH_CLASSES[wizardState.class].subclasses.includes(wizardState.subclass)) {
        wizardState.subclass = DH_CLASSES[wizardState.class].subclasses[0];
    }
    updateStep();
}

function step1HTML() {
    const classOptions = Object.keys(DH_CLASSES).map(c => `<option value="${c}" ${wizardState.class === c ? 'selected' : ''}>${c}</option>`).join('');
    return `
        <h3>Passo 1: Identidade Básica</h3>
        <div class="input-group">
            <label>Nome do Personagem</label>
            <input type="text" id="wiz-name" value="${wizardState.name}" placeholder="Ex: Galadriel">
        </div>
        <div class="input-group">
            <label>Classe</label>
            <select id="wiz-class">
                ${classOptions}
            </select>
        </div>
    `;
}

function step2HTML() {
    const ancestryOptions = DH_ANCESTRIES.map(a => `<option value="${a}" ${wizardState.ancestry === a ? 'selected' : ''}>${a}</option>`).join('');
    const communityOptions = DH_COMMUNITIES.map(c => `<option value="${c}" ${wizardState.community === c ? 'selected' : ''}>${c}</option>`).join('');
    const subclassOptions = DH_CLASSES[wizardState.class].subclasses.map(s => `<option value="${s}" ${wizardState.subclass === s ? 'selected' : ''}>${s}</option>`).join('');
    
    return `
        <h3>Passo 2: Herança e Subclasse</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">Escolha sua origem e o tipo de especialização para sua classe (${wizardState.class}).</p>
        <div class="input-group">
            <label>Ancestralidade</label>
            <select id="wiz-ancestry">${ancestryOptions}</select>
        </div>
        <div class="input-group">
            <label>Comunidade</label>
            <select id="wiz-community">${communityOptions}</select>
        </div>
        <div class="input-group">
            <label>Subclasse (Fundação)</label>
            <select id="wiz-subclass">${subclassOptions}</select>
        </div>
    `;
}

function step3HTML() {
    const attrs = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
    const pBR = { agility: 'Agilidade', strength: 'Força', finesse: 'Destreza (Finesse)', instinct: 'Instinto', presence: 'Presença', knowledge: 'Conhecimento' };

    let html = `<h3>Passo 3: Atributos</h3>
    <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">
        Distribua os seguintes valores OBRIGATORIAMENTE: <b>+2, +1, +1, 0, 0, -1</b>
    </p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
    `;
    attrs.forEach(a => {
        html += `
        <div class="input-group">
            <label>${pBR[a]}</label>
            <input type="number" class="wiz-attr" data-attr="${a}" value="${wizardState.attributes[a]}" min="-1" max="2" step="1">
        </div>`;
    });
    html += `</div>`;
    return html;
}

function step4HTML() {
    return `
        <h3>Passo 4: Experiências</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">
            Descreva seu conhecimento de vida (Ex: "Fui guarda do rei", "Estudos Arcanos").
        </p>
        <div class="input-group">
            <label>Experiência Principal (+2)</label>
            <input type="text" id="wiz-exp1" value="${wizardState.experiences[0].name}">
        </div>
        <div class="input-group">
            <label>Experiência Secundária (+1)</label>
            <input type="text" id="wiz-exp2" value="${wizardState.experiences[1].name}">
        </div>
    `;
}

function step5HTML() {
    const wEps = Object.keys(INVENTORY_ITEMS.weapons).map(w => `<option value="${w}" ${wizardState.weapon === w ? 'selected' : ''}>${w} (${INVENTORY_ITEMS.weapons[w].type})</option>`).join('');
    const aEps = Object.keys(INVENTORY_ITEMS.armors).map(a => `<option value="${a}" ${wizardState.armor === a ? 'selected' : ''}>${a} (Armor: ${INVENTORY_ITEMS.armors[a].armor_base})</option>`).join('');
    
    return `
        <h3>Passo 5: Equipamento e Dinheiro</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">
            O sistema Daggerheart garante que você começa com <b>1 Punhado de Ouro</b>, 1 Tocha, 15m de Corda e Suprimentos Basicos.
        </p>
        <div class="input-group">
            <label>Escolha sua Poção Inicial Menor</label>
            <select id="wiz-potion">
                <option value="Vida" ${wizardState.potion === 'Vida' ? 'selected' : ''}>Poção de Vida (Recupera 1d4 PV)</option>
                <option value="Vigor" ${wizardState.potion === 'Vigor' ? 'selected' : ''}>Poção de Vigor (Recupera 1d4 PF)</option>
            </select>
        </div>
        <div class="input-group">
            <label>Arma Inicial Padrão</label>
            <select id="wiz-weapon">${wEps}</select>
        </div>
        <div class="input-group">
            <label>Armadura Inicial Padrão</label>
            <select id="wiz-armor">${aEps}</select>
        </div>
    `;
}

function step6HTML() {
    const cls = DH_CLASSES[wizardState.class];
    const armObj = INVENTORY_ITEMS.armors[wizardState.armor];
    
    return `
        <h3>Passo 6: Revisão e Geração de Ficha</h3>
        <p style="font-size:0.9rem; color:var(--accent-gold); margin-bottom:1.5rem;">
            Aqui está o resumo dos atributos iniciais e das regras do seu personagem que serão salvos no Banco de Dados.
        </p>
        <div style="background:rgba(0,0,0,0.4); padding: 1.5rem; border-radius:8px; border:1px solid var(--glass-border); text-align:left;">
            <p><b>Nome e Classe:</b> ${wizardState.name || 'Sem Nome'} | ${wizardState.class} - ${wizardState.subclass}</p>
            <p><b>Herança:</b> ${wizardState.ancestry} da Comunidade ${wizardState.community}</p>
            <p><b>Inventário Inicial:</b> 1 Punhado de Ouro, Tocha, Corda, Suprimentos, Poção Menor de ${wizardState.potion}, ${wizardState.weapon}, ${wizardState.armor}</p>
            <hr style="border-color:rgba(255,255,255,0.1); margin:1rem 0;">
            <p><b>Evasão Base:</b> ${cls.evasion}</p>
            <p><b>Pontos de Vida Base:</b> ${cls.hp}</p>
            <p><b>Esperança:</b> 2 / 6 (Padrão Inicial)</p>
            <p><b>Fadiga Máxima:</b> 6</p>
            <p><b>Armadura Base:</b> ${armObj.armor_base}</p>
        </div>
    `;
}

function saveStepData(step) {
    if (step === 1) {
        wizardState.name = document.getElementById('wiz-name').value;
        const eClass = document.getElementById('wiz-class').value;
        if (eClass !== wizardState.class) {
            wizardState.class = eClass;
            wizardState.subclass = DH_CLASSES[eClass].subclasses[0];
        }
    } else if (step === 2) {
        wizardState.ancestry = document.getElementById('wiz-ancestry').value;
        wizardState.community = document.getElementById('wiz-community').value;
        wizardState.subclass = document.getElementById('wiz-subclass').value;
    } else if (step === 3) {
        document.querySelectorAll('.wiz-attr').forEach(el => {
            wizardState.attributes[el.dataset.attr] = parseInt(el.value);
        });
    } else if (step === 4) {
        wizardState.experiences[0].name = document.getElementById('wiz-exp1').value;
        wizardState.experiences[1].name = document.getElementById('wiz-exp2').value;
    } else if (step === 5) {
        wizardState.potion = document.getElementById('wiz-potion').value;
        wizardState.weapon = document.getElementById('wiz-weapon').value;
        wizardState.armor = document.getElementById('wiz-armor').value;
    }
}

function attachStepListeners(step) {
    if (step === 1) {
        document.getElementById('wiz-class').addEventListener('change', (e) => {
            wizardState.class = e.target.value;
            wizardState.subclass = DH_CLASSES[e.target.value].subclasses[0];
        });
    }
}

async function submitCharacter() {
    const cData = DH_CLASSES[wizardState.class];
    const armData = INVENTORY_ITEMS.armors[wizardState.armor];
    
    // Build inventory structure combining Gold, Equipped, Bag
    const inv = {
        gold: 1, // Represents 1 Punhado
        equipped: [
            { name: wizardState.weapon, details: INVENTORY_ITEMS.weapons[wizardState.weapon] },
            { name: wizardState.armor, details: armData }
        ],
        bag: [
            'Tocha',
            '15m de Corda',
            'Suprimentos Básicos',
            `Poção Menor de ${wizardState.potion}`
        ]
    };

    const payload = {
        name: wizardState.name || 'Herói sem nome',
        class: wizardState.class,
        subclass: wizardState.subclass,
        heritage: `${wizardState.ancestry} / ${wizardState.community}`,
        attributes: wizardState.attributes,
        experiences: wizardState.experiences,
        evasion_base: cData.evasion,
        hp_base: cData.hp,
        armor_base: armData.armor_base,
        inventory: inv
    };

    try {
        await apiCall('character.php?action=create', 'POST', payload);
        initPlayerView(); // Reload page to sheet
    } catch (e) {
        alert('Erro ao criar personagem: ' + e.message);
    }
}

// ================= CHARACTER SHEET ================= //
function renderCharacterSheet(char, container) {
    const pBR = { agility: 'Agilidade', strength: 'Força', finesse: 'Destreza', instinct: 'Instinto', presence: 'Presença', knowledge: 'Conhecimento' };

    let attrHtml = '';
    for (let k in char.attributes) {
        attrHtml += `
            <div class="attr-box" onclick="rollAttribute('${pBR[k]}', ${char.attributes[k]}, ${char.session_id})">
                <div class="attr-name">${pBR[k]}</div>
                <div class="attr-val">${char.attributes[k] >= 0 ? '+' + char.attributes[k] : char.attributes[k]}</div>
            </div>
        `;
    }

    let invHtml = '';
    if (char.inventory) {
        invHtml += `<div class="resource-row"><span>Ouro</span><span class="res-val highlight-gold">${char.inventory.gold || 0} Punhado(s)</span></div>`;
        invHtml += `<div class="resource-row"><span>Equipamento</span><span style="font-size:0.8rem; text-align:right;">`;
        if (char.inventory.equipped && char.inventory.equipped.length > 0) {
            invHtml += char.inventory.equipped.map(e => e.name).join('<br>');
        }
        invHtml += `</span></div>`;
        
        invHtml += `<div class="resource-row"><span>Mochila</span><span style="font-size:0.8rem; text-align:right;">`;
        if (char.inventory.bag && char.inventory.bag.length > 0) {
            invHtml += char.inventory.bag.join('<br>');
        }
        invHtml += `</span></div>`;
    }

    container.innerHTML = `
        <div class="sheet-header glass-panel">
            <div class="sheet-title">
                <h2>${char.name}</h2>
                <div class="sheet-subtitle">Nível ${char.level} | ${char.heritage} | ${char.class} - ${char.subclass}</div>
            </div>
            ${!char.session_id ? `
            <div style="background:rgba(212, 175, 55, 0.1); border:1px solid var(--accent-gold); padding:1rem; border-radius:8px;">
                <span style="font-size:0.9rem; color:var(--accent-gold);">Você não está em nenhuma sessão.</span>
                <div style="display:flex; gap:0.5rem; margin-top:0.5rem;" id="campaign-join-area">
                    <span style="color:var(--text-muted); font-size: 0.9rem;">Carregando campanhas...</span>
                </div>
            </div>
            ` : (char.session_status === 'pending' ? `
            <div style="background:rgba(231, 140, 60, 0.1); border:1px solid rgba(231, 140, 60, 0.5); padding:1rem; border-radius:8px;">
                <span style="font-size:0.9rem; color:#e78c3c; display:flex; align-items:center; gap:0.5rem;">
                    <span class="spinner" style="width:12px; height:12px; border:2px solid #e78c3c; border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>
                    Aguardando o Mestre aprovar sua entrada na sessão #${char.session_id}...
                </span>
            </div>
            ` : `<div style="color:var(--accent-purple); font-weight:bold;">Sessão Ativa: #${char.session_id}</div>`)}
        </div>

        <div class="sheet-grid">
            <div class="sheet-col">
                <div class="glass-panel sheet-section">
                    <h3>Atributos</h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 1rem;">Clique para rolar 2d12</p>
                    <div class="attr-grid">
                        ${attrHtml}
                    </div>
                </div>
                
                <div class="glass-panel sheet-section" style="margin-top: 2rem;">
                    <h3 style="color:var(--accent-gold);">Inventário</h3>
                    ${invHtml}
                </div>
            </div>
            
            <div class="sheet-col">
                <div class="glass-panel sheet-section resources-section">
                    <h3>Recursos</h3>
                    <div class="resource-row">
                        <span>Pontos de Vida (PV)</span>
                        <div class="res-tracker">
                            <button onclick="updateResource(${char.id}, 'hp_current', ${char.hp_current - 1})">-</button>
                            <span class="res-val">${char.hp_current} / ${char.hp_base}</span>
                            <button onclick="updateResource(${char.id}, 'hp_current', ${char.hp_current + 1})">+</button>
                        </div>
                    </div>
                    <div class="resource-row">
                        <span>Fadiga (Stress)</span>
                        <div class="res-tracker">
                            <button onclick="updateResource(${char.id}, 'stress_current', ${char.stress_current - 1})">-</button>
                            <span class="res-val">${char.stress_current} / 6</span>
                            <button onclick="updateResource(${char.id}, 'stress_current', ${char.stress_current + 1})">+</button>
                        </div>
                    </div>
                    <div class="resource-row">
                        <span>Esperança</span>
                        <div class="res-tracker">
                            <button onclick="updateResource(${char.id}, 'hope_current', ${char.hope_current - 1})">-</button>
                            <span class="res-val">${char.hope_current} / 6</span>
                            <button onclick="updateResource(${char.id}, 'hope_current', ${char.hope_current + 1})">+</button>
                        </div>
                    </div>
                    <div class="resource-row">
                        <span>Evasão</span>
                        <span class="res-val highlight-gold">${char.evasion_current_override ?? char.evasion_base}</span>
                    </div>
                    <div class="resource-row">
                        <span>PA / Armadura Base</span>
                        <span class="res-val">${char.armor_base}</span>
                    </div>
                </div>
                
                <div class="glass-panel sheet-section cards-section" style="margin-top: 2rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">
                        <h3 style="margin:0; border:none; padding:0; color:var(--accent-purple);">Cartas de Domínio</h3>
                        <span class="res-val" style="font-size:0.9rem; color:var(--text-muted);">Mão: ${char.cards ? char.cards.length : 0} / 5</span>
                    </div>
                    ${(!char.cards || char.cards.length === 0) ?
            '<p style="color:var(--text-muted); font-size:0.9rem;">Nenhuma carta ativa (Implementação Fase 2).</p>' :
            '<div class="cards-grid" style="display:flex; gap:1rem; flex-wrap:wrap;"></div>'
        }
                </div>
            </div>
        </div>
        
        <div style="text-align: right; margin-top: 2rem;">
            <button class="btn btn-primary" onclick="alert('O assistente de Level Up guiará a escolha de Patamar (Níveis 2-4, 5-7, 8-10) quando liberado pelo Mestre.')">Subir de Patamar (Level Up)</button>
        </div>
    `;

    if (!char.session_id) {
        fetchCampaignsForDropdown(char.id);
    }

    if (char.session_id && char.session_status === 'approved') {
        startLogPolling(char.session_id);
    } else if (typeof stopLogPolling === 'function') {
        stopLogPolling();
    }
}

async function fetchCampaignsForDropdown(charId) {
    const container = document.getElementById('campaign-join-area');
    if (!container) return;
    try {
        const res = await apiCall('character.php?action=campaigns');
        if (!res.campaigns || res.campaigns.length === 0) {
            container.innerHTML = `<span style="color:var(--text-muted); font-size: 0.9rem;">Nenhuma campanha ativa no servidor.</span>`;
            return;
        }

        let options = res.campaigns.map(c => `<option value="${c.id}">${c.name} (ID: ${c.id})</option>`).join('');
        container.innerHTML = `
            <select id="join-session-select" style="padding:0.4rem; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white; border-radius:4px; flex-grow:1;">
                ${options}
            </select>
            <button class="btn btn-outline" style="padding:0.4rem 0.8rem;" onclick="joinSession(${charId})">Entrar</button>
        `;
    } catch (e) {
        container.innerHTML = `<span style="color:red; font-size: 0.9rem;">Erro ao carregar campanhas: ${e.message}</span>`;
    }
}

async function rollAttribute(attrName, modifier, sessionId) {
    if (!sessionId || window.appState.user?.character?.session_status !== 'approved') {
        alert("Você precisa estar aprovado em uma sessão ativa para rolar dados.");
        return;
    }

    try {
        const res = await rollDaggerheart(sessionId, window.appState.user.username, `Teste de ${attrName}`, modifier);
        alert(res.message.replace(/<\/?[^>]+(>|$)/g, "")); // strip html for alert
    } catch (e) {
        alert("Erro ao rolar: " + e.message);
    }
}

async function updateResource(charId, field, value) {
    if (value < 0) value = 0;
    try {
        await apiCall('character.php?action=update_resource', 'POST', { character_id: charId, field, value: value });
        initPlayerView();
    } catch (e) {
        alert("Erro ao atualizar recurso: " + e.message);
    }
}

async function joinSession(charId) {
    const sessionSelect = document.getElementById('join-session-select');
    if (!sessionSelect) return;
    const sessionId = sessionSelect.value;
    if (!sessionId) return alert('Selecione uma campanha');
    try {
        await apiCall('character.php?action=join_session', 'POST', { character_id: charId, session_id: sessionId });
        initPlayerView();
    } catch (e) { alert(e.message); }
}
"""

with open('js/player.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("player.js updated successfully")
