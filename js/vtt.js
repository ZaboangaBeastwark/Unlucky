// js/vtt.js

const vtt = {
    state: {
        role: 'jogador',
        activeSessionId: null,
        scene: null,
        tokens: [],
        selectedToken: null,
        isGM: false,
        gridEnabled: true,
        snapToGrid: true,
        isPanning: false,
        isPingMode: false,
        currentSceneId: null, // Scene currently being viewed by the user
        camera: {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1
        }
    },

    async init() {
        console.log('Iniciando VTT...');
        try {
            const sessionResp = await apiRequest('auth.php', 'GET', null, { action: 'me' });
            this.state.role = sessionResp.user ? sessionResp.user.role : 'jogador';
            this.state.isGM = this.state.role === 'gm';

            this.onTokenDragBind = this.onTokenDrag.bind(this);
            this.onTokenEndDragBind = this.onTokenEndDrag.bind(this);

            if (this.state.isGM) {
                const gmPanel = document.getElementById('gm-panel');
                if (gmPanel) gmPanel.style.display = 'flex';
                document.querySelectorAll('.gm-only').forEach(el => el.style.display = 'flex');
                await this.fetchBestiaryAndCharacters();
                this.setupDropZone();
            }

            await this.loadSceneData();
            if (this.state.isGM) {
                await this.autoSpawnPlayers();
            }
            this.setupEventListeners();
            this.setupCanvasEvents();
            this.updateTracker();
            this.startPolling();
            this.render();
        } catch (e) {
            console.error('Erro na inicialização do VTT', e);
            // Even if init fails, we WANT shortcuts and listeners for navigation/recovery
            this.setupEventListeners();
            this.setupCanvasEvents();
        }
    },

    async loadSceneData(sceneId = null) {
        try {
            const params = { action: 'get_scene' };
            if (sceneId) params.id = sceneId;
            else if (this.state.currentSceneId) params.id = this.state.currentSceneId;

            const data = await apiRequest('vtt.php', 'GET', null, params);

            if (!this.state.isGM && data.scene && data.scene.id !== this.state.currentSceneId) {
                this.state.currentSceneId = data.scene.id;
            } else if (this.state.isGM && !this.state.currentSceneId && data.scene) {
                this.state.currentSceneId = data.scene.id;
            }

            this.state.scene = data.scene;
            this.state.tokens = data.tokens || [];

            if (this.state.isGM && data.all_scenes) {
                this.renderSceneList(data.all_scenes);
            }

            this.updateBackground();
            this.drawGrid();
            this.renderTokens();
        } catch (e) {
            console.warn('Erro no carregamento da cena:', e);
        }
    },

    updateBroadcastStatus() {
        if (!this.state.isGM) return;
        const btn = document.getElementById('btn-broadcast-scene');
        if (!btn) return;
        const isActive = this.state.scene && parseInt(this.state.scene.is_active) === 1;
        btn.style.display = (this.state.scene && !isActive) ? 'flex' : 'none';
        const indicator = document.getElementById('preview-indicator');
        if (indicator) indicator.style.display = (this.state.scene && !isActive) ? 'block' : 'none';
    },

    updateBackground() {
        const bgLayer = document.getElementById('vtt-background-layer');
        if (!bgLayer) return;
        if (!this.state.scene || !this.state.scene.background_url) {
            bgLayer.innerHTML = '<div style="width:2000px; height:2000px; background:#0a0a0c;"></div>';
            return;
        }

        const url = this.state.scene.background_url;
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
            if (videoId) {
                bgLayer.innerHTML = `<iframe class="vtt-background" width="2000" height="1125" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                return;
            }
        }

        if (url.endsWith('.mp4') || url.endsWith('.webm')) {
            bgLayer.innerHTML = `<video src="${url}" autoplay loop muted class="vtt-background"></video>`;
        } else {
            bgLayer.innerHTML = `<img src="${url}" class="vtt-background" />`;
        }
    },

    renderTokens() {
        const layer = document.getElementById('vtt-token-layer');
        if (!layer) return;

        const urlParams = new URLSearchParams(window.location.search);
        this.state.viewMode = urlParams.get('view') || 'standard';

        if (this.state.viewMode === 'display') {
            document.body.classList.add('display-mode');
            const uiElements = ['.vtt-ui', '#gm-panel', '#vtt-controls', '#vtt-tracker', '.vtt-btn.glass-panel'];
            uiElements.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.style.display = 'none';
            });
        }

        const currentTokenIds = this.state.tokens.map(t => t.id.toString());
        Array.from(layer.children).forEach(el => {
            if (!currentTokenIds.includes(el.dataset.id)) el.remove();
        });

        this.state.tokens.forEach(token => {
            let el = layer.querySelector(`[data-id="${token.id}"]`);
            if (!el) {
                el = document.createElement('div');
                el.className = 'vtt-token';
                el.dataset.id = token.id;
                layer.appendChild(el);

                this.onTokenDragBind = this.onTokenDrag.bind(this);
                this.onTokenEndDragBind = this.onTokenEndDrag.bind(this);

                el.addEventListener('mousedown', (e) => this.onTokenStartDrag(e, token));
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.state.selectedTokenId = token.id;
                    this.renderTokens();
                });
            }

            const name = token.char_name || token.adv_name || token.name || 'Desconhecido';
            const avatar = token.char_avatar || token.adv_avatar || token.image_url || 'https://via.placeholder.com/60';
            const hp = parseInt(token.char_hp ?? token.adv_hp ?? 100);
            const hpMax = parseInt(token.char_hp_max ?? token.adv_hp_max ?? 100);
            const hpPercent = (hp / hpMax) * 100;
            const scale = parseFloat(token.scale) || 1.0;
            const size = 60 * scale;

            const isDead = hp <= 0;
            const isLow = hpPercent <= 25 && hp > 0;

            el.style.left = `${token.pos_x}px`;
            el.style.top = `${token.pos_y}px`;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.classList.toggle('selected', this.state.selectedTokenId == token.id);
            el.classList.toggle('hidden-token', token.is_hidden == 1);
            el.classList.toggle('low-health', isLow);
            el.classList.toggle('dead-token', isDead);

            el.innerHTML = `
                <div class="token-container">
                    <img src="${avatar}" alt="${name}">
                    ${token.is_hidden == 1 ? '<div class="hidden-icon"><i class="fa-solid fa-eye-slash"></i></div>' : ''}
                    <div class="token-label">${name}</div>
                    <div class="health-overlay"></div>
                </div>
            `;

            // Health Visuals
            const healthOverlay = el.querySelector('.health-overlay');
            if (healthOverlay) {
                healthOverlay.style.width = `${hpPercent}%`;
                healthOverlay.classList.toggle('critical-health', hpPercent <= 30 && hp > 0);
                healthOverlay.classList.toggle('dead', hp <= 0);
            }
        });

        // Toggle do painel de controle de token (apenas GM)
        const tokenControls = document.getElementById('vtt-token-controls');
        if (tokenControls && this.state.isGM) {
            const selectedToken = this.state.tokens.find(t => t.id == this.state.selectedTokenId);
            if (selectedToken) {
                tokenControls.style.display = 'flex';
                const nameEl = document.getElementById('selected-token-name');
                if (nameEl) nameEl.textContent = selectedToken.char_name || selectedToken.adv_name || selectedToken.name;
            } else {
                tokenControls.style.display = 'none';
            }
        }
    },

    setupDropZone() {
        const container = document.getElementById('vtt-container');
        if (!container) return;

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!this.state.scene) return;

            // Coordenadas considerando Zoom e Pan
            const rect = container.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.state.camera.x) / this.state.camera.zoom;
            const y = (e.clientY - rect.top - this.state.camera.y) / this.state.camera.zoom;

            try {
                const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                if (!rawData) return;

                let data;
                try {
                    data = JSON.parse(rawData);
                } catch (e) {
                    // Se não for JSON, pode ser apenas uma URL arrastada
                    return;
                }
                const { type, id, name, image } = data;

                await apiRequest('vtt.php', 'POST', {
                    action: 'add_token',
                    scene_id: this.state.scene.id,
                    character_id: (type === 'pc') ? id : null,
                    adversary_id: (type === 'enemy') ? id : null,
                    name: name,
                    image_url: image,
                    pos_x: Math.round(x),
                    pos_y: Math.round(y)
                });
                this.loadSceneData();
            } catch (err) {
                console.error("Drop Data Error:", err);
            }
        });
    },

    async autoSpawnPlayers() {
        if (!this.state.isGM || !this.state.scene) return;
        const data = await apiRequest('gm.php', 'GET', null, { action: 'session_data_live' });
        const existingCharIds = this.state.tokens.map(t => t.character_id).filter(id => id);

        for (const char of data.characters) {
            if (!existingCharIds.includes(char.id)) {
                await apiRequest('vtt.php', 'POST', {
                    action: 'add_token',
                    scene_id: this.state.scene.id,
                    character_id: char.id,
                    pos_x: 200 + (existingCharIds.length * 60),
                    pos_y: 200
                });
            }
        }
        this.loadSceneData();
    },

    onTokenStartDrag(e, token) {
        if (e.button !== 0) return;
        e.stopPropagation(); // Previne o movimento do mapa ao arrastar o token
        if (!this.state.isGM && token.character_id === null) return; // Jogadores só movem seus tokens

        this.state.selectedToken = {
            id: token.id,
            el: e.currentTarget,
            offsetX: e.clientX,
            offsetY: e.clientY,
            startX: token.pos_x,
            startY: token.pos_y
        };
        this.state.selectedTokenId = token.id;
        this.renderTokens();

        this.onTokenDragBind = this.onTokenDrag.bind(this);
        this.onTokenEndDragBind = this.onTokenEndDrag.bind(this);

        document.addEventListener('mousemove', this.onTokenDragBind);
        document.addEventListener('mouseup', this.onTokenEndDragBind);
    },

    onTokenDrag(e) {
        if (!this.state.selectedToken) return;
        const drag = this.state.selectedToken;
        const deltaX = (e.clientX - drag.offsetX) / this.state.camera.zoom;
        const deltaY = (e.clientY - drag.offsetY) / this.state.camera.zoom;

        let newX = drag.startX + deltaX;
        let newY = drag.startY + deltaY;

        if (this.state.snapToGrid) {
            const size = this.state.scene?.grid_size || 50;
            newX = Math.round(newX / size) * size;
            newY = Math.round(newY / size) * size;
        }

        drag.el.style.left = `${newX}px`;
        drag.el.style.top = `${newY}px`;

        // Update local state IMMEDIATELY to prevent polling snaps
        const tokenInState = this.state.tokens.find(t => t.id == drag.id);
        if (tokenInState) {
            tokenInState.pos_x = newX;
            tokenInState.pos_y = newY;
        }

        this.updateRuler(drag.startX, drag.startY, newX, newY);
    },

    async onTokenEndDrag(e) {
        if (!this.state.selectedToken) return;
        const drag = this.state.selectedToken;
        const newX = parseInt(drag.el.style.left);
        const newY = parseInt(drag.el.style.top);

        const ruler = document.getElementById('vtt-ruler');
        if (ruler) ruler.style.display = 'none';

        // Update state one last time
        const tokenInState = this.state.tokens.find(t => t.id == drag.id);
        if (tokenInState) {
            tokenInState.pos_x = newX;
            tokenInState.pos_y = newY;
        }

        try {
            await apiRequest('vtt.php', 'POST', {
                action: 'update_token_pos',
                id: drag.id,
                pos_x: newX,
                pos_y: newY
            });
        } catch (err) {
            console.error('Falha ao sincronizar posição do token');
        }

        this.state.selectedToken = null;
        this.renderTokens();
        document.removeEventListener('mousemove', this.onTokenDragBind);
        document.removeEventListener('mouseup', this.onTokenEndDragBind);
    },

    updateRuler(x1, y1, x2, y2) {
        const ruler = document.getElementById('vtt-ruler');
        if (!ruler) return;
        const size = this.state.scene?.grid_size || 50;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distGrid = Math.round(distPx / size);

        // Daggerheart Range Categories
        let rangeLabel = '';
        if (distGrid <= 1) rangeLabel = '🏠 Melee/Very Near';
        else if (distGrid <= 4) rangeLabel = '🏃 Near';
        else if (distGrid <= 10) rangeLabel = '🏹 Far';
        else rangeLabel = '🌌 Very Far';

        ruler.style.display = 'block';
        ruler.style.left = `${x1 + (size / 2)}px`;
        ruler.style.top = `${y1 + (size / 2)}px`;
        ruler.style.width = `${distPx}px`;
        ruler.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
        ruler.setAttribute('data-dist', `${distGrid} un (${rangeLabel})`);
    },

    setupEventListeners() {
        const container = document.getElementById('vtt-container');
        if (!container) return;
        container.addEventListener('mousedown', (e) => {
            const isToken = e.target.closest('.vtt-token');
            if (e.button === 1 || (e.button === 0 && !isToken)) {
                this.state.isPanning = true;
                this.state.lastMouseX = e.clientX;
                this.state.lastMouseY = e.clientY;
                container.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        // Wheel para Zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const oldZoom = this.state.camera.zoom;
            this.state.camera.zoom *= delta;
            this.state.camera.zoom = Math.min(Math.max(this.state.camera.zoom, 0.2), 3);
            this.render();
        }, { passive: false });

        // Clique no Fundo para Desmarcar
        container.addEventListener('click', (e) => {
            if (!e.target.closest('.vtt-token')) {
                this.state.selectedTokenId = null;
                this.renderTokens();
            }
        });

        // Eventos Globais (Window)
        window.addEventListener('mousemove', (e) => {
            this.state.currentMouseX = e.clientX;
            this.state.currentMouseY = e.clientY;

            if (this.state.isPanning) {
                const dx = e.clientX - this.state.lastMouseX;
                const dy = e.clientY - this.state.lastMouseY;
                this.state.camera.x += dx;
                this.state.camera.y += dy;
                this.state.lastMouseX = e.clientX;
                this.state.lastMouseY = e.clientY;
                this.render();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.state.isPanning) {
                this.state.isPanning = false;
                container.style.cursor = 'grab';
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();

            if (key === 'g') {
                e.preventDefault();
                this.toggleGrid();
            }
            if (e.code === 'Space') {
                if (!this.state.isPanning) {
                    this.state.lastMouseX = this.state.currentMouseX || 0;
                    this.state.lastMouseY = this.state.currentMouseY || 0;
                }
                this.state.isPanning = true;
                container.style.cursor = 'grabbing';
            }

            // Atalhos para Token Selecionado
            if (this.state.selectedTokenId) {
                if (key === 'v') this.toggleTokenVisibility(this.state.selectedTokenId);
                if (key === 'delete' || key === 'backspace') this.deleteToken(this.state.selectedTokenId);
                if (key === '+' || key === '=') this.updateTokenScale(this.state.selectedTokenId, 0.1);
                if (key === '-' || key === '_') this.updateTokenScale(this.state.selectedTokenId, -0.1);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.state.isPanning = false;
                container.style.cursor = 'grab';
            }
        });
    },

    toggleGrid() {
        this.state.gridEnabled = !this.state.gridEnabled;
        const grid = document.getElementById('vtt-grid');
        if (grid) grid.style.display = this.state.gridEnabled ? 'block' : 'none';
        const btn = document.getElementById('btn-grid-toggle');
        if (btn) btn.classList.toggle('active', this.state.gridEnabled);
    },

    drawGrid() {
        const canvas = document.getElementById('vtt-grid');
        if (!canvas) return;
        const size = this.state.scene?.grid_size || 50;
        const color = this.state.scene?.grid_color || 'rgba(255,255,255,0.1)';

        canvas.width = 4000;
        canvas.height = 4000;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += size) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += size) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    },

    render() {
        const board = document.getElementById('vtt-board');
        if (board) {
            board.style.transform = `translate(${this.state.camera.x}px, ${this.state.camera.y}px) scale(${this.state.camera.zoom})`;
        }
    },

    startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => {
            if (!this.state.selectedToken && !this.state.isPanning) {
                this.loadSceneData();
                if (this.state.isGM) this.fetchBestiaryAndCharacters();
            }
        }, 3000);
    },

    renderSceneList(scenes) {
        const list = document.getElementById('scene-list');
        if (!list) return;

        list.innerHTML = scenes.map(s => {
            const isViewing = this.state.scene && this.state.scene.id === s.id;
            const isActive = parseInt(s.is_active) === 1;

            return `
                <div class="glass-panel scene-item ${isViewing ? 'viewing' : ''} ${isActive ? 'active' : ''}" 
                     onclick="vtt.loadScene(${s.id})"
                     style="padding:10px 15px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-map" style="opacity:0.6; font-size:0.9rem;"></i>
                        <span style="font-size:0.85rem; font-weight:600; color:var(--vtt-text);">${s.name}</span>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${isActive ? '<i class="fa-solid fa-eye" title="Visível para Jogadores" style="color:var(--vtt-accent); font-size:0.8rem;"></i>' : '<i class="fa-solid fa-eye-slash" style="opacity:0.2; font-size:0.8rem;"></i>'}
                        <button class="vtt-btn" onclick="event.stopPropagation(); vtt.deleteScene(${s.id})" 
                                style="padding:4px 8px; background:rgba(255,77,77,0.1); border:1px solid rgba(255,77,77,0.2); color:#ff4d4d; border-radius:6px; font-size:0.7rem;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadScene(id) {
        this.state.currentSceneId = id;
        await this.loadSceneData(id);
    },

    async deleteScene(id) {
        if (!confirm('Tem certeza que deseja deletar esta cena? ')) return;
        try {
            const resp = await apiRequest('vtt.php', 'POST', { action: 'delete_scene', id: id });
            if (resp.error) throw new Error(resp.error);
            if (this.state.currentSceneId == id) {
                this.state.currentSceneId = null;
                await this.init();
            } else {
                await this.loadSceneData();
            }
        } catch (e) {
            alert("Erro ao deletar: " + e.message);
        }
    },

    async broadcastCurrentScene() {
        if (!this.state.scene || !this.state.isGM) return;
        try {
            await apiRequest('vtt.php', 'POST', { action: 'toggle_scene', id: this.state.scene.id });
            await this.loadSceneData();
        } catch (e) {
            alert("Erro ao transmitir: " + e.message);
        }
    },

    async fetchBestiaryAndCharacters() {
        if (!this.state.isGM) return;
        const data = await apiRequest('gm.php', 'GET', null, { action: 'session_data_live' });
        this.state.adversaries = data.adversaries || [];
        this.state.characters = data.characters || [];
        this.renderLibrary();
        this.renderTokens();
    },

    renderLibrary() {
        const bestiaryGrid = document.getElementById('beastiary-drag');
        if (!bestiaryGrid) return;
        bestiaryGrid.innerHTML = '';

        if (this.state.characters) {
            this.state.characters.forEach(char => {
                const item = document.createElement('div');
                item.className = 'bestiary-item pc-item';
                item.draggable = true;
                item.dataset.type = 'pc';
                item.dataset.id = char.id;
                item.dataset.name = char.name;
                item.dataset.image = char.avatar || 'https://via.placeholder.com/60';
                item.innerHTML = `
                    <img src="${item.dataset.image}" alt="${char.name}">
                    <div class="name">${char.name}</div>
                `;
                item.addEventListener('dragstart', (e) => this.onBestiaryDrag(e));
                item.addEventListener('dblclick', () => this.addTokenFromLibrary('pc', char.id, char.name, item.dataset.image));
                bestiaryGrid.appendChild(item);
            });
        }

        if (this.state.adversaries) {
            this.state.adversaries.forEach(adv => {
                const item = document.createElement('div');
                item.className = 'bestiary-item';
                item.draggable = true;
                item.dataset.type = 'enemy';
                item.dataset.id = adv.id;
                item.dataset.name = adv.name;
                item.dataset.image = adv.token || adv.avatar || 'https://via.placeholder.com/60';
                item.innerHTML = `
                    <img src="${item.dataset.image}" alt="${adv.name}">
                    <div class="name">${adv.name}</div>
                `;
                item.addEventListener('dragstart', (e) => this.onBestiaryDrag(e));
                item.addEventListener('dblclick', () => this.addTokenFromLibrary('enemy', adv.id, adv.name, item.dataset.image));
                bestiaryGrid.appendChild(item);
            });
        }
    },

    async addTokenFromLibrary(type, id, name, image) {
        if (!this.state.scene) {
            console.error("Cena não carregada. Não é possível adicionar token.");
            return;
        }

        console.log(`Adicionando token da biblioteca: ${name} (${type})`);

        const container = document.getElementById('vtt-container');
        const rect = container.getBoundingClientRect();

        // Calcular o centro visível do VTT em coordenadas do board (compensando zoom e pan)
        const viewportX = rect.width / 2;
        const viewportY = rect.height / 2;

        const x = Math.round((viewportX - this.state.camera.x) / this.state.camera.zoom);
        const y = Math.round((viewportY - this.state.camera.y) / this.state.camera.zoom);

        console.log(`Coordenadas calculadas para o centro: x=${x}, y=${y}`);

        try {
            await apiRequest('vtt.php', 'POST', {
                action: 'add_token',
                scene_id: this.state.scene.id,
                character_id: (type === 'pc') ? id : null,
                adversary_id: (type === 'enemy') ? id : null,
                name: name,
                image_url: image,
                pos_x: x,
                pos_y: y
            });
            this.loadSceneData();
        } catch (err) {
            console.error("Erro ao adicionar token via biblioteca:", err);
            alert("Erro ao adicionar token. Verifique o console.");
        }
    },

    onBestiaryDrag(e) {
        const { type, id, name, image } = e.currentTarget.dataset;
        const data = JSON.stringify({ type, id, name, image });
        e.dataTransfer.setData('application/json', data);
        e.dataTransfer.setData('text/plain', data);
    },

    updateTracker() {
        const tracker = document.getElementById('action-tracker-display');
        if (!tracker) return;
        let html = '';
        for (let i = 0; i < 5; i++) {
            html += `<i class="fa-solid fa-circle tracker-dot" style="cursor:pointer; color:#aaa;" onclick="this.style.color = (this.style.color === 'rgb(170, 170, 170)') ? 'var(--vtt-accent)' : '#aaa'"></i>`;
        }
        tracker.innerHTML = html;
    },

    setupCanvasEvents() {
        const container = document.getElementById('vtt-container');
        if (!container) return;
        container.addEventListener('click', (e) => {
            if (e.altKey) this.spawnPing(e.clientX, e.clientY);
        });
    },

    async deleteToken(id) {
        if (!this.state.isGM) return;
        if (!confirm('Deletar token?')) return;
        await apiRequest('vtt.php', 'POST', { action: 'delete_token', id });
        this.loadSceneData();
    },

    async toggleTokenVisibility(id) {
        if (!this.state.isGM) return;
        const token = this.state.tokens.find(t => t.id == id);
        if (!token) return;
        const newValue = token.is_hidden == 1 ? 0 : 1;
        await apiRequest('vtt.php', 'POST', { action: 'update_token_meta', id, field: 'is_hidden', value: newValue });
        this.loadSceneData();
    },

    async updateTokenScale(id, delta) {
        if (!this.state.isGM) return;
        const token = this.state.tokens.find(t => t.id == id);
        if (!token) return;
        let newScale = (parseFloat(token.scale) || 1.0) + delta;
        newScale = Math.min(Math.max(newScale, 0.5), 5.0);
        await apiRequest('vtt.php', 'POST', { action: 'update_token_meta', id, field: 'scale', value: newScale });
        this.loadSceneData();
    },

    spawnPing(x, y) {
        const ping = document.createElement('div');
        ping.style.position = 'fixed';
        ping.style.left = `${x}px`;
        ping.style.top = `${y}px`;
        ping.style.width = '20px';
        ping.style.height = '20px';
        ping.style.border = '2px solid var(--vtt-accent)';
        ping.style.borderRadius = '50%';
        ping.style.transform = 'translate(-50%, -50%)';
        ping.style.pointerEvents = 'none';
        ping.style.zIndex = '1000';
        document.body.appendChild(ping);

        ping.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(4)', opacity: 0 }
        ], { duration: 1000, easing: 'ease-out' }).onfinish = () => ping.remove();
    },

    // --- Scene Management ---
    openSceneModal() {
        const modal = document.getElementById('scene-modal');
        if (!modal) return;

        document.getElementById('scene-name').value = '';
        document.getElementById('scene-bg').value = '';
        document.getElementById('scene-active').checked = true;

        modal.style.display = 'flex';
    },

    async saveScene() {
        const name = document.getElementById('scene-name').value;
        const bg = document.getElementById('scene-bg').value;
        const isActive = document.getElementById('scene-active').checked;

        if (!name) {
            alert('Por favor, insira um nome para a cena.');
            return;
        }

        try {
            const resp = await apiRequest('vtt.php', 'POST', {
                action: 'create_scene',
                name: name,
                background_url: bg,
                is_active: isActive
            });

            if (resp.error) throw new Error(resp.error);

            document.getElementById('scene-modal').style.display = 'none';

            // If it's the first scene or we marked it active, load it
            if (isActive || !this.state.currentSceneId) {
                await this.loadScene(resp.id);
            } else {
                await this.loadSceneData();
            }
        } catch (e) {
            alert('Erro ao salvar cena: ' + e.message);
        }
    },

    async uploadBackground(input) {
        if (!input.files || !input.files[0]) return;

        const formData = new FormData();
        formData.append('file', input.files[0]);
        formData.append('action', 'upload_background');

        try {
            // Using direct fetch because apiRequest is JSON-only
            const response = await fetch('api/vtt.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            if (result.url) {
                document.getElementById('scene-bg').value = result.url;
            }
        } catch (e) {
            alert('Erro no upload: ' + e.message);
        } finally {
            input.value = ''; // Reset file input
        }
    }
};

window.vtt = vtt;
document.addEventListener('DOMContentLoaded', () => vtt.init());
