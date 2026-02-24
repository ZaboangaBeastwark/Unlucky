// js/player.js

// DH_CLASSES, DH_ANCESTRIES_DATA, DH_COMMUNITIES_DATA, DH_DOMAIN_CARDS_LVL1, etc.
// are now assumed to be loaded via <script src="js/dh_data.js"></script> before player.js

const INVENTORY_ITEMS = {
    weapons: {
        'Espada Longa': { type: 'Primária', slots: 1, damage: 'd8', attr: 'Força', traits: 'Confiável' },
        'Arco Curto': { type: 'Primária', slots: 1, damage: 'd6', attr: 'Agilidade', traits: 'Longo Alcance, Recarga' },
        'Adaga': { type: 'Secundária', slots: 1, damage: 'd4', attr: 'Agilidade', traits: 'Ágil, Arremesso, Ocultável' },
        'Cajado': { type: 'Duas Mãos', slots: 2, damage: 'd8', attr: 'Conhecimento', traits: 'Mágico' },
        'Machado de Batalha': { type: 'Duas Mãos', slots: 2, damage: 'd10', attr: 'Força', traits: 'Pesado, Devastador' },
        'Sabre': { type: 'Primária', slots: 1, damage: 'd8', attr: 'Destreza', traits: 'Aparar' },
        'Varinha': { type: 'Secundária', slots: 1, damage: 'd4', attr: 'Presença', traits: 'Mágico, Ocultável' }
    },
    armors: {
        'Nenhuma / Roupas': { armor_base: 0, evasion_mod: 0, traits: 'Livre' },
        'Couro Leve': { armor_base: 3, evasion_mod: 0, traits: 'Nenhum' },
        'Cota de Malha': { armor_base: 4, evasion_mod: -1, traits: 'Metal, Pesada' },
        'Armadura de Placas': { armor_base: 5, evasion_mod: -2, traits: 'Metal, Muito Pesada, Barulhenta' }
    }
};

const STAT_BLOCK = [2, 1, 1, 0, 0, -1];

// Expand state to hold new 8-step variables
let wizardState = {
    name: '',
    class: 'Guerreiro',
    subclass: '',
    ancestry: 'Humano',
    community: 'Aristocrática',
    attributes: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    experiences: [{ name: '', value: 2 }, { name: '', value: 1 }],
    domain_cards: [], // Array of exact 2 string names
    potion: 'Vida',
    weapon: 'Espada Longa',
    armor: 'Nenhuma / Roupas',
    gold: 1,
    roleplay_answers: ['', '']
};

async function initPlayerView() {
    const container = document.getElementById('player-dynamic-area');
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;">Carregando seus heróis...</div>`;
    try {
        const res = await apiCall('character.php?action=mine');
        if (res.characters) {
            renderCharacterSelection(res.characters, container);
        } else {
            renderCharacterSelection([], container);
        }
    } catch (e) {
        if (e.status === 404 || e.message.includes('404')) {
            renderCharacterSelection([], container);
        } else {
            container.innerHTML = `<div class="error-msg">Erro ao listar personagens: ${e.message}</div>`;
        }
    }
}

// ================= CHARACTER SELECTION ================= //
window.renderCharacterSelection = function (chars, container) {
    let listHtml = '';

    if (chars.length === 0) {
        listHtml = `<p style="color:var(--text-muted); text-align:center; padding: 2rem;">Você ainda não tem nenhum herói forjado.</p>`;
    } else {
        chars.forEach(c => {
            const sessionText = c.session_id
                ? `<b>Sessão Ativa:</b> ${c.session_name}`
                : `<div style="margin-top:0.5rem; display:flex; gap:0.5rem; justify-content:flex-start;">
                    <select id="char-session-select-${c.id}" style="padding:0.3rem; background:rgba(0,0,0,0.5); color:white; border:1px solid #3498db; border-radius:4px; max-width:200px;">
                        <option value="">Carregando Campanhas...</option>
                    </select>
                    <button class="btn btn-sm" onclick="joinCampaign(${c.id})" style="background:#3498db; color:white; border:none; padding:0.3rem 0.5rem;">Vincular</button>
                 </div>`;

            // Note: In HTML onclick handlers, passing full stringified JSON objects can break quotes. 
            // Saving it globally temporarily or passing raw ID and finding it is safer. 
            // We'll pass the ID, and keep `chars` scoped.

            listHtml += `
                <div class="glass-panel" style="padding: 1.5rem; border:1px solid var(--accent-gold); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div style="text-align:left;">
                        <h3 style="color:var(--accent-gold); margin-bottom:0.2rem; font-family:'Crimson Text', serif; font-size:1.5rem;">${c.name}</h3>
                        <div style="font-size:0.95rem; color:var(--text-muted); margin-bottom:0.5rem;">Nivel ${c.level} ${c.class} (${c.heritage})</div>
                        <div style="font-size:0.9rem; color:#3498db;">
                            ${sessionText}
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button class="btn btn-primary sheet-btn" data-char-id="${c.id}" style="padding:0.6rem 1.5rem; font-size:1.1rem;">Selecionar <i class="fas fa-play" style="margin-left:5px; font-size:0.8rem;"></i></button>
                        <button class="btn btn-outline" onclick="deleteCharacter(${c.id})" style="border-color:#e74c3c; color:#e74c3c; padding:0.6rem 1rem;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div style="max-width:800px; margin:0 auto; text-align:center; padding-top:2rem;">
            <h2 style="font-family:'Crimson Text', serif; color:var(--accent-gold); margin-bottom:2rem; font-size:2.2rem;">Salão dos Heróis</h2>
            ${listHtml}
            <div style="margin-top:3rem; padding-top:2rem; border-top:1px solid rgba(255,255,255,0.1);">
                <button class="btn btn-primary" onclick="startCharacterCreation()" style="padding:0.8rem 2rem; font-size:1.1rem; box-shadow: 0 0 15px rgba(241,196,15,0.3);"><i class="fas fa-plus" style="margin-right:5px;"></i> Forjar Novo Herói</button>
            </div>
        </div>
    `;

    // Attach event listeners for the "Jogar Ficha" buttons to bypass JSON HTML quote issues
    document.querySelectorAll('.sheet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cId = parseInt(e.currentTarget.getAttribute('data-char-id'));
            const character = chars.find(c => c.id === cId);
            if (character) {
                openCharacterSheet(character);
            }
        });
    });

    // Load campaigns for dropdowns
    const unassigned = chars.filter(c => !c.session_id);
    if (unassigned.length > 0) {
        apiCall('character.php?action=campaigns').then(res => {
            unassigned.forEach(c => {
                const sel = document.getElementById(`char-session-select-${c.id}`);
                if (sel) {
                    if (res.campaigns && res.campaigns.length > 0) {
                        sel.innerHTML = '<option value="">-- Selecione a Campanha --</option>' +
                            res.campaigns.map(camp => `<option value="${camp.id}">${camp.name}</option>`).join('');
                    } else {
                        sel.innerHTML = '<option value="">Nenhuma campanha online.</option>';
                        sel.disabled = true;
                    }
                }
            });
        }).catch(err => console.error("Could not fetch campaigns for selection:", err));
    }
};

window.openCharacterSheet = function (char) {
    const container = document.getElementById('player-dynamic-area');
    renderCharacterSheet(char, container);
};

window.startCharacterCreation = function () {
    // Reset wizard state to defaults to prevent dirty state bleed-over
    wizardState = {
        name: '',
        class: 'Guerreiro',
        subclass: '',
        ancestry: 'Humano',
        community: 'Aristocrática',
        attributes: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
        experiences: [{ name: '', value: 2 }, { name: '', value: 1 }],
        domain_cards: [],
        potion: 'Vida',
        weapon: 'Espada Longa',
        armor: 'Nenhuma / Roupas',
        gold: 1,
        roleplay_answers: ['', '']
    };
    const container = document.getElementById('player-dynamic-area');
    renderCharacterWizard(container);
};

window.deleteCharacter = async function (charId) {
    if (!confirm("Tem certeza que deseja apagar permanentemente este herói? Essa ação é vitalícia.")) return;
    try {
        await apiCall('character.php?action=delete', 'POST', { character_id: charId });
        initPlayerView(); // Reload selection
    } catch (e) {
        alert("Erro ao excluir herói: " + e.message);
    }
};

