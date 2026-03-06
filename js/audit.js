// js/audit.js

let currentPage = 1;
let currentSessionId = null;
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    // Determine session ID from URL
    const params = new URLSearchParams(window.location.search);
    currentSessionId = params.get('session_id');

    if (!currentSessionId) {
        document.getElementById('audit-list').innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center; color: #e74c3c;">Erro: ID de sessão não especificado.</div>`;
        return;
    }

    // Initial load check to get session name and verify user
    apiCall('auth.php?action=me').then(res => {
        if (!res.user || res.user.role !== 'gm') {
            window.location.href = 'index.html'; // Kick non-GMs out
            return;
        }
        document.getElementById('log-user-name').textContent = res.user.username;
        loadLogs();
    }).catch(e => {
        window.location.href = 'index.html';
    });
});

function debounceFilter() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applyFilters();
    }, 400); // 400ms delay for typing
}

function applyFilters() {
    currentPage = 1; // Reset to page 1 on new filter
    loadLogs();
}

async function loadLogs() {
    const listHtml = document.getElementById('audit-list');

    const searchParams = new URLSearchParams();
    searchParams.append('session_id', currentSessionId);
    searchParams.append('page', currentPage);

    const searchText = document.getElementById('filter-search').value;
    if (searchText) searchParams.append('search', searchText);

    const typeFilter = document.getElementById('filter-type').value;
    if (typeFilter) searchParams.append('type', typeFilter);

    const roleFilter = document.getElementById('filter-role').value;
    if (roleFilter) searchParams.append('role', roleFilter);

    try {
        const res = await apiCall(`audit.php?action=get_logs&${searchParams.toString()}`);

        if (!res.logs || res.logs.length === 0) {
            listHtml.innerHTML = `
                <div style="text-align:center; padding: 3rem 1rem; background:rgba(0,0,0,0.2); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                    <i class="fas fa-clipboard-list" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem;"></i>
                    <h4 style="color:white; margin:0;">Nenhum registro encontrado</h4>
                    <p style="color:var(--text-muted); font-size:0.9rem;">Tente remover os filtros ou faça alterações na campanha para gerar logs.</p>
                </div>
            `;
            document.getElementById('audit-pagination').style.display = 'none';
            return;
        }

        // Only update session name if we have logs to pull it from
        if (res.logs.length > 0 && res.logs[0].session_name) {
            document.getElementById('log-session-name').textContent = res.logs[0].session_name;
        }

        let html = '';
        res.logs.forEach(log => {
            const date = new Date(log.created_at);
            const formattedDate = `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR').slice(0, 5)}`;

            let icon = 'fa-info-circle';
            let color = 'var(--accent-gold)';

            const type = log.action_type || '';
            if (type.includes('Atributos')) { icon = 'fa-fist-raised'; color = '#3498db'; }
            if (type.includes('Inventário')) { icon = 'fa-suitcase'; color = '#e67e22'; }
            if (type.includes('Ouro')) { icon = 'fa-coins'; color = '#f1c40f'; }
            if (type === 'Recurso: PV') { icon = 'fa-heart'; color = '#e74c3c'; }
            if (type === 'Recurso: Estresse') { icon = 'fa-bolt'; color = '#9b59b6'; }
            if (type === 'Recurso: Esperança') { icon = 'fa-star'; color = '#2ecc71'; }
            if (type === 'Recurso: Experiência') { icon = 'fa-trophy'; color = '#f39c12'; }
            if (type.includes('Armadura') || type.includes('Evasão')) { icon = 'fa-shield-alt'; color = '#7f8c8d'; }
            if (type.includes('Criação de Personagem')) { icon = 'fa-user-plus'; color = '#1abc9c'; }
            if (type === 'status_change') { icon = 'fa-gavel'; color = '#e74c3c'; }

            const badgeRole = (log.user_role === 'gm' || log.user_role === 'mestre') ? 'badge-mestre' : 'badge-jogador';
            const roleName = (log.user_role === 'gm' || log.user_role === 'mestre') ? 'Mestre' : 'Jogador';

            const targetChar = log.character_name ? ` <i class="fas fa-caret-right" style="margin:0 5px; color:#555"></i> <span style="color:var(--accent-gold);">${log.character_name}</span>` : '';

            html += `
                <div class="audit-log-item">
                    <div class="log-icon">
                        <i class="fas ${icon}" style="color:${color}"></i>
                    </div>
                    <div style="flex:1;">
                        <div class="audit-meta">
                            <div>
                                <span class="badge ${badgeRole}">${roleName}</span>
                                <strong style="color:white; margin-left:5px;">${log.actor_name}</strong>
                                ${targetChar}
                            </div>
                            <div>${formattedDate}</div>
                        </div>
                        <div class="audit-desc">${log.description}</div>
                        <div style="font-size: 0.7rem; color:#555; margin-top:5px; text-transform:uppercase;">${log.action_type}</div>
                    </div>
                </div>
            `;
        });

        listHtml.innerHTML = html;
        renderPagination(res.pagination);

    } catch (e) {
        listHtml.innerHTML = `<div style="color:#e74c3c; padding:1rem;">Falha ao carregar os logs de auditoria: ${e.message}</div>`;
    }
}

function renderPagination(pg) {
    const container = document.getElementById('audit-pagination');
    if (pg.total_pages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';

    html += `<button onclick="changePage(${pg.current_page - 1})" ${pg.current_page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Anteriores</button>`;

    for (let i = 1; i <= pg.total_pages; i++) {
        // Show max 5 buttons (skip middle if many pages)
        if (pg.total_pages > 7 && i !== 1 && i !== pg.total_pages && Math.abs(i - pg.current_page) > 2) {
            if (i === 2 || i === pg.total_pages - 1) html += `<span style="color:white; padding:0.5rem;">...</span>`;
            continue;
        }

        html += `<button onclick="changePage(${i})" class="${i === pg.current_page ? 'active' : ''}">${i}</button>`;
    }

    html += `<button onclick="changePage(${pg.current_page + 1})" ${pg.current_page === pg.total_pages ? 'disabled' : ''}>Próximos <i class="fas fa-chevron-right"></i></button>`;

    container.innerHTML = html;
}

window.changePage = function (pageNumber) {
    currentPage = pageNumber;
    loadLogs();
    window.scrollTo(0, 0);
};