// ================= WIZARD (8 STEPS) ================= //
function renderCharacterWizard(container) {
    container.innerHTML = `
        <div class="wizard-container glass-panel" style="padding: 2rem; max-width:1000px; margin: 0 auto; display:flex; flex-direction:column; height: 90vh;">
            <div style="position:relative; text-align:center; flex-shrink: 0;">
                <button class="btn btn-outline" onclick="initPlayerView()" style="position:absolute; left:0; top:0; padding:0.4rem 1rem;"><i class="fas fa-arrow-left" style="margin-right:5px;"></i> Voltar</button>
                <h2 style="font-family:'Crimson Text', serif; font-size:2rem; color:var(--accent-gold); margin-bottom:1rem;">Criação de Personagem Daggerheart</h2>
            </div>
            <div id="wizard-progress" style="text-align:center; color:var(--text-muted); margin-bottom:1rem; font-size:0.9rem; flex-shrink: 0;"></div>
            
            <div id="wizard-step-content" style="overflow-y:auto; flex-grow:1; padding-right:1rem; padding-bottom:1rem; border-bottom: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(255,255,255,0.1); padding-top:1rem;"></div>
            
            <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; gap:1rem; flex-shrink: 0;">
                <button id="wiz-prev" class="btn btn-outline" style="display:none; width: 150px;">Anterior</button>
                <button id="wiz-next" class="btn btn-primary" style="width: 150px;">Próximo</button>
            </div>
        </div>
    `;
    let currentStep = 1;
    const maxSteps = 8;

    const updateStep = () => {
        document.getElementById('wiz-progress').innerText = `Passo ${currentStep} de ${maxSteps}`;
        document.getElementById('wiz-prev').style.display = currentStep > 1 ? 'block' : 'none';
        document.getElementById('wiz-next').textContent = currentStep === maxSteps ? 'Forjar Herói' : 'Próximo';

        const content = document.getElementById('wizard-step-content');
        if (currentStep === 1) content.innerHTML = step1HTML();
        else if (currentStep === 2) content.innerHTML = step2HTML();
        else if (currentStep === 3) content.innerHTML = step3HTML();
        else if (currentStep === 4) content.innerHTML = step4HTML();
        else if (currentStep === 5) content.innerHTML = step5HTML_Domains();
        else if (currentStep === 6) content.innerHTML = step6HTML_Equipment();
        else if (currentStep === 7) content.innerHTML = step7HTML_Roleplay();
        else if (currentStep === 8) content.innerHTML = step8HTML_Review();

        attachStepListeners(currentStep);
    };

    document.getElementById('wiz-next').addEventListener('click', async () => {
        saveStepData(currentStep);

        // Validation for Attributes
        if (currentStep === 3) {
            const vals = Object.values(wizardState.attributes).sort((a, b) => b - a);
            const valid = vals[0] === 2 && vals[1] === 1 && vals[2] === 1 && vals[3] === 0 && vals[4] === 0 && vals[5] === -1;
            if (!valid) {
                alert('A distribuição de atributos deve ser matematicamente: +2, +1, +1, 0, 0, -1.');
                return;
            }
        }

        // Validation for Domain Cards
        if (currentStep === 5) {
            if (wizardState.domain_cards.length !== 2) {
                alert(`Você selecionou ${wizardState.domain_cards.length} cartas de domínio. As regras exigem selecionar exatamente 2 cartas no Nível 1 para progredir.`);
                return;
            }
        }

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

    // Initialize subclass if missing
    if (!DH_CLASSES_DATA[wizardState.class]) wizardState.class = 'Guerreiro';
    let subs = Object.keys(DH_CLASSES_DATA[wizardState.class].subclasses);
    if (!subs.includes(wizardState.subclass)) {
        wizardState.subclass = subs[0];
    }

    // Safety check div progress id fix
    setTimeout(() => { document.getElementById('wizard-progress').id = 'wiz-progress'; updateStep(); }, 10);

}

// STEP 1: CLASS SELECTION (Visual Cards)
function step1HTML() {
    let html = `
        <h3>Passo 1: Nome e Classe</h3>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Escolha seu chamado lendário. Cada Classe em Daggerheart determina o quão duro você bate, os dados que joga e o destino final do seu punhal.</p>
        <div class="input-group" style="margin-bottom:2rem;">
            <label>Qual o nome deste novo Herói?</label>
            <input type="text" id="wiz-name" value="${wizardState.name}" placeholder="Ex: Ryloth">
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem;">
    `;

    for (const [cName, cData] of Object.entries(DH_CLASSES_DATA)) {
        html += `
            <div class="glass-panel wiz-class-card ${wizardState.class === cName ? 'selected' : ''}" data-val="${cName}" style="padding:1rem; cursor:pointer; border:1px solid ${wizardState.class === cName ? 'var(--accent-gold)' : 'var(--glass-border)'}; display:flex; flex-direction:column;">
                <div style="font-family:'Crimson Text', serif; font-size:1.5rem; font-weight:bold; color:var(--accent-gold); margin-bottom:0.5rem; text-align:center;">${cName}</div>
                <div style="font-size:0.8rem; margin-bottom:0.5rem; text-align:center; color:#e78c3c;">Domínios: <b>${cData.domains.join(' & ')}</b></div>
                <div style="font-size:0.85rem; line-height:1.4; flex-grow:1; max-height:130px; overflow-y:auto; padding-right:5px; margin-bottom:1rem;">
                    ${cData.text}
                </div>
                <div style="font-size:0.8rem; background: rgba(52,152,219, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #3498db; margin-bottom:0.5rem;">
                    <b style="color:var(--accent-gold); display:block; margin-bottom:0.2rem;">${cData.class_feat_name}:</b> ${cData.class_feat_desc}
                </div>
                <div style="font-size:0.8rem; background: rgba(231,140,60, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #e78c3c;">
                    <b style="color:var(--accent-gold); display:block; margin-bottom:0.2rem;">${cData.hope_feat_name} (3 Esperança):</b> ${cData.hope_feat_desc}
                </div>
            </div>
        `;
    }
    html += `</div>`;
    return html;
}

// STEP 2: HERITAGE & SUBCLASS
function step2HTML() {
    let ancHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1rem; margin-bottom:2rem; max-height: 400px; overflow-y:auto; padding-right:10px;">`;
    for (const [aName, aData] of Object.entries(DH_ANCESTRIES_DATA)) {
        ancHtml += `
            <div class="glass-panel wiz-ancestry-card ${wizardState.ancestry === aName ? 'selected' : ''}" data-val="${aName}" style="padding:1rem; cursor:pointer; border:1px solid ${wizardState.ancestry === aName ? '#e78c3c' : 'var(--glass-border)'}">
                <div style="font-weight:bold; font-size: 1.2rem; color:#e78c3c; margin-bottom:0.5rem; border-bottom: 1px solid rgba(231,140,60,0.3); padding-bottom: 0.3rem;">${aName}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4; margin-bottom:0.8rem;">${aData.text}</div>
                <div style="font-size:0.8rem; background: rgba(231,140,60, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #e78c3c;">
                    <b style="color:white; display:block; margin-bottom:0.2rem;">Vantagem:</b> ${aData.trait}
                </div>
            </div>
        `;
    }
    ancHtml += `</div>`;

    let comHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1rem; margin-bottom:2rem; max-height: 400px; overflow-y:auto; padding-right:10px;">`;
    for (const [cName, cData] of Object.entries(DH_COMMUNITIES_DATA)) {
        comHtml += `
            <div class="glass-panel wiz-com-card ${wizardState.community === cName ? 'selected' : ''}" data-val="${cName}" style="padding:1rem; cursor:pointer; border:1px solid ${wizardState.community === cName ? '#3498db' : 'var(--glass-border)'}">
                <div style="font-weight:bold; font-size: 1.2rem; color:#3498db; margin-bottom:0.5rem; border-bottom: 1px solid rgba(52,152,219,0.3); padding-bottom: 0.3rem;">${cName}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4; margin-bottom:0.8rem;">${cData.text}</div>
                <div style="font-size:0.8rem; background: rgba(52,152,219, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #3498db;">
                    <b style="color:white; display:block; margin-bottom:0.2rem;">Benefício:</b> ${cData.trait}
                </div>
            </div>
        `;
    }
    comHtml += `</div>`;

    let subHtml = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">`;
    const subclassesObj = DH_CLASSES_DATA[wizardState.class].subclasses;
    for (const [sName, sData] of Object.entries(subclassesObj)) {
        subHtml += `
            <div class="glass-panel wiz-sub-card ${wizardState.subclass === sName ? 'selected' : ''}" data-val="${sName}" style="padding:1.5rem; cursor:pointer; border:1px solid ${wizardState.subclass === sName ? 'var(--accent-gold)' : 'var(--glass-border)'}; text-align:left; display:flex; flex-direction:column;">
                <div style="font-family:'Crimson Text', serif; font-size:1.3rem; color:var(--accent-gold); margin-bottom:0.5rem; text-align:center; font-weight:bold;">${sName}</div>
                <div style="font-size:0.85rem; line-height:1.4; margin-bottom:1rem; color:var(--text-muted); text-align:center;">${sData.text}</div>
                
                <div style="font-size:0.8rem; background: rgba(46,204,113, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #2ecc71; margin-bottom:0.5rem;">
                    <b style="color:#2ecc71; display:block; margin-bottom:0.1rem;">Nível 1 (Fundamental):</b> ${sData.fundamental}
                </div>
                <div style="font-size:0.8rem; background: rgba(52,152,219, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #3498db; margin-bottom:0.5rem;">
                    <b style="color:#3498db; display:block; margin-bottom:0.1rem;">Nível 5 (Especialização):</b> ${sData.especializacao}
                </div>
                <div style="font-size:0.8rem; background: rgba(155,89,182, 0.1); padding: 0.5rem; border-radius: 4px; border-left: 2px solid #9b59b6;">
                    <b style="color:#9b59b6; display:block; margin-bottom:0.1rem;">Nível 8 (Maestria):</b> ${sData.maestria}
                </div>
            </div>
        `;
    }
    subHtml += `</div>`;

    return `
        <h3>Passo 2: Herança e Subclasse</h3>
        <p style="margin-bottom:1rem;">Sua herança cultural dita como o mundo te enxerga inicialmente.</p>
        
        <h4 style="color:#e78c3c; margin-bottom:0.5rem;">Ancestralidade (Biologia)</h4>
        ${ancHtml}
        
        <h4 style="color:#3498db; margin-bottom:0.5rem;">Comunidade (Criação)</h4>
        ${comHtml}
        
        <h4 style="color:var(--accent-gold); margin-bottom:0.5rem;">Fundação da Classe (Subclasse de ${wizardState.class})</h4>
        ${subHtml}
    `;
}

// STEP 3: ATTRIBUTES (Unchanged Logic, added instructions)
function step3HTML() {
    const attrs = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
    const pBR = { agility: 'Agilidade', strength: 'Força', finesse: 'Destreza (Finesse)', instinct: 'Instinto', presence: 'Presença', knowledge: 'Conhecimento' };

    let html = `<h3>Passo 3: Distribuição de Atributos</h3>
    <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">
        No Nível 1, todo Herói de Daggerheart tem os EXATOS mesmos modificadores biológicos para espalhar.<br>
        Preencha as caixas rigorosamente com os valores: <b style="color:var(--accent-gold);">+2, +1, +1, 0, 0, -1</b>
    </p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
    `;
    attrs.forEach(a => {
        html += `
        <div class="input-group">
            <label>${pBR[a]}</label>
            <input type="number" class="wiz-attr" data-attr="${a}" value="${wizardState.attributes[a]}" min="-1" max="2" step="1" style="font-size:1.2rem; text-align:center;">
        </div>`;
    });
    html += `</div>`;
    return html;
}

// STEP 4: EXPERIENCES
function step4HTML() {
    return `
        <h3>Passo 4: Traços de Experiência</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1.5rem;">
            Daggerheart não usa 'perícias' fixas (como Furtividade ou Atletismo). Em vez disso, você invoca o seu passado! Escreva frases curtas que representam os talentos que seu herói adquiriu na sua vida única. Cuidado, o Mestre pode vetar se for apelão demais!
        </p>
        <div class="input-group" style="margin-bottom:2rem;">
            <label>Experiência Principal (Modificador Fixo de +2 na rolagem de 2d12)</label>
            <input type="text" id="wiz-exp1" value="${wizardState.experiences[0].name}" placeholder="Ex: Acrobata da Corte, Assassino Focado, Botânico Aprendiz">
        </div>
        <div class="input-group">
            <label>Experiência Secundária (Modificador Fixo de +1 na rolagem de 2d12)</label>
            <input type="text" id="wiz-exp2" value="${wizardState.experiences[1].name}" placeholder="Ex: Tive um Cachorro Fiel, Olhos de Águia, Intimidação Silenciosa">
        </div>
    `;
}

// STEP 5: DOMAIN CARDS (NEW)
function step5HTML_Domains() {
    const classDomains = DH_CLASSES_DATA[wizardState.class].domains; // Array of 2 strings

    // Filter DH_DOMAIN_CARDS_LVL1 based on these two domains
    const availableCards = DH_DOMAIN_CARDS_LVL1.filter(c => classDomains.includes(c.domain));

    let cardsHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1rem;">`;

    availableCards.forEach((c, idx) => {
        const isSelected = wizardState.domain_cards.includes(c.name);
        // Color code based on domain (just visual flair)
        const dColor = c.domain === classDomains[0] ? '#9b59b6' : '#2ecc71';

        cardsHtml += `
            <div class="glass-panel wiz-domain-card ${isSelected ? 'selected' : ''}" data-val="${c.name}" style="padding:1rem; cursor:pointer; border:1px solid ${isSelected ? dColor : 'var(--glass-border)'}; box-shadow: ${isSelected ? '0 0 10px ' + dColor : 'none'};">
                <div style="font-size:0.8rem; color:${dColor}; text-transform:uppercase; font-weight:bold;">Domínio: ${c.domain}</div>
                <div style="font-family:'Crimson Text', serif; font-size:1.3rem; font-weight:bold; color:var(--accent-gold); margin:0.3rem 0;">${c.name}</div>
                <div style="font-size:0.75rem; color:#e74c3c; margin-bottom:0.8rem;">[${c.type}]</div>
                <div style="font-size:0.85rem; line-height:1.4;">${c.desc}</div>
            </div>
        `;
    });
    cardsHtml += `</div>`;

    return `
        <h3>Passo 5: Magias e Habilidades (Cartas de Domínio)</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">
            A classe <b>${wizardState.class}</b> te dá acesso total a dois baralhos de magia e técnicas: <b>${classDomains[0]}</b> e <b>${classDomains[1]}</b>.
        </p>
        <p style="font-size:1rem; color:#e78c3c; font-weight:bold; margin-bottom:1.5rem;">
            Selecione EXATAMENTE 2 cartas abaixo para compor seu leque de truques no Nível 1:
        </p>
        <div style="text-align:center; font-weight:bold; margin-bottom:1rem; color:var(--accent-gold);">
            Cartas selecionadas: <span id="domain-count-display">${wizardState.domain_cards.length}</span> / 2
        </div>
        ${cardsHtml}
    `;
}

// STEP 6: EQUIPMENT (Visual Cards)
function step6HTML_Equipment() {
    let wHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">`;
    for (let w in INVENTORY_ITEMS.weapons) {
        let i = INVENTORY_ITEMS.weapons[w];
        wHtml += `
            <div class="glass-panel wiz-weapon-card ${wizardState.weapon === w ? 'selected' : ''}" data-val="${w}" style="padding:1rem; cursor:pointer; border:1px solid ${wizardState.weapon === w ? 'var(--accent-gold)' : 'var(--glass-border)'}; text-align:left;">
                <div style="font-weight:bold; color:var(--accent-gold);">${w}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">${i.type} (${i.slots} slot${i.slots > 1 ? 's' : ''})</div>
                <div style="font-size:0.85rem;">Ataca usando magia de <b>${i.attr}</b></div>
                <div style="font-size:0.85rem;">Dano ao Acertar: <b>${i.damage}</b></div>
                <div style="font-size:0.75rem; margin-top:0.4rem; color:var(--text-muted);"><i>${i.traits}</i></div>
            </div>
        `;
    }
    wHtml += `</div>`;

    let aHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">`;
    for (let a in INVENTORY_ITEMS.armors) {
        let i = INVENTORY_ITEMS.armors[a];
        aHtml += `
            <div class="glass-panel wiz-armor-card ${wizardState.armor === a ? 'selected' : ''}" data-val="${a}" style="padding:1rem; cursor:pointer; border:1px solid ${wizardState.armor === a ? 'var(--accent-gold)' : 'var(--glass-border)'}; text-align:left;">
                <div style="font-weight:bold; color:#e78c3c;">${a}</div>
                <div style="font-size:0.85rem; margin-top:0.5rem;">Pontos de Armadura: <b>${i.armor_base}</b></div>
                <div style="font-size:0.85rem; color:${i.evasion_mod < 0 ? '#e74c3c' : 'var(--text-muted)'}">Penalidade de Peso (Evasão): <b>${i.evasion_mod}</b></div>
                <div style="font-size:0.75rem; margin-top:0.4rem; color:var(--text-muted);"><i>${i.traits}</i></div>
            </div>
        `;
    }
    aHtml += `</div>`;

    return `
        <h3>Passo 6: Equipamento Inicial</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">
            Armazene sua bolsa! Você tem direito a <b>1 Punhado de Ouro</b> passivo, 1 Tocha, Corda e Suprimentos.
        </p>
        <div class="input-group" style="margin-bottom:2rem;">
            <label>Escolha sua Poção Gratuita:</label>
            <select id="wiz-potion" style="font-size:1.1rem; padding:0.5rem;">
                <option value="Vida" ${wizardState.potion === 'Vida' ? 'selected' : ''}>Poção de Vida Menor (+1d4 Pontos de Vida)</option>
                <option value="Vigor" ${wizardState.potion === 'Vigor' ? 'selected' : ''}>Poção de Vigor Menor (+1d4 Pontos de Estresse)</option>
            </select>
        </div>
        
        <label style="display:block; text-align:left; font-weight:bold; margin-bottom:0.8rem; font-size:1.2rem;">Armas (Patamar 1)</label>
        ${wHtml}
        
        <label style="display:block; text-align:left; font-weight:bold; margin-bottom:0.8rem; color:#e78c3c; font-size:1.2rem;">Armaduras (Patamar 1)</label>
        ${aHtml}
    `;
}

// STEP 7: ROLEPLAY (NEW)
function step7HTML_Roleplay() {
    const rpObj = DH_CLASSES_DATA[wizardState.class].roleplay_questions;
    return `
        <h3>Passo 7: Conexões e Antecedentes</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1.5rem;">
            As regras de fundação do livro demandam que você defina ligações para facilitar o Roleplay e as Ganchos de Trama do Mestre. Responda às duas perguntas abaixo geradas pela sua classe (${wizardState.class})!
        </p>
        <div class="input-group" style="margin-bottom:2rem;">
            <label style="color:#e78c3c;">Pergunta 1: ${rpObj[0]}</label>
            <textarea id="wiz-rp1" style="width:100%; height:80px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--glass-border); padding:0.5rem; resize:none;">${wizardState.roleplay_answers[0]}</textarea>
        </div>
        <div class="input-group" style="margin-bottom:2rem;">
            <label style="color:#3498db;">Pergunta 2: ${rpObj[1]}</label>
            <textarea id="wiz-rp2" style="width:100%; height:80px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--glass-border); padding:0.5rem; resize:none;">${wizardState.roleplay_answers[1]}</textarea>
        </div>
        <hr style="border-color:rgba(255,255,255,0.1); margin-bottom: 2rem;">
        <h4 style="color:#9b59b6; margin-bottom:0.5rem;">Segredos Obscuros</h4>
        <div class="input-group">
            <label style="color:var(--text-muted);">Informação do jogador para o mestre (Opcional). Escreva aqui motivações secretas, traumas, roubos ou intenções que os outros jogadores na mesa não devem saber ainda.</label>
            <textarea id="wiz-secret" style="width:100%; height:120px; background:rgba(155, 89, 182, 0.05); color:white; border:1px solid var(--glass-border); padding:0.5rem; resize:none;">${wizardState.secret_note}</textarea>
        </div>
    `;
}

// STEP 8: REVIEW
function step8HTML_Review() {
    const clsEvasion = 8; // simplified fallback
    const armObj = INVENTORY_ITEMS.armors[wizardState.armor];
    const finalEvasion = clsEvasion + (armObj.evasion_mod || 0);

    return `
        <h3>Passo Último: Assine o Manifesto</h3>
        <p style="font-size:0.9rem; color:var(--accent-gold); margin-bottom:1.5rem;">
            A Forja acabou. Verifique o seu passaporte lendário antes de ser registrado no Banco de Dados para a sessão do seu GM.
        </p>
        <div style="background:rgba(0,0,0,0.6); padding: 1.5rem; border-radius:8px; border:1px solid var(--accent-gold); text-align:left; font-size:1.1rem; line-height: 1.6;">
            <p><b>Herói:</b> <span style="color:#e78c3c">${wizardState.name || 'Sem Nome'}</span></p>
            <p><b>Caminho:</b> ${wizardState.class} - ${wizardState.subclass}</p>
            <p><b>Raízes:</b> ${wizardState.ancestry} da Comunidade ${wizardState.community}</p>
            <p><b>Bolsos Fechados:</b> 1 Ouro, Poção Menor de ${wizardState.potion}, ${wizardState.weapon}, ${wizardState.armor}</p>
            <p><b>Domínios da Mente (${wizardState.domain_cards.length}):</b> ${wizardState.domain_cards.join(' • ')}</p>
            <hr style="border-color:rgba(255,255,255,0.2); margin:1rem 0;">
            <p style="color:#3498db;"><b>Evasão Base:</b> ${finalEvasion} <span style="font-size:0.8rem; color:var(--text-muted);">(Aplicando ${armObj.evasion_mod} de peso da armadura)</span></p>
            <p style="color:#2ecc71;"><b>Pontos de Vida e Esperança:</b> Configurados pelos limites maximos do sistema para a classe e 2 Hope Iniciais!</p>
            <p><b>Armadura Real (PA):</b> ${armObj.armor_base}</p>
        </div>
    `;
}

// ================= WIZARD STATE MANAGEMENT ================= //
function attachStepListeners(step) {
    if (step === 1) {
        document.querySelectorAll('.wiz-class-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-class-card').forEach(c => {
                    c.classList.remove('selected', 'highlight');
                    c.style.borderColor = 'var(--glass-border)';
                });
                const t = e.currentTarget;
                t.classList.add('selected');
                t.style.borderColor = 'var(--accent-gold)';
                wizardState.class = t.dataset.val;

                // Immediately update valid subclasses
                const validSubs = Object.keys(DH_CLASSES_DATA[wizardState.class].subclasses);
                if (!validSubs.includes(wizardState.subclass)) wizardState.subclass = validSubs[0];

                // Reset domain cards safely since domains changed
                wizardState.domain_cards = [];
            });
        });
    } else if (step === 2) {
        document.querySelectorAll('.wiz-ancestry-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-ancestry-card').forEach(c => { c.classList.remove('selected'); c.style.borderColor = 'var(--glass-border)'; });
                e.currentTarget.classList.add('selected'); e.currentTarget.style.borderColor = '#e78c3c';
                wizardState.ancestry = e.currentTarget.dataset.val;
            });
        });
        document.querySelectorAll('.wiz-com-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-com-card').forEach(c => { c.classList.remove('selected'); c.style.borderColor = 'var(--glass-border)'; });
                e.currentTarget.classList.add('selected'); e.currentTarget.style.borderColor = '#3498db';
                wizardState.community = e.currentTarget.dataset.val;
            });
        });
        document.querySelectorAll('.wiz-sub-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-sub-card').forEach(c => { c.classList.remove('selected'); c.style.borderColor = 'var(--glass-border)'; });
                e.currentTarget.classList.add('selected'); e.currentTarget.style.borderColor = 'var(--accent-gold)';
                wizardState.subclass = e.currentTarget.dataset.val;
            });
        });
    } else if (step === 3) {
        document.querySelectorAll('.wiz-attr').forEach(el => {
            el.addEventListener('change', (e) => {
                wizardState.attributes[e.target.dataset.attr] = parseInt(e.target.value) || 0;
            });
        });
    } else if (step === 5) {
        // Domain Cards Multi-Select Logic (Exact 2)
        document.querySelectorAll('.wiz-domain-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const cName = e.currentTarget.dataset.val;
                if (wizardState.domain_cards.includes(cName)) {
                    // Deselect
                    wizardState.domain_cards = wizardState.domain_cards.filter(n => n !== cName);
                    e.currentTarget.classList.remove('selected');
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                } else {
                    // Max 2 Cards Enforced Check silently? We will just let them click but enforce on 'Next'
                    wizardState.domain_cards.push(cName);
                    e.currentTarget.classList.add('selected');
                    e.currentTarget.style.boxShadow = '0 0 10px white';
                    e.currentTarget.style.borderColor = 'white';
                }
                document.getElementById('domain-count-display').innerText = wizardState.domain_cards.length;
            });
        });
    } else if (step === 6) {
        document.querySelectorAll('.wiz-weapon-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-weapon-card').forEach(c => {
                    c.classList.remove('selected');
                    c.style.borderColor = 'var(--glass-border)';
                });
                e.currentTarget.classList.add('selected');
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
                wizardState.weapon = e.currentTarget.dataset.val;
            });
        });
        document.querySelectorAll('.wiz-armor-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.wiz-armor-card').forEach(c => {
                    c.classList.remove('selected');
                    c.style.borderColor = 'var(--glass-border)';
                });
                e.currentTarget.classList.add('selected');
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
                wizardState.armor = e.currentTarget.dataset.val;
            });
        });
    }
}

function saveStepData(step) {
    if (step === 1) {
        wizardState.name = document.getElementById('wiz-name').value;
    } else if (step === 3) {
        document.querySelectorAll('.wiz-attr').forEach(el => {
            wizardState.attributes[el.dataset.attr] = parseInt(el.value) || 0;
        });
    } else if (step === 4) {
        wizardState.experiences[0].name = document.getElementById('wiz-exp1').value;
        wizardState.experiences[1].name = document.getElementById('wiz-exp2').value;
    } else if (step === 6) {
        const pSel = document.getElementById('wiz-potion');
        if (pSel) wizardState.potion = pSel.value;
    } else if (step === 7) {
        wizardState.roleplay_answers[0] = document.getElementById('wiz-rp1').value;
        wizardState.roleplay_answers[1] = document.getElementById('wiz-rp2').value;
        wizardState.secret_note = document.getElementById('wiz-secret').value;
    }
}

// ================= SUBMISSION ================= //
async function submitCharacter() {
    // Basic evasão is 10 + Agility + Armor Mod in DH. Let's use 10 as base. 
    const finalEvasion = 10 + (wizardState.attributes['Agility'] || 0) + (INVENTORY_ITEMS.armors[wizardState.armor].evasion_mod || 0);

    const inv = {
        gold: 1,
        equipped: [
            { name: wizardState.weapon, details: INVENTORY_ITEMS.weapons[wizardState.weapon] },
            { name: wizardState.armor, details: INVENTORY_ITEMS.armors[wizardState.armor] }
        ],
        bag: [
            ...DH_CLASSES_DATA[wizardState.class].items,
            'Tocha', '15m de Corda', 'Suprimentos Básicos', `Poção Menor de ${wizardState.potion}`
        ]
    };

    // Convert array of string names to objects containing full domain card details to save the text into the DB!
    const activeDomainCards = wizardState.domain_cards.map(cName => {
        return DH_DOMAIN_CARDS_LVL1.find(dc => dc.name === cName) || { name: cName, desc: 'Faltando.' };
    });

    const payload = {
        name: wizardState.name || 'Herói Desconhecido',
        class: wizardState.class,
        subclass: wizardState.subclass,
        heritage: `${wizardState.ancestry} / ${wizardState.community}`,
        attributes: wizardState.attributes,
        experiences: wizardState.experiences,
        evasion_base: finalEvasion,
        hp_base: (DH_CLASSES_DATA[wizardState.class]?.hp || 6) + (wizardState.ancestry === 'Gigante' ? 1 : 0),
        armor_base: INVENTORY_ITEMS.armors[wizardState.armor].armor_base,
        inventory: inv,
        cards: activeDomainCards,
        roleplay: wizardState.roleplay_answers, // <--- Passed to backend!
        secret_note: wizardState.secret_note
    };

    try {
        await apiCall('character.php?action=create', 'POST', payload);
        initPlayerView();
    } catch (e) {
        alert('Erro Fatal: ' + e.message);
    }
}

// ---------------------------------------------------------
// Character Sheet Renderer (Basic override text mapping)
// ---------------------------------------------------------
function renderCharacterSheet(char, container) {
    if (!char.attributes) char.attributes = {};
    if (!char.inventory) char.inventory = { equipped: [], bag: [], gold: 0 };
    if (!char.experiences) char.experiences = [];
    if (!char.cards) char.cards = [];


    let expHtml = char.experiences.map(e => `<div style="margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:4px;"><span>${e.name || 'Nenhuma'}</span> <strong style="color:var(--accent-gold); font-size:1.1rem;">+${e.value}</strong></div>`).join('');

    // Gold Formatting Helper (Daggerheart Abstraction)
    const formatGold = (amount) => {
        if (!amount || amount === 0) return '0 (Nenhum trocado)';
        let chests = Math.floor(amount / 100);
        let bags = Math.floor((amount % 100) / 10);
        let handfuls = amount % 10;
        let p = [];
        if (chests > 0) p.push(`${chests} Baú${chests > 1 ? 's' : ''}`);
        if (bags > 0) p.push(`${bags} Saco${bags > 1 ? 's' : ''}`);
        if (handfuls > 0) p.push(`${handfuls} Punhado${handfuls > 1 ? 's' : ''}`);
        return p.join(' e ') + ` <span style="font-size:0.75rem; color:var(--text-muted);">(${amount})</span>`;
    };

    // Attribute Tooltips (Page 19 Daggerheart Rules)
    const attrDescs = {
        'Agility': { name: 'Agilidade', text: 'Correr, Equilibrar-se, Saltar.<br><br>Uma Agilidade alta significa que você é ágil, veloz e reage rápido frente ao perigo. Você faz testes de Agilidade para escalar um muro, correr em direção de cobertura ou saltar de telhado em telhado.' },
        'Strength': { name: 'Força', text: 'Agarrar, Levantar, Quebrar.<br><br>Uma Força alta significa que você se sai melhor em situações que envolvam potência física e vigor. Você faz testes de Força para arrombar uma porta, erguer objetos ou manter sua posição frente à investida de um oponente.' },
        'Finesse': { name: 'Acuidade', text: 'Esconder-se, Manipular, Manobrar.<br><br>Uma Acuidade alta significa que você leva jeito com tarefas que exigem precisão, esmero ou sutileza. Você faz testes de Acuidade para usar ferramentas delicadas, evitar ser percebido ou desferir um golpe mirado.' },
        'Instinct': { name: 'Instinto', text: 'Perceber, Pressentir, Orientar.<br><br>Um Instinto alto significa que você tem uma percepção apurada de seus arredores e uma intuição natural. Você faz testes de Instinto para notar detalhes ao seu redor, pressentir o perigo ou encontrar um oponente ardiloso.' },
        'Presence': { name: 'Presença', text: 'Comover, Convencer, Enganar.<br><br>Uma Presença alta significa que você tem personalidade forte e facilidade para situações sociais. Você faz testes de Presença para argumentar, intimidar um oponente ou atrair a atenção de uma multidão.' },
        'Knowledge': { name: 'Conhecimento', text: 'Analisar, Aprender, Lembrar.<br><br>Um Conhecimento alto significa que você tem acesso a informações que outros não têm e sabe como usar a mente para deduzir e inferir algo. Você faz testes de Conhecimento para interpretar fatos, enxergar padrões com clareza ou lembrar-se de informações importantes.' }
    };

    // Attributes
    let attrHtml = `
    <style>
        .attr-box {
            position: relative;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }
        .attr-tooltip {
            visibility: hidden;
            width: 250px;
            background-color: rgba(10, 10, 18, 0.95);
            color: #ddd;
            text-align: left;
            border-radius: 8px;
            padding: 15px;
            position: absolute;
            z-index: 1000;
            bottom: 110%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
            border: 1px solid var(--accent-gold);
            pointer-events: none;
            box-shadow: 0px 4px 15px rgba(0,0,0,0.8);
            font-size: 0.85rem;
            line-height: 1.4;
        }
        .attr-tooltip::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: var(--accent-gold) transparent transparent transparent;
        }
        .attr-box:hover .attr-tooltip,
        .attr-box:active .attr-tooltip,
        .attr-box:focus .attr-tooltip {
            visibility: visible;
            opacity: 1;
        }
    </style>
    `;
    const arr = Object.keys(char.attributes);
    arr.forEach(a => {
        let val = char.attributes[a];
        let short = a.substring(0, 3).toUpperCase();
        let attrInfo = attrDescs[a.charAt(0).toUpperCase() + a.slice(1)] || { name: short, text: '' };
        attrHtml += `
            <div class="attr-box" tabindex="0" ontouchstart="" style="display:flex; flex-direction:column; align-items:center; position:relative; padding-bottom:10px;">
                <div class="attr-tooltip">
                    <strong style="color:var(--accent-gold); font-size:1.1rem; display:block; margin-bottom:8px; text-transform:uppercase; text-align:center; letter-spacing:1px;">${attrInfo.name}</strong>
                    <div style="font-weight:normal; font-family:'Inter', sans-serif;">${attrInfo.text}</div>
                </div>
                <span>${short}<strong style="color:var(--accent-gold); font-size:1.4rem;">${val >= 0 ? '+' + val : val}</strong></span>
                <div style="font-size:0.75rem; margin-top:5px; color:#3498db; display:flex; align-items:center; justify-content:center; gap:5px;">
                    <button class="btn btn-sm" onclick="this.nextElementSibling.innerText=parseInt(this.nextElementSibling.innerText)-1" style="padding:0; width:20px; text-align:center;">-</button>
                    <span style="font-weight:bold; width:20px; text-align:center;">0</span>
                    <button class="btn btn-sm" onclick="this.previousElementSibling.innerText=parseInt(this.previousElementSibling.innerText)+1" style="padding:0; width:20px; text-align:center;">+</button>
                </div>
            </div>
        `;
    });

    // Basic Inventory
    let invHtml = `<div style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; background:rgba(241,196,15,0.1); padding:0.8rem; border-left:3px solid #f1c40f; border-radius:4px;">
        <span style="font-weight:bold;">Ouro Carregado:</span>
        <span style="display:flex; align-items:center; gap:0.5rem;">
            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'gold', -1)" style="padding:0.2rem 0.5rem;">-</button>
            <span style="color:#f1c40f;font-weight:bold; width: 120px; text-align: center;">${char.inventory.gold || 0}g <br><span style="font-size:0.65rem">${formatGold(char.inventory.gold)}</span></span>
            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'gold', 1)" style="padding:0.2rem 0.5rem;">+</button>
        </span>
    </div>
    <p style="color:var(--accent-gold); font-weight:bold; margin-bottom:0.5rem;">Carga Equipada:</p>
    <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">`;

    if (char.inventory.equipped.length) {
        char.inventory.equipped.forEach(i => {
            const detailsStr = encodeURIComponent(JSON.stringify(i));
            invHtml += `<button class="btn btn-primary" onclick="showItemDetails('${detailsStr}')" style="padding:0.5rem 1rem; font-size:0.85rem;"><i class="fas fa-hand-holding-medical" style="margin-right:5px;"></i> ${i.name}</button>`;
        });
    }

    // Backpack addition interface
    invHtml += `</div><p><strong>Mochila:</strong></p>
    <ul id="backpack-list-${char.id}" style="list-style:none; padding:0; margin-bottom:1rem;">`;
    if (char.inventory.bag && char.inventory.bag.length) {
        char.inventory.bag.forEach((i, idx) => invHtml += `
            <li style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span><i class="fas fa-caret-right" style="color:var(--text-muted); font-size:0.8rem; margin-right:5px;"></i> ${i}</span>
                <span style="color:#e74c3c; cursor:pointer;" onclick="removeItem(${char.id}, ${idx})"><i class="fas fa-times"></i></span>
            </li>`);
    }
    invHtml += `</ul>
    <div style="display:flex; gap:0.5rem;">
        <input type="text" id="add-item-input-${char.id}" placeholder="Novo item..." style="flex-grow:1; padding:0.4rem; background:rgba(0,0,0,0.5); border:1px solid var(--glass-border); color:white; border-radius:4px;">
        <button class="btn btn-sm" onclick="addItem(${char.id})" style="background:#2ecc71; color:white; border:none; padding:0 1rem;">Add</button>
    </div>`;

    // Cards
    let cardsHtml = '';
    char.cards.forEach(c => {
        cardsHtml += `
            <div style="background:rgba(255,255,255,0.05); padding:1rem; border-left:4px solid var(--accent-gold); margin-bottom:1rem;">
                <div style="font-weight:bold; font-size:1.1rem; color:var(--accent-gold);">${c.name}</div>
                <div style="font-size:0.8rem; color:#e74c3c; margin-bottom:0.5rem;">[${c.type}]</div>
                <div style="font-size:0.9rem;">${c.desc}</div>
            </div>
        `;
    });

    // Campaign Linking HTML (Moved to Top)
    const campaignLinkHtml = char.session_id
        ? `<div style="text-align:center; padding:0.5rem; background: rgba(52, 152, 219, 0.1); border-radius:4px; border:1px solid #3498db; margin-top:1rem;">
                <strong style="font-size:1.1rem; color:#3498db;">Ligado à Campanha: ${char.session_name}</strong>
            </div>`
        : `<div id="campaign-join-block" style="text-align:center; padding:1rem; background: rgba(52, 152, 219, 0.05); border:1px solid rgba(52, 152, 219, 0.5); border-radius:4px; margin-top:1rem;">
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.8rem;">Indisponível para rolar com outros nativamente. Junte-se a uma campanha:</p>
                <div style="display:flex; gap:0.5rem; justify-content:center; align-items:center;">
                <select id="char-session-select-${char.id}" style="padding:0.4rem; background:rgba(0,0,0,0.5); color:white; border:1px solid #3498db; border-radius:4px; flex-grow:1;">
                    <option value="">Procurando...</option>
                </select>
                <button class="btn btn-primary" onclick="joinCampaign(${char.id})" style="background:#3498db; color:white; border:none; padding:0.4rem 1rem;">Entrar</button>
                </div>
            </div>`;

    container.innerHTML = `
        <div class="sheet-grid">
            <div class="sheet-col">
                <div class="glass-panel sheet-section" style="text-align: center; position:relative;">
                    <div style="position:absolute; top:1rem; left:1rem; cursor:pointer; color:var(--text-muted); font-size:1.5rem;" onclick="initPlayerView()" title="Voltar para Seleção de Heróis">
                        <i class="fas fa-arrow-left"></i>
                    </div>
                    <h2 style="color: var(--accent-gold); margin-bottom: 0.5rem; margin-top:0.5rem;">${char.name}</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        Level ${char.level} ${char.class} (${char.subclass}) - ${char.heritage}
                    </p>
                    ${campaignLinkHtml}
                </div>
                <div class="glass-panel sheet-section">
                    <h3>Atributos <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(Mod Temporário)</span></h3>
                    <div class="attr-grid">${attrHtml}</div>
                </div>
                <div class="glass-panel sheet-section">
                    <h3>Experiências</h3>
                    ${expHtml}
                </div>
                <div class="glass-panel sheet-section" style="margin-top: 2rem;">
                    <h3 style="color:var(--accent-gold);">Inventário e Carga</h3>
                    ${invHtml}
                </div>
            </div>
            
            <div class="sheet-col">
                <div class="glass-panel sheet-section">
                    <h3>Recursos Combatíveis</h3>
                    <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:1.5rem; margin-top:1rem; text-align:center;">
                        <!-- Evasion Shield -->
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <div style="font-size:0.8rem; font-weight:bold; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.3rem;">Evasão</div>
                            <div style="position:relative; width:70px; height:80px; background:rgba(0,0,0,0.5); border:2px solid var(--accent-gold); clip-path: polygon(50% 0%, 100% 20%, 100% 70%, 50% 100%, 0% 70%, 0% 20%); display:flex; align-items:center; justify-content:center; flex-direction:column; box-shadow: 0 0 10px rgba(241,196,15,0.2) inset;">
                                <span style="font-size:2rem; font-weight:bold; color:var(--accent-gold); text-shadow: 0 0 8px rgba(241,196,15,0.5);">${char.evasion_current_override ?? char.evasion_base}</span>
                            </div>
                            <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'evasion_current_override', -1)" style="padding:0 0.5rem; font-weight:bold;">-</button>
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'evasion_current_override', 1)" style="padding:0 0.5rem; font-weight:bold;">+</button>
                            </div>
                        </div>

                        <!-- Armor Diamond -->
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <div style="font-size:0.8rem; font-weight:bold; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.3rem;">Armadura</div>
                            <div style="position:relative; width:80px; height:80px; background:rgba(0,0,0,0.5); border:2px solid #e78c3c; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); display:flex; align-items:center; justify-content:center; flex-direction:column; box-shadow: 0 0 10px rgba(231,140,60,0.2) inset;">
                                <span style="font-size:2rem; font-weight:bold; color:#e78c3c; text-shadow: 0 0 8px rgba(231,140,60,0.5);">${char.armor_base_override ?? char.armor_base}</span>
                            </div>
                            <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'armor_base_override', -1)" style="padding:0 0.5rem; font-weight:bold;">-</button>
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'armor_base_override', 1)" style="padding:0 0.5rem; font-weight:bold;">+</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="resource-row">
                        <span>Slots de Armadura Usados</span>
                        <span style="display:flex; align-items:center; gap:0.5rem;">
                            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'armor_slots', -1)" style="padding:0 0.4rem; font-size:0.8rem">-</button>
                            <span class="res-val" style="color:#e78c3c;">${char.armor_slots} / ${char.armor_base_override ?? char.armor_base}</span>
                            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'armor_slots', 1, ${char.armor_base_override ?? char.armor_base})" style="padding:0 0.4rem; font-size:0.8rem">+</button>
                        </span>
                    </div>
                    
                    <hr style="border-color:rgba(255,255,255,0.1); margin:1.5rem 0;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-weight:bold; color:var(--accent-gold); display:flex; align-items:center; gap:0.5rem;">
                            Pontos de Vida (PV): ${char.hp_current} / ${char.hp_base} MAX
                            <span style="display:inline-flex; gap:0.3rem;">
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'hp_current', -1, ${char.hp_base})" style="padding:0 0.4rem; font-size:0.75rem;">-</button>
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'hp_current', 1, ${char.hp_base})" style="padding:0 0.4rem; font-size:0.75rem;">+</button>
                            </span>
                        </span>
                        <div class="pv-circles" style="cursor:pointer;" title="Clique esquerdo para adicionar PV, direito para diminuir" oncontextmenu="event.preventDefault(); updateResource(${char.id}, 'hp_current', -1, ${char.hp_base});" onclick="updateResource(${char.id}, 'hp_current', 1, ${char.hp_base})">
                            ${Array.from({ length: char.hp_base }, (_, i) => `<div class="pv-circle ${i < char.hp_current ? 'filled' : ''}"></div>`).join('')}
                        </div>
                    </div>
                    
                    <!-- NEW DAMAGE THRESHOLDS -->
                    <div style="margin-bottom: 1.5rem; background:rgba(231,76,60,0.1); padding:0.8rem; border-radius:4px; border:1px solid rgba(231,76,60,0.3);">
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem; text-align:center;">LIMIARES DE DANO DA CLASSE</div>
                        <div style="display:flex; justify-content:space-around; text-align:center;">
                            <div><b style="color:#95a5a6;">Menor</b><br><span style="font-size:1.2rem;">${DH_CLASSES_DATA[char.class]?.thresholds[0] || '?'}</span></div>
                            <div><b style="color:#e67e22;">Maior</b><br><span style="font-size:1.2rem;">${DH_CLASSES_DATA[char.class]?.thresholds[1] || '?'}</span></div>
                            <div><b style="color:#e74c3c;">Severo</b><br><span style="font-size:1.2rem;">${DH_CLASSES_DATA[char.class]?.thresholds[2] || '?'}</span></div>
                        </div>
                    </div>

                    <div class="resource-row">
                        <span style="font-weight:bold; color:#3498db;">Esperança (Hope)</span>
                        <span style="display:flex; align-items:center; gap:0.5rem;">
                            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'hope_current', -1)" style="padding:0 0.4rem; font-size:0.8rem">-</button>
                            <span class="res-val" style="color:#3498db;">${char.hope_current} / 6</span>
                            <button class="btn btn-sm" onclick="updateResource(${char.id}, 'hope_current', 1, 6)" style="padding:0 0.4rem; font-size:0.8rem">+</button>
                        </span>
                    </div>
                    <div class="resource-row">
                        <span style="font-weight:bold; color:#e74c3c; display:flex; align-items:center; gap:0.5rem;">
                            Fadiga (Stress)
                            <span style="display:inline-flex; gap:0.3rem;">
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'stress_current', -1, 5)" style="padding:0 0.4rem; font-size:0.75rem;">-</button>
                                <button class="btn btn-sm" onclick="updateResource(${char.id}, 'stress_current', 1, 5)" style="padding:0 0.4rem; font-size:0.75rem;">+</button>
                            </span>
                        </span>
                        <div class="pv-circles" style="cursor:pointer;" title="Clique esquerdo para adicionar Stress, direito para diminuir" oncontextmenu="event.preventDefault(); updateResource(${char.id}, 'stress_current', -1, 5);" onclick="updateResource(${char.id}, 'stress_current', 1, 5)">
                           ${Array.from({ length: 5 }, (_, i) => `<div class="pv-circle stress-circle ${i < char.stress_current ? 'filled-stress' : ''}"></div>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel sheet-section" style="margin-top:2rem;">
                    <h3 style="color:var(--accent-gold);">Habilidades e Sangue</h3>
                    <div style="background:rgba(231,140,60,0.1); padding:0.8rem; border-left:3px solid #e78c3c; margin-bottom:1rem; border-radius:4px;">
                        <div style="font-weight:bold; font-size:1rem; color:#e78c3c; margin-bottom:0.2rem;">Ato de Esperança: ${DH_CLASSES_DATA[char.class]?.hope_feat_name || 'Desconhecido'}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${DH_CLASSES_DATA[char.class]?.hope_feat_desc || ''}</div>
                    </div>
                    <div style="background:rgba(52,152,219,0.1); padding:0.8rem; border-left:3px solid #3498db; margin-bottom:1rem; border-radius:4px;">
                        <div style="font-weight:bold; font-size:1rem; color:#3498db; margin-bottom:0.2rem;">Habilidade da Classe: ${DH_CLASSES_DATA[char.class]?.class_feat_name || 'Desconhecido'}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${DH_CLASSES_DATA[char.class]?.class_feat_desc || ''}</div>
                    </div>
                    <h4 style="color:#2ecc71; margin-bottom:0.5rem; border-bottom:1px solid rgba(46,204,113,0.3); padding-bottom:5px;">Caminho de ${char.subclass}</h4>
                    <div style="font-size:0.85rem; background:rgba(46,204,113,0.05); padding:0.8rem; border-radius:4px; margin-bottom:0.5rem;">
                        <b style="color:#2ecc71;">Nível 1 (Fundamental):</b> ${DH_CLASSES_DATA[char.class]?.subclasses[char.subclass]?.fundamental || ''}
                    </div>
                    <div style="font-size:0.85rem; background:rgba(46,204,113,0.05); padding:0.8rem; border-radius:4px; margin-bottom:0.5rem;">
                        <b style="color:#2ecc71;">Nível 5 (Especialização):</b> <span style="color:var(--text-muted);">(${char.level >= 5 ? 'Desbloqueado' : 'Bloqueado'})</span> ${DH_CLASSES_DATA[char.class]?.subclasses[char.subclass]?.especializacao || ''}
                    </div>
                    <div style="font-size:0.85rem; background:rgba(46,204,113,0.05); padding:0.8rem; border-radius:4px; margin-bottom:1rem;">
                        <b style="color:#2ecc71;">Nível 8 (Maestria):</b> <span style="color:var(--text-muted);">(${char.level >= 8 ? 'Desbloqueado' : 'Bloqueado'})</span> ${DH_CLASSES_DATA[char.class]?.subclasses[char.subclass]?.maestria || ''}
                    </div>
                </div>

                <div class="glass-panel sheet-section" style="margin-top:2rem;">
                    <h3 style="color:#9b59b6;">Passado, Ligações e Segredos</h3>
                    <div style="background:rgba(255,255,255,0.05); padding:1rem; border-left:4px solid #e78c3c; margin-bottom:1rem;">
                        <div style="font-weight:bold; font-size:0.95rem; color:#e78c3c; margin-bottom:0.3rem;">Pergunta 1</div>
                        <div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">${char.roleplay_answers[0] || 'Sem dados'}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:1rem; border-left:4px solid #3498db; margin-bottom:1rem;">
                        <div style="font-weight:bold; font-size:0.95rem; color:#3498db; margin-bottom:0.3rem;">Pergunta 2</div>
                        <div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">${char.roleplay_answers[1] || 'Sem dados'}</div>
                    </div>
                    ${char.secret_note ? `
                    <div style="background:rgba(0,0,0,0.4); padding:1rem; border:1px dashed #9b59b6; margin-bottom:1rem; border-radius:4px;">
                        <div style="font-weight:bold; font-size:1rem; color:#9b59b6; margin-bottom:0.5rem;"><i class="fas fa-user-secret"></i> Apenas o Mestre Sabe...</div>
                        <div style="font-size:0.9rem; color:#dcdcdc;">${char.secret_note}</div>
                    </div>
                    ` : ''}
                </div>

                <div class="glass-panel sheet-section" style="margin-top:2rem;">
                    <h3 style="color:#3498db;">Deck de Domínio Ativo</h3>
                    ${char.cards.length ? cardsHtml : '<p style="color:var(--text-muted);">Nenhuma carta ativa.</p>'}
                </div>
            </div>
        </div>
    `;

    // Fetch campaigns dynamically if player needs to join
    if (!char.session_id) {
        apiCall('character.php?action=campaigns').then(res => {
            const sel = document.getElementById(`char-session-select-${char.id}`);
            if (sel) {
                if (res.campaigns && res.campaigns.length > 0) {
                    sel.innerHTML = '<option value="">-- Selecione a Campanha --</option>' +
                        res.campaigns.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                } else {
                    sel.innerHTML = '<option value="">Nenhuma campanha aberta...</option>';
                    sel.disabled = true;
                }
            }
        }).catch(err => console.error("Could not fetch campaigns:", err));
    }
}


// -------------------------------------------------------------
// Interactive Inventory Modal (Player View)
// -------------------------------------------------------------
window.showItemDetails = function (encodedItem) {
    const item = JSON.parse(decodeURIComponent(encodedItem));
    const d = item.details || {};

    // Check if modal container exists, if not create it
    let modal = document.getElementById('dh-item-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dh-item-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
            z-index: 10000; font-family: 'DM Sans', sans-serif;
        `;
        document.body.appendChild(modal);
    }

    let contentHtml = '';
    if (d.type === 'Melee' || d.type === 'Ranged' || d.type === 'Magic') {
        contentHtml = `
            <div style="color:var(--accent-gold); font-size:0.9rem; margin-bottom:1rem; text-transform:uppercase; tracking:2px;">Arma // ${d.type}</div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Dano:</b> <span style="color:#e74c3c; font-weight:bold;">${d.dmg}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Mãos Ocupadas:</b> <span>${d.hands}</span>
            </div>
            ${d.range ? `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Alcance:</b> <span>${d.range}</span>
            </div>` : ''}
            <div style="margin-top:1rem; padding:0.8rem; background:rgba(255,255,255,0.05); border-radius:4px;">
                <b style="color:#3498db; display:block; margin-bottom:0.3rem;">Traços Especiais:</b>
                <span style="font-size:0.85rem; color:var(--text-muted);">${d.traits || 'Nenhum'}</span>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="color:#e78c3c; font-size:0.9rem; margin-bottom:1rem; text-transform:uppercase; tracking:2px;">Armadura</div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Valor Base da Armadura:</b> <span style="color:#e78c3c; font-weight:bold;">${d.armor_base}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Slots Máximos para Riscar:</b> <span>${d.armor_base}</span>
            </div>
            ${d.evasion_mod ? `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                <b>Modificador de Evasão:</b> <span style="color:var(--accent-gold); font-weight:bold;">${d.evasion_mod > 0 ? '+' + d.evasion_mod : d.evasion_mod}</span>
            </div>` : ''}
            <div style="margin-top:1rem; padding:0.8rem; background:rgba(255,255,255,0.05); border-radius:4px;">
                <b style="color:#3498db; display:block; margin-bottom:0.3rem;">Regras de Defesa:</b>
                <span style="font-size:0.85rem; color:var(--text-muted);">Quando atingido por um dano, você pode riscar um dos ${d.armor_base} slots disponíveis para bloquear ${d.armor_base} de dano instantaneamente. Evasão Base impacta quão difícil você é de ser acertado passivamente.</span>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="glass-panel" style="width: 400px; max-width: 90%; position: relative; padding: 2rem;">
            <button onclick="document.getElementById('dh-item-modal').style.display='none'" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
            <h2 style="font-family:'Crimson Text', serif; margin-bottom:0.5rem; text-align:center;">${item.name}</h2>
            ${contentHtml}
        </div>
    `;
    modal.style.display = 'flex';
};

// -------------------------------------------------------------
// Core Interactive Handlers
// -------------------------------------------------------------
window.addItem = async function (charId) {
    const el = document.getElementById(`add-item-input-${charId}`);
    if (el && el.value.trim().length > 0) {
        await updateResource(charId, 'add_bag', el.value.trim());
        el.value = '';
    }
};

window.removeItem = async function (charId, idx) {
    if (confirm("Deseja remover este item da mochila?")) {
        await updateResource(charId, 'remove_bag', idx);
    }
};

window.updateResource = async function (charId, field, valueDelta, maxLimit) {
    if (valueDelta > 0 && maxLimit !== undefined) {
        // Optional client side max limit checking
    }
    try {
        const res = await apiCall('character.php?action=update_resource', 'POST', {
            character_id: charId,
            field: field,
            value: valueDelta,
            max_limit: maxLimit
        });
        if (res.message) {
            // Re-fetch the fresh character from the backend to ensure accurate state
            const charRefreshed = await apiCall(`character.php?action=get_player_character&id=${charId}`);
            if (charRefreshed && !charRefreshed.error) {
                openCharacterSheet(charRefreshed);
            }
        } else if (res.error) {
            alert(res.error);
        }
    } catch (e) {
        alert('Erro ao atualizar recurso: ' + e.message);
    }
};

window.joinCampaign = async function (charId) {
    const sil = document.getElementById(`char-session-select-${charId}`);
    if (!sil || !sil.value) {
        alert("Por favor, selecione uma campanha na lista.");
        return;
    }

    try {
        const res = await apiCall('character.php?action=join_session', 'POST', {
            character_id: charId,
            session_id: sil.value
        });
        if (res.message) {
            alert('Campanha vinculada com sucesso! Aguarde o Mestre iniciar.');
            initPlayerView();
        }
    } catch (e) {
        alert('Falha ao entrar na campanha: ' + e.message);
    }
};

// -------------------------------------------------------------
// Core Initialization Call
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initPlayerView();
});
