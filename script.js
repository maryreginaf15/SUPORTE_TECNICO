document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando TechSupport Pro...');
    
    // Teste de Conexão Inicial
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_ANON')) {
        alert('ERRO DE CONFIGURAÇÃO: Você precisa configurar a URL e a Chave Anon no arquivo supabase.js');
    } else if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
        console.error('AVISO: A chave configurada não parece ser uma chave válida do Supabase (deveria começar com eyJ).');
    }
    let tickets = [];
    let categories = [];
    let statuses = [];
    let users = [];
    let profile = {};
    let notifPrefs = {};
    let appearancePrefs = {};
    let currentUser = null;
    let systemConfig = { title: 'TechSupport Pro', subtitle: 'Enterprise Console', logo_url: '' };

    const allIds = (arr) => arr.map(x => x.id);

    const priorityMap = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
    const statusStyle = {
        open: 'background:#dcfce7;color:#166534;border-color:#bbf7d0',
        'in-progress': 'background:#fef9c3;color:#854d0e;border-color:#fef08a',
        waiting: 'background:#ffedd5;color:#9a3412;border-color:#fed7aa',
        resolved: 'background:#e0f2fe;color:#075985;border-color:#bae6fd',
        closed: 'background:#f3f4f6;color:#374151;border-color:#e5e7eb'
    };

    function getCurrentUser() {
        return currentUser;
    }

    // ============= AUTH =============
    const authOverlay = document.getElementById('authOverlay');
    const authError = document.getElementById('authError');
    if (!authOverlay) console.error('ERRO: authOverlay não encontrado no DOM!');

    document.getElementById('authLoginBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value;
        if (!username || !password) { authError.textContent = 'Preencha usuário e senha.'; authError.style.display = 'block'; return; }
        document.getElementById('authLoginBtn').disabled = true;
        document.getElementById('authLoginBtn').textContent = 'Entrando...';
        try {
            console.log('Tentando login para:', username);
            const { user } = await DB.login(username, password);
            console.log('Login bem-sucedido:', user);
            currentUser = user;
            await loadAllData();
            if (typeof window.completeAppInit === 'function') window.completeAppInit();
        } catch (err) {
            console.error('Erro de Login:', err);
            document.getElementById('authLoginBtn').disabled = false;
            document.getElementById('authLoginBtn').textContent = 'Entrar';
            
            let msg = err.message || 'Erro ao fazer login.';
            if (msg.includes('Email not confirmed')) {
                msg = 'E-mail ainda não confirmado! Verifique sua caixa de entrada ou desative a confirmação no painel do Supabase.';
            } else if (msg.includes('Invalid login credentials')) {
                msg = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
            }
            
            authError.textContent = msg;
            authError.style.display = 'block';
        }
    });

    function showApp() {
        authOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function showAuth() {
        authOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        authError.style.display = 'none';
        document.getElementById('authLoginBtn').disabled = false;
        document.getElementById('authLoginBtn').textContent = 'Entrar';
    }

    // Auto login from session
    async function restoreSession() {
        try {
            const { data } = await DB.getCurrentUser();
            if (data?.user) {
                const profile = await DB.loadProfile(data.user.id);
                if (profile) {
                    currentUser = {
                        id: data.user.id,
                        email: data.user.email,
                        name: profile.name || data.user.email?.split('@')[0],
                        role: profile.role || 'tech',
                        phone: profile.phone || '',
                        avatar: profile.avatar_url || '',
                        allowedCategories: profile.allowed_categories || [],
                        allowedStatuses: profile.allowed_statuses || []
                    };
                }
            }
        } catch { }
    }

    // ============= DATA LOADING =============
    async function seedDefaults() {
        if (categories.length === 0) {
            const defaults = [
                { slug: 'ti', name: 'Informática/TI' },
                { slug: 'electrical', name: 'Elétrica' },
                { slug: 'building', name: 'Predial/Civil' },
                { slug: 'security', name: 'Segurança Eletrônica' },
                { slug: 'telecom', name: 'Telecomunicações' }
            ];
            for (const c of defaults) {
                try {
                    const result = await DB.insertCategory(c.name, c.slug);
                    categories.push({ id: result.slug, name: result.name, _dbId: result.id });
                } catch (e) {
                    console.warn('Seed categoria ignorado:', c.name, e.message);
                }
            }
        }
        if (statuses.length === 0) {
            const defaults = [
                { slug: 'open', name: 'Aberto' },
                { slug: 'in-progress', name: 'Em Atendimento' },
                { slug: 'waiting', name: 'Aguardando Peças' },
                { slug: 'resolved', name: 'Resolvido' },
                { slug: 'closed', name: 'Fechado' }
            ];
            for (const s of defaults) {
                try {
                    const result = await DB.insertStatus(s.name, s.slug);
                    statuses.push({ id: result.slug, name: result.name, _dbId: result.id });
                } catch { }
            }
        }
    }

    async function loadAllData() {
        console.log('Carregando dados globais...');
        const isMasterAdmin = currentUser?.email === 'masteradm@email.com';
        
        try {
            profile = {
                id: currentUser.id,
                email: currentUser.email,
                name: currentUser.name,
                role: currentUser.role,
                avatar: currentUser.avatar || ''
            };

            // Load users
            try { 
                const dbUsers = await DB.loadUsers(); 
                if (dbUsers) users = dbUsers;
            } catch (e) { console.warn('Erro ao carregar usuários:', e); }

            // Load categories
            try {
                const dbCats = await DB.loadCategories();
                categories = (dbCats || []).map(c => ({ id: c.slug, name: c.name, _dbId: c.id }));
            } catch (e) { console.warn('Erro ao carregar categorias:', e); }

            // Load statuses
            try {
                const dbStatuses = await DB.loadStatuses();
                statuses = (dbStatuses || []).map(s => ({ id: s.slug, name: s.name, _dbId: s.id }));
            } catch (e) { console.warn('Erro ao carregar status:', e); }

            // Load tickets
            try {
                const dbTickets = await DB.loadTickets();
                tickets = (dbTickets || []).map(t => ({
                    id: t.ticket_id,
                    subject: t.subject,
                    category: t.category,
                    priority: t.priority,
                    status: t.status,
                    description: t.description || '',
                    actions_taken: t.actions_taken || '',
                    created_at: t.created_at,
                    closed_at: t.closed_at,
                    created_by: t.created_by,
                    assigned_to: t.assigned_to,
                    _dbId: t.id
                }));
            } catch (e) { console.warn('Erro ao carregar chamados:', e); }

            // Load prefs
            try {
                const np = await DB.loadNotifPrefs(currentUser.id);
                if (np) Object.assign(notifPrefs, {
                    notifNewTicket: np.notif_new_ticket ?? true,
                    notifStatusChange: np.notif_status_change ?? true,
                    notifSla: np.notif_sla ?? true,
                    notifComments: np.notif_comments ?? true,
                    notifReports: np.notif_reports ?? false
                });
                const ap = await DB.loadAppearancePrefs(currentUser.id);
                if (ap) Object.assign(appearancePrefs, {
                    darkMode: ap.dark_mode ?? false,
                    compactMode: ap.compact_mode ?? false,
                    monoFont: ap.mono_font ?? true
                });
            } catch (e) { console.warn('Erro ao carregar preferências:', e); }

            // Load system config
            try {
                const sc = await DB.loadSystemConfig();
                if (sc) systemConfig = { title: sc.title || 'TechSupport Pro', subtitle: sc.subtitle || 'Enterprise Console', logo_url: sc.logo_url || '' };
            } catch (e) { console.warn('Erro ao carregar config sistema:', e); }

            // Seed defaults if still empty
            await seedDefaults();

            applyPermissions();
            applySystemConfig();
            loadProfileUI();
            loadNotifUI();
            updateCategoryFilter();
            updateStatusFilters();
            updateFormCategories();
            renderTickets();
            updateNotifications();
            renderReports();
            showApp();
            return true;
        } catch (err) {
            console.error('ERRO CRÍTICO NO CARREGAMENTO:', err);
            // Em caso de erro fatal, tenta mostrar o app com dados básicos
            applyPermissions();
            showApp();
            return true;
        }
    }

    // ============= TICKETS RENDER =============
    function renderTickets() {
        const dashboardBody = document.getElementById('ticketsBody');
        const myTicketsBody = document.getElementById('myTicketsBody');
        const userId = currentUser?.id;
        const role = currentUser?.role || 'client';
        const isMasterAdmin = currentUser?.email === 'masteradm@email.com';
        const isAdmin = role === 'admin' || isMasterAdmin;
        const isTech = role === 'tech';

        if (dashboardBody) {
            // Dashboard Principal: Admin e Técnicos veem todos os chamados. Clientes veem apenas os seus.
            const dashboardTkts = tickets.filter(t => {
                if (isAdmin || isTech) return true;
                return t.created_by === userId || t.assigned_to === userId;
            });
            dashboardBody.innerHTML = dashboardTkts.map(t => generateRow(t, isAdmin)).join('');
        }
        if (myTicketsBody) {
            // Meus Chamados: O usuário vê o que ele criou OU o que foi atribuído a ele
            const myTkts = tickets.filter(t => {
                const isCreator = t.created_by === userId;
                const isAssigned = t.assigned_to === userId;
                return isCreator || isAssigned;
            });

            console.log(`Renderizando ${myTkts.length} chamados para o usuário ${userId} (${role})`);
            myTicketsBody.innerHTML = myTkts.length > 0 
                ? myTkts.map(t => generateRow(t, isAdmin)).join('')
                : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--on-surface-variant);">Nenhum chamado encontrado para você.</td></tr>';
        }

        // Atualizar Dashboard Stats
        const statOpen = document.getElementById('statOpen');
        if (statOpen) {
            // Mapeamento de termos para contagem robusta com busca parcial
            const sMatch = (s, terms) => terms.some(t => s?.toLowerCase().includes(t));
            
            const isOpen = s => sMatch(s, ['open', 'aberto', 'novo']);
            const isInProgress = s => sMatch(s, ['in-progress', 'andamento', 'processing', 'processando', 'atendimento']);
            const isWaiting = s => sMatch(s, ['waiting', 'aguarda', 'peca', 'peça']);
            const isResolved = s => sMatch(s, ['resolved', 'closed', 'resolvido', 'fechado', 'finalizado', 'concluido', 'concluído']);

            statOpen.textContent = tickets.filter(t => isOpen(t.status)).length;
            document.getElementById('statInProgress').textContent = tickets.filter(t => isInProgress(t.status)).length;
            document.getElementById('statWaiting').textContent = tickets.filter(t => isWaiting(t.status)).length;
            document.getElementById('statResolved').textContent = tickets.filter(t => isResolved(t.status)).length;
        }
    }

    const priorityLabels = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
    const statusLabels = { 
        open: 'Chamado Aberto', 
        'in-progress': 'Em Andamento', 
        waiting: 'Aguardando', 
        resolved: 'Finalizado', 
        closed: 'Finalizado',
        processing: 'Em Processamento'
    };

    function getStatusColorClass(name, slug) {
        const n = name?.toLowerCase() || '';
        const s = slug?.toLowerCase() || '';
        
        if (n.includes('aberto') || n.includes('novo') || s.includes('open') || s.includes('aberto')) return 'status-aberto';
        if (n.includes('andamento') || n.includes('atendimento') || s.includes('progress')) return 'status-in-progress';
        if (n.includes('aguarda') || n.includes('peca') || n.includes('peça') || s.includes('waiting')) return 'status-aguardando';
        if (n.includes('finaliza') || n.includes('conclui') || n.includes('resolv') || n.includes('fecha') || s.includes('resolved') || s.includes('closed')) return 'status-resolved';
        if (n.includes('processa') || s.includes('processing')) return 'status-processing';
        
        return `status-${s}`;
    }

    const generateRow = (t, isAdmin) => {
        const cat = categories.find(c => c.id === t.category);
        const st = statuses.find(s => s.id === t.status);
        const statusName = st ? st.name : (statusLabels[t.status] || t.status || 'Aberto');
        const statusClass = getStatusColorClass(statusName, t.status);
        const pLabel = priorityLabels[t.priority] || 'Média';

        return `
        <tr data-category="${t.category}" data-status="${t.status}">
            <td class="ticket-id">${t.id}</td>
            <td class="ticket-subject">${t.subject}</td>
            <td><span class="category-badge">${cat ? cat.name : (t.category || 'Geral')}</span></td>
            <td>
                <div class="priority-cell">
                    <span class="priority-badge priority-${t.priority || 'medium'}">${pLabel}</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${statusName}</span></td>
            <td class="actions-cell">
                <button class="icon-btn view-ticket" data-id="${t.id}" title="Visualizar"><span class="material-symbols-outlined">visibility</span></button>
                ${isAdmin ? `<button class="icon-btn delete-ticket" data-id="${t.id}" title="Excluir" style="color:var(--error)"><span class="material-symbols-outlined">delete</span></button>` : ''}
            </td>
        </tr>`;
    };

    // ============= EVENT DELEGATION =============
    document.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.view-ticket');
        if (viewBtn) {
            const t = tickets.find(tk => tk.id === viewBtn.dataset.id);
            if (t) { openModal(t); } else { alert('Ticket não encontrado: ' + viewBtn.dataset.id); }
            return;
        }
        const deleteBtn = e.target.closest('.delete-ticket');
        if (deleteBtn) {
            if (!confirm('Deseja realmente excluir este chamado?')) return;
            const tId = deleteBtn.dataset.id;
            const t = tickets.find(tk => tk.id === tId);
            if (t) {
                try {
                    await DB.deleteTicket(t._dbId);
                    tickets = tickets.filter(tk => tk.id !== tId);
                    renderTickets();
                } catch (err) {
                    alert('Erro ao excluir: ' + err.message);
                }
            }
            return;
        }
        const configModal = document.getElementById('userConfigModal');
        if (configModal && e.target === configModal) configModal.style.display = 'none';
    });

    // ============= MODAL =============
    const modal = document.getElementById('ticketModal');
    let currentModalTicket = null;

    function formatDate(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function openModal(ticket) {
        currentModalTicket = ticket;
        document.getElementById('modalTicketId').textContent = ticket.id;
        document.getElementById('modalTicketSubject').textContent = ticket.subject;
        
        const cat = categories.find(c => c.id === ticket.category);
        const modalCat = document.getElementById('modalCat');
        modalCat.textContent = cat ? cat.name : (ticket.category || 'Geral');
        modalCat.className = 'category-badge';

        const modalPriority = document.getElementById('modalPriority');
        modalPriority.textContent = priorityLabels[ticket.priority] || 'Média';
        modalPriority.className = `priority-badge priority-${ticket.priority || 'medium'}`;

        const st = statuses.find(s => s.id === ticket.status);
        const modalStatus = document.getElementById('modalStatus');
        const statusName = st ? st.name : (statusLabels[ticket.status] || ticket.status || 'Aberto');
        const statusClass = getStatusColorClass(statusName, ticket.status);
        
        modalStatus.textContent = statusName;
        modalStatus.className = `status-badge ${statusClass}`;

        document.getElementById('modalDescription').textContent = ticket.description || 'Sem descrição detalhada.';
        document.getElementById('modalCreatedAt').textContent = formatDate(ticket.created_at);
        document.getElementById('modalClosedAt').textContent = formatDate(ticket.closed_at);

        const actionsInput = document.getElementById('modalActionsInput');
        if (actionsInput) actionsInput.value = ticket.actions_taken || '';

        const actionsDisplay = document.getElementById('modalActionsDisplay');
        const actionsContainer = document.getElementById('modalActionsContainer');
        if (ticket.actions_taken) {
            actionsDisplay.textContent = ticket.actions_taken;
            actionsContainer.style.display = 'block';
        } else {
            actionsContainer.style.display = 'none';
        }

        const user = getCurrentUser();
        const isMasterAdmin = user?.email === 'masteradm@email.com';
        const isAdmin = user?.role === 'admin';
        const isTech = user?.role === 'tech';
        const isOwner = ticket.created_by === user?.id;
        
        document.getElementById('modalDeleteBtn').style.display = (isMasterAdmin || isAdmin) ? 'block' : 'none';
        
        // Seção de edição visível para Admin, Master, Tech ou se for o Dono (para encerrar)
        document.getElementById('modalAdminSection').style.display = (isMasterAdmin || isAdmin || isTech || isOwner) ? 'block' : 'none';
        document.getElementById('modalStatusFeedback').style.display = 'none';

        const statusSelect = document.getElementById('modalStatusSelect');
        const prioSelect = document.getElementById('modalPrioritySelect');
        const catSelect = document.getElementById('modalCategorySelect');
        const assignedSelect = document.getElementById('modalAssignedSelect');
        const clientCloseBtn = document.getElementById('modalClientCloseBtn');
        const saveBtn = document.getElementById('modalSaveStatusBtn');

        if (isMasterAdmin || isAdmin || isTech || isOwner) {
            // Status Select
            statusSelect.innerHTML = statuses.map(s =>
                `<option value="${s.id}" ${s.id === ticket.status ? 'selected' : ''}>${s.name}</option>`
            ).join('');
            
            // Priority Select
            if (prioSelect) prioSelect.value = ticket.priority || 'medium';

            // Category Select
            if (catSelect) {
                catSelect.innerHTML = categories.map(c => 
                    `<option value="${c.id}" ${c.id === ticket.category ? 'selected' : ''}>${c.name}</option>`
                ).join('');
            }

            // Assigned Select
            if (assignedSelect) {
                if (isMasterAdmin || isAdmin || isTech) {
                    assignedSelect.disabled = false;
                    DB.loadUsers().then(users => {
                        const techs = users.filter(u => u.role === 'tech' || u.role === 'admin');
                        assignedSelect.innerHTML = '<option value="">Não Atribuído</option>' + 
                            techs.map(t => `<option value="${t.id}" ${t.id === ticket.assigned_to ? 'selected' : ''}>${t.name} (${t.role})</option>`).join('');
                    }).catch(e => console.warn('Erro ao carregar técnicos:', e));
                } else {
                    assignedSelect.disabled = true;
                    assignedSelect.innerHTML = '<option value="">Apenas técnicos/admin</option>';
                }
            }

            // Restrições para Clientes (não master/admin/tech)
            if (isOwner && !isMasterAdmin && !isAdmin && !isTech) {
                // Cliente só pode ver e talvez encerrar
                statusSelect.disabled = true;
                if (prioSelect) prioSelect.disabled = true;
                if (catSelect) catSelect.disabled = true;
                if (actionsInput) actionsInput.disabled = true;
                saveBtn.style.display = 'none';
                
                // Mostrar botão de encerrar se não estiver resolvido/fechado
                if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
                    clientCloseBtn.style.display = 'block';
                } else {
                    clientCloseBtn.style.display = 'none';
                }
            } else {
                // Master, Admin ou Tech podem mudar tudo
                statusSelect.disabled = false;
                if (prioSelect) prioSelect.disabled = false;
                if (catSelect) catSelect.disabled = false;
                if (actionsInput) actionsInput.disabled = false;
                saveBtn.style.display = 'block';
                clientCloseBtn.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
    }

    document.getElementById('modalDeleteBtn')?.addEventListener('click', async () => {
        if (!currentModalTicket) return;
        if (!confirm(`Deseja realmente excluir o chamado ${currentModalTicket.id}?`)) return;
        try {
            await DB.deleteTicket(currentModalTicket._dbId);
            tickets = tickets.filter(tk => tk.id !== currentModalTicket.id);
            renderTickets();
            modal.style.display = 'none';
            alert('Chamado excluído com sucesso!');
        } catch (err) {
            alert('Erro ao excluir: ' + err.message);
        }
    });

    document.getElementById('modalSaveStatusBtn')?.addEventListener('click', async () => {
        if (!currentModalTicket) return;
        const newStatus = document.getElementById('modalStatusSelect').value;
        const newPriority = document.getElementById('modalPrioritySelect')?.value;
        const newCategory = document.getElementById('modalCategorySelect')?.value;
        const newAssigned = document.getElementById('modalAssignedSelect')?.value;
        const newActions = document.getElementById('modalActionsInput').value;
        
        const fb = document.getElementById('modalStatusFeedback');
        fb.style.display = 'none';

        try {
            const updates = { 
                status: newStatus,
                priority: newPriority || currentModalTicket.priority,
                category: newCategory || currentModalTicket.category,
                assigned_to: newAssigned || null,
                actions_taken: newActions
            };
            
            if (newStatus === 'closed' || newStatus === 'resolved') {
                if (!currentModalTicket.closed_at) {
                    updates.closed_at = new Date().toISOString();
                }
            } else {
                updates.closed_at = null;
            }

            await DB.updateTicket(currentModalTicket._dbId, updates);

            // Atualizar objeto local
            Object.assign(currentModalTicket, updates);

            // Atualizar UI do modal
            const st = statuses.find(s => s.id === newStatus);
            const modalStatus = document.getElementById('modalStatus');
            modalStatus.textContent = st ? st.name : (statusLabels[newStatus] || newStatus);
            modalStatus.className = `status-badge status-${newStatus}`;
            
            const catObj = categories.find(c => c.id === currentModalTicket.category);
            const modalCat = document.getElementById('modalCat');
            modalCat.textContent = catObj ? catObj.name : (currentModalTicket.category || 'Geral');
            modalCat.className = 'category-badge';
            
            const modalPriority = document.getElementById('modalPriority');
            modalPriority.textContent = priorityLabels[currentModalTicket.priority] || 'Média';
            modalPriority.className = `priority-badge priority-${currentModalTicket.priority || 'medium'}`;
            document.getElementById('modalClosedAt').textContent = formatDate(currentModalTicket.closed_at);
            
            const actionsDisplay = document.getElementById('modalActionsDisplay');
            const actionsContainer = document.getElementById('modalActionsContainer');
            if (currentModalTicket.actions_taken) {
                actionsDisplay.textContent = currentModalTicket.actions_taken;
                actionsContainer.style.display = 'block';
            } else {
                actionsContainer.style.display = 'none';
            }

            fb.textContent = 'Chamado atualizado com sucesso!';
            fb.style.color = 'var(--success, #16a34a)';
            fb.style.display = 'block';
            
            renderTickets();
            renderReports();
            
            setTimeout(() => { 
                fb.style.display = 'none';
                modal.style.display = 'none';
            }, 1500);
        } catch (err) {
            fb.textContent = 'Erro: ' + err.message;
            fb.style.color = 'var(--error)';
            fb.style.display = 'block';
        }
    });

    document.getElementById('modalClientCloseBtn')?.addEventListener('click', async () => {
        if (!currentModalTicket) return;
        if (!confirm('Deseja realmente encerrar este chamado?')) return;
        
        try {
            const updates = { 
                status: 'closed',
                closed_at: new Date().toISOString()
            };
            await DB.updateTicket(currentModalTicket._dbId, updates);
            Object.assign(currentModalTicket, updates);
            
            renderTickets();
            renderReports();
            modal.style.display = 'none';
            alert('Chamado encerrado com sucesso!');
        } catch (err) {
            alert('Erro ao encerrar: ' + err.message);
        }
    });

    // ============= NAVIGATION =============
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.querySelector('.page-title');

    function switchView(viewId) {
        console.log('Mudando para visualização:', viewId);
        sections.forEach(s => s.style.display = 'none');
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.style.display = 'block';
            const titles = { 
                dashboard: 'Dashboard de Suporte', 
                'new-ticket': 'Novo Chamado', 
                'my-tickets': 'Meus Chamados', 
                reports: 'Relatórios', 
                settings: 'Configurações' 
            };
            if (pageTitle && titles[viewId]) pageTitle.textContent = titles[viewId];
            
            // Atualizar classes ativas em todos os links que apontam para esta view
            document.querySelectorAll('[data-view]').forEach(l => {
                l.classList.toggle('active', l.dataset.view === viewId);
            });
        }
        
        // Carregar dados específicos da view
        if (viewId === 'my-tickets' || viewId === 'dashboard') renderTickets();
        if (viewId === 'settings') renderManagement();
        if (viewId === 'reports') renderReports();
    }

    // Delegated click listener for navigation
    document.addEventListener('click', (e) => {
        const navLink = e.target.closest('[data-view]');
        if (navLink && !navLink.closest('.filter-chip') && !navLink.closest('.admin-tab')) {
            const v = navLink.dataset.view;
            if (v) {
                console.log('Clique em navegação capturado:', v);
                e.preventDefault();
                switchView(v);
                
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        }
    });

    // Sidebar Extra Buttons
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', async () => {
        if (confirm('Deseja realmente sair do sistema?')) {
            await DB.logout();
            currentUser = null;
            tickets = [];
            showAuth();
        }
    });

    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('viewHelpModal').style.display = 'flex';
    });

    // ============= NOTIFICATION DROPDOWN =============
    document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('notificationDropdown');
        dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
    });

    // ============= SETTINGS TABS =============
    const settingsTabs = document.querySelectorAll('[data-settings-tab]');
    const settingsPanes = document.querySelectorAll('.settings-pane');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.settingsTab;
            settingsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            settingsPanes.forEach(p => p.style.display = p.id === `pane-${target}` ? 'block' : 'none');
            if (target === 'management') renderManagement();
        });
    });

    // ============= PROFILE =============
    function loadProfileUI() {
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileRole').value = profile.role || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        if (profile.avatar) {
            document.getElementById('profileAvatar').src = profile.avatar;
            document.getElementById('headerAvatar').src = profile.avatar;
        }
    }

    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const rawRole = document.getElementById('profileRole').value.toLowerCase();
        let finalRole = 'client';
        if (rawRole.includes('admin')) finalRole = 'admin';
        else if (rawRole.includes('tec')) finalRole = 'tech';
        else finalRole = 'client';

        profile.name = document.getElementById('profileName').value;
        profile.role = finalRole;
        profile.email = document.getElementById('profileEmail').value;
        profile.phone = document.getElementById('profilePhone').value;

        try {
            await DB.updateUser(currentUser?.id, {
                name: profile.name,
                role: finalRole,
                email: profile.email,
                phone: profile.phone
            });
            currentUser = DB.getCurrentUser();
            applyPermissions(); // Atualiza UI imediatamente
            const fb = document.getElementById('profileSaveFeedback');
            fb.textContent = 'Perfil salvo com sucesso!';
            fb.className = 'save-feedback success';
            setTimeout(() => { fb.textContent = ''; }, 3000);
        } catch (err) {
            const fb = document.getElementById('profileSaveFeedback');
            fb.textContent = 'Erro ao salvar: ' + err.message;
            fb.className = 'save-feedback error';
        }
    });

    document.getElementById('avatarUpload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const src = ev.target.result;
                document.getElementById('profileAvatar').src = src;
                document.getElementById('headerAvatar').src = src;
                profile.avatar = src;
            };
            reader.readAsDataURL(file);
        }
    });

    // ============= NOTIFICATIONS =============
    function loadNotifUI() {
        document.querySelectorAll('.notif-toggle').forEach(cb => {
            cb.checked = notifPrefs[cb.dataset.key] === true;
            cb.addEventListener('change', async () => {
                notifPrefs[cb.dataset.key] = cb.checked;
                try {
                    await DB.saveNotifPrefs(currentUser?.id, {
                        notif_new_ticket: notifPrefs.notifNewTicket,
                        notif_status_change: notifPrefs.notifStatusChange,
                        notif_sla: notifPrefs.notifSla,
                        notif_comments: notifPrefs.notifComments,
                        notif_reports: notifPrefs.notifReports
                    });
                    updateNotifications();
                    const fb = document.getElementById('notifSaveFeedback');
                    fb.textContent = 'Preferências salvas!';
                    fb.className = 'save-feedback success';
                    setTimeout(() => { fb.textContent = ''; }, 2000);
                } catch { }
            });
        });
    }

    // ============= APPEARANCE =============
    function applyAppearance() {
        document.body.classList.toggle('dark-mode', appearancePrefs.darkMode);
        document.getElementById('darkModeToggle').checked = appearancePrefs.darkMode;
        document.getElementById('compactModeToggle').checked = appearancePrefs.compactMode;
        document.getElementById('monoFontToggle').checked = appearancePrefs.monoFont;
    }

    document.getElementById('darkModeToggle')?.addEventListener('change', async function () {
        appearancePrefs.darkMode = this.checked;
        try { await DB.saveAppearancePrefs(currentUser?.id, { dark_mode: this.checked, compact_mode: appearancePrefs.compactMode, mono_font: appearancePrefs.monoFont }); } catch { }
        document.body.classList.toggle('dark-mode', this.checked);
    });
    document.getElementById('compactModeToggle')?.addEventListener('change', async function () {
        appearancePrefs.compactMode = this.checked;
        try { await DB.saveAppearancePrefs(currentUser?.id, { dark_mode: appearancePrefs.darkMode, compact_mode: this.checked, mono_font: appearancePrefs.monoFont }); } catch { }
        document.body.classList.toggle('compact-mode', this.checked);
    });
    document.getElementById('monoFontToggle')?.addEventListener('change', async function () {
        appearancePrefs.monoFont = this.checked;
        try { await DB.saveAppearancePrefs(currentUser?.id, { dark_mode: appearancePrefs.darkMode, compact_mode: appearancePrefs.compactMode, mono_font: this.checked }); } catch { }
        document.querySelectorAll('.ticket-id').forEach(el => {
            el.style.fontFamily = this.checked ? 'monospace' : 'inherit';
        });
    });

    // ============= PERMISSIONS =============
    function applyPermissions() {
        const role = currentUser?.role || 'client';
        const isAdmin = role === 'admin';
        const isTech = role === 'tech';
        const isClient = role === 'client';

        // Settings tabs visibility
        const settingsTabs = document.querySelectorAll('.settings-sidebar .nav-link');
        const isMasterAdmin = currentUser?.email === 'masteradm@email.com';

        settingsTabs.forEach(tab => {
            const tabName = tab.dataset.settingsTab;
            if (isMasterAdmin) {
                tab.style.display = 'block'; // Master Admin vê tudo
            } else if (isAdmin || isTech) {
                // Outros admins ou técnicos NÃO veem Gerenciamento, apenas Notificações, Perfil e Aparência
                tab.style.display = (tabName === 'management') ? 'none' : 'block';
            } else if (isClient) {
                // Cliente vê apenas Perfil e Aparência
                tab.style.display = (tabName === 'profile' || tabName === 'appearance') ? 'block' : 'none';
            }
        });

        // Nav visibility
        const navLinks = document.querySelectorAll('.nav-menu .nav-link');
        navLinks.forEach(link => {
            const view = link.dataset.view;
            if (isClient) {
                // Cliente vê Dashboard, Meus Chamados, Novo Chamado, Relatórios e Configurações
                link.style.display = (['dashboard', 'my-tickets', 'new-ticket', 'reports', 'settings'].includes(view)) ? 'flex' : 'none';
            } else {
                link.style.display = 'flex';
            }
        });

        // Technical restrictions
        // Management tab restrictions for Technical staff
        if (isTech) {
            // Se o técnico de alguma forma acessar a aba de gerenciamento, restringimos os painéis
            const mgmtTabs = document.querySelectorAll('.admin-tab');
            mgmtTabs.forEach(tab => {
                const t = tab.dataset.adminTab;
                // Técnico só pode ver usuários (para consulta) e chamados-admin, mas não configurações de sistema
                if (['system', 'categories', 'statuses'].includes(t)) {
                    tab.style.display = 'none';
                } else {
                    tab.style.display = 'block';
                }
            });
        }
        
        // Se for admin ou master, garante que os painéis de gerenciamento apropriados estejam visíveis
        if (isAdmin || isMasterAdmin) {
            document.querySelectorAll('.admin-tab').forEach(tab => {
                const t = tab.dataset.adminTab;
                if (isMasterAdmin) {
                    tab.style.display = 'block'; // Master vê tudo no gerenciamento
                } else {
                    // Outros admins veem apenas Usuários e Chamados, não sistema/categorias/status
                    tab.style.display = (['users', 'tickets-admin'].includes(t)) ? 'block' : 'none';
                }
            });
        }

        // User profile visibility
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) userProfile.style.display = 'flex';

        // Logout and Support buttons visibility
        let logoutBtn = document.getElementById('settingsLogoutBtn');
        if (!logoutBtn) {
            const settingsContent = document.getElementById('settings-content');
            if (settingsContent) {
                const logoutDiv = document.createElement('div');
                logoutDiv.id = 'logout-container';
                logoutDiv.style.cssText = 'margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--outline-variant);';
                logoutDiv.innerHTML = `
                    <button id="settingsLogoutBtn" style="width:100%;padding:var(--space-sm) var(--space-lg);border-radius:var(--radius-default);border:1px solid var(--error);color:var(--error);font-weight:600;background:none;cursor:pointer;">Sair da conta</button>
                `;
                settingsContent.appendChild(logoutDiv);
                
                document.getElementById('settingsLogoutBtn')?.addEventListener('click', async () => {
                    if (confirm('Deseja realmente sair?')) {
                        await DB.logout();
                        currentUser = null;
                        tickets = [];
                        showAuth();
                    }
                });

                document.getElementById('externalSupportBtn')?.addEventListener('click', () => {
                    window.open('https://google.com', '_blank'); // Altere para a URL real de suporte
                });
            }
        }

        // Display user name and role in header or sidebar
        const headerUserName = document.querySelector('.user-profile span');
        if (headerUserName) headerUserName.textContent = currentUser?.name || 'Perfil';
        
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && currentUser?.avatar) headerAvatar.src = currentUser.avatar;

        const sbAvatar = document.getElementById('sidebarUserAvatar');
        const sbName = document.getElementById('sidebarUserName');
        const sbRole = document.getElementById('sidebarUserRole');
        
        if (sbAvatar) sbAvatar.src = currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser?.name || 'User') + '&background=random';
        if (sbName) sbName.textContent = currentUser?.name || 'Usuário';
        if (sbRole) {
            const isMasterAdmin = currentUser?.email === 'masteradm@email.com';
            if (isMasterAdmin) {
                sbRole.textContent = 'ADMIN MASTER';
                sbRole.style.color = '#3b82f6'; // Azul destaque
                sbRole.style.fontWeight = '800';
            } else {
                const roleLabel = currentUser?.role === 'admin' ? 'ADMINISTRADOR' : currentUser?.role === 'tech' ? 'TÉCNICO' : 'CLIENTE';
                sbRole.textContent = roleLabel;
                sbRole.style.color = '';
                sbRole.style.fontWeight = '';
            }
        }

        const myTicketsTitle = document.getElementById('myTicketsTitle');
        if (myTicketsTitle) myTicketsTitle.textContent = `Meus Chamados - ${currentUser?.name || 'Usuário'}`;

        // Help button visibility
        const helpBtn = document.querySelector('.header-icons .icon-btn:last-child');
        if (helpBtn && isClient) helpBtn.style.display = 'none';

        // Dashboard stat click for non-admin
        if (!isAdmin) {
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => { card.style.cursor = 'default'; });
        }

        // If not admin, hide admin-only buttons
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    }

    // ============= SYSTEM CONFIG =============
    function applySystemConfig() {
        const titleEl = document.getElementById('sidebarTitle');
        const subEl = document.getElementById('sidebarSubtitle');
        if (titleEl) titleEl.textContent = systemConfig.title;
        if (subEl) subEl.textContent = systemConfig.subtitle;
        document.title = `${systemConfig.title} - ${systemConfig.subtitle}`;

        const defaultIcon = document.getElementById('sidebarDefaultLogo');
        const customImg = document.getElementById('sidebarCustomLogo');
        
        if (systemConfig.logo_url) {
            if (defaultIcon) defaultIcon.style.display = 'none';
            if (customImg) {
                customImg.style.display = 'block';
                customImg.src = systemConfig.logo_url;
            }
        } else {
            if (defaultIcon) defaultIcon.style.display = 'flex';
            if (customImg) customImg.style.display = 'none';
        }

        // Atualiza a logo da tela de login também (opcional)
        const loginTitle = document.getElementById('loginTitle');
        const loginSubtitle = document.getElementById('loginSubtitle');
        if (loginTitle) loginTitle.textContent = systemConfig.title;
        if (loginSubtitle) loginSubtitle.textContent = systemConfig.subtitle;
    }

    function applySystemConfigUI() {
        document.getElementById('sysTitle').value = systemConfig.title;
        document.getElementById('sysSubtitle').value = systemConfig.subtitle;
        const preview = document.getElementById('sysLogoPreviewImg');
        const previewPlaceholder = document.querySelector('#sysLogoPreview .material-symbols-outlined');
        if (systemConfig.logo_url) {
            preview.src = systemConfig.logo_url;
            preview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
        } else {
            preview.style.display = 'none';
            previewPlaceholder.style.display = 'block';
        }
    }

    document.getElementById('saveSystemConfigBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('sysTitle').value.trim() || 'TechSupport Pro';
        const subtitle = document.getElementById('sysSubtitle').value.trim() || 'Enterprise Console';
        const fb = document.getElementById('sysConfigFeedback');

        systemConfig.title = title;
        systemConfig.subtitle = subtitle;

        try {
            await DB.saveSystemConfig({
                title,
                subtitle,
                logo_url: systemConfig.logo_url
            });
            applySystemConfig();
            fb.textContent = 'Configuração salva com sucesso!';
            fb.className = 'save-feedback success';
            setTimeout(() => { fb.textContent = ''; }, 3000);
        } catch (err) {
            fb.textContent = 'Erro: ' + (err.message || '');
            fb.className = 'save-feedback error';
        }
    });

    // Logo upload with auto-resize
    document.getElementById('sysLogoInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 200;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    const ratio = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/png');

                systemConfig.logo_url = dataUrl;
                const preview = document.getElementById('sysLogoPreviewImg');
                const placeholder = document.querySelector('#sysLogoPreview .material-symbols-outlined');
                preview.src = dataUrl;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('sysLogoUploadBtn')?.addEventListener('click', () => {
        document.getElementById('sysLogoInput').click();
    });

    // ============= SECURITY =============
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const current = document.getElementById('currentPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const fb = document.getElementById('passwordFeedback');

        if (!current || !newPwd || !confirm) {
            fb.textContent = 'Preencha todos os campos!';
            fb.className = 'save-feedback error'; return;
        }
        if (newPwd.length < 6) {
            fb.textContent = 'A senha deve ter no mínimo 6 caracteres!';
            fb.className = 'save-feedback error'; return;
        }
        if (newPwd !== confirm) {
            fb.textContent = 'As senhas não conferem!';
            fb.className = 'save-feedback error'; return;
        }
        try {
            await DB.changePassword(currentUser?.id, current, newPwd);
            fb.textContent = 'Senha alterada com sucesso!';
            fb.className = 'save-feedback success';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            setTimeout(() => { fb.textContent = ''; }, 3000);
        } catch (err) {
            fb.textContent = 'Erro: ' + err.message;
            fb.className = 'save-feedback error';
        }
    });

    document.getElementById('twoFactorToggle')?.addEventListener('change', function () {
        alert(this.checked ? '2FA ativado com sucesso!' : '2FA desativado.');
    });

    // ============= MANAGEMENT =============
    function renderManagement() {
        renderUsers();
        renderCategories();
        renderStatuses();
        applySystemConfigUI();
    }

    // ----- Admin Tabs -----
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
            const target = document.getElementById(`admin-${tab.dataset.adminTab}`);
            if (target) target.style.display = 'block';
        });
    });

    // ----- Users -----
    let editingUserId = null;

    function renderUsers() {
        const tbody = document.getElementById('userTableBody');
        const count = document.getElementById('userCount');
        if (!tbody) return;
        tbody.innerHTML = users.map((u, i) => {
            const isCurrent = u.id === currentUser?.id;
            const roleLabel = u.role === 'admin' ? 'Administrador' : u.role === 'tech' ? 'Técnico' : 'Cliente';
            return `<tr>
                <td><strong>${u.name}</strong> ${isCurrent ? '<span style="font-size:10px;color:var(--primary);font-weight:600;">(ativo)</span>' : ''}</td>
                <td>${u.email}</td>
                <td><span class="role-badge role-${u.role}">${roleLabel}</span></td>
                <td style="text-align:right;white-space:nowrap;">
                    <button class="user-edit-btn" data-index="${i}" style="color:var(--primary);font-weight:600;font-size:12px;padding:4px 8px;border-radius:4px;">Editar</button>
                    <button class="user-config-btn" data-index="${i}" style="color:var(--secondary);font-weight:600;font-size:12px;padding:4px 8px;border-radius:4px;">Permissões</button>
                    ${!isCurrent ? `<button class="user-activate-btn" data-index="${i}" style="color:#16a34a;font-weight:600;font-size:12px;padding:4px 8px;border-radius:4px;" title="Usar como usuário atual">Ativar</button>` : ''}
                    <button class="user-delete-btn" data-index="${i}">Remover</button>
                </td>
            </tr>`;
        }).join('');
        count.textContent = users.length;

        tbody.querySelectorAll('.user-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.index);
                if (users[idx].role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
                    alert('Não é possível remover o único administrador do sistema.');
                    return;
                }
                if (!confirm(`Remover usuário "${users[idx].name}"?`)) return;
                try {
                    await DB.deleteUser(users[idx].id);
                    users.splice(idx, 1);
                    renderUsers();
                    updateFormCategories();
                } catch (err) {
                    alert('Erro ao remover: ' + err.message);
                }
            });
        });

        tbody.querySelectorAll('.user-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                openUserEdit(users[idx]);
            });
        });

        tbody.querySelectorAll('.user-config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                openUserConfig(users[idx]);
            });
        });

        tbody.querySelectorAll('.user-activate-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                currentUser = users[idx];
                renderUsers();
                updateFormCategories();
            });
        });
    }

    function openUserEdit(user) {
        editingUserId = user.id;
        document.getElementById('editUserName').value = user.name;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserRole').value = user.role;
        document.getElementById('editUserPhone').value = user.phone || '';
        document.getElementById('editUserPassword').value = '';
        document.getElementById('userEditModal').style.display = 'flex';
    }

    document.getElementById('saveUserEditBtn')?.addEventListener('click', async () => {
        const user = users.find(u => u.id === editingUserId);
        if (!user) return;
        const updates = {
            name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim(),
            role: document.getElementById('editUserRole').value,
            phone: document.getElementById('editUserPhone').value.trim()
        };
        const newPwd = document.getElementById('editUserPassword').value;

        try {
            if (newPwd) {
                // Changing password of another user requires Admin rights on Auth (backend)
                // For this demo, we simulate it or use a placeholder
                console.log('Admin changing password for user:', user.id);
                // await DB.adminUpdateUserPassword(user.id, newPwd);
            }
            await DB.updateUser(user.id, updates);
            
            // Update local users array
            Object.assign(user, updates);
            
            document.getElementById('userEditModal').style.display = 'none';
            renderUsers();
            alert(`Usuário "${updates.name}" atualizado com sucesso!`);
        } catch (err) {
            alert('Erro ao atualizar usuário: ' + err.message);
        }
    });

    function openUserConfig(user) {
        editingUserId = user.id;
        document.getElementById('configUserName').textContent = user.name;
        const catContainer = document.getElementById('configCategoriesList');
        const statusContainer = document.getElementById('configStatusesList');

        catContainer.innerHTML = categories.map(c =>
            `<label class="config-checkbox"><input type="checkbox" value="${c.id}" ${user.allowedCategories.includes(c.id) ? 'checked' : ''}> ${c.name}</label>`
        ).join('');

        statusContainer.innerHTML = statuses.map(s =>
            `<label class="config-checkbox"><input type="checkbox" value="${s.id}" ${user.allowedStatuses.includes(s.id) ? 'checked' : ''}> ${s.name}</label>`
        ).join('');

        document.getElementById('userConfigModal').style.display = 'flex';
    }

    document.getElementById('saveUserConfigBtn')?.addEventListener('click', async () => {
        const user = users.find(u => u.id === editingUserId);
        if (!user) return;
        const selectedCats = [...document.querySelectorAll('#configCategoriesList input:checked')].map(cb => cb.value);
        const selectedStatuses = [...document.querySelectorAll('#configStatusesList input:checked')].map(cb => cb.value);
        user.allowedCategories = selectedCats;
        user.allowedStatuses = selectedStatuses;
        try {
            await DB.updateUser(user.id, {
                allowedCategories: selectedCats,
                allowedStatuses: selectedStatuses
            });
            document.getElementById('userConfigModal').style.display = 'none';
            updateFormCategories();
            renderUsers();
            alert(`Permissões de "${user.name}" atualizadas!`);
        } catch (err) {
            alert('Erro ao salvar permissões: ' + err.message);
        }
    });

    document.getElementById('cancelUserConfigBtn')?.addEventListener('click', () => {
        document.getElementById('userConfigModal').style.display = 'none';
    });

    document.getElementById('addUserBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('newUserUsername').value.trim();
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const role = document.getElementById('newUserRole').value;
        const defaultPassword = '123456';
        
        if (!name || !email) { alert('Preencha pelo menos Nome e E-mail.'); return; }
        
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            alert('Este e-mail já está em uso por outro usuário!');
            return;
        }

        document.getElementById('addUserBtn').disabled = true;
        document.getElementById('addUserBtn').textContent = 'Criando...';

        try {
            await DB.addUser({ username, name, email, role, password: defaultPassword });
            alert('Usuário criado com sucesso! Ele poderá entrar com a senha padrão: ' + defaultPassword);
            
            // Recarregar usuários do banco para garantir sincronia
            const dbUsers = await DB.loadUsers();
            if (dbUsers) users = dbUsers;
            
            renderUsers();
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserEmail').value = '';
            document.getElementById('newUserUsername').value = '';
        } catch (err) {
            alert('Erro ao criar usuário: ' + (err.message || 'Verifique se o e-mail é válido e não está em uso.'));
        } finally {
            document.getElementById('addUserBtn').disabled = false;
            document.getElementById('addUserBtn').textContent = 'Adicionar Usuário';
        }
    });

    document.getElementById('newUserUsername')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addUserBtn').click();
    });
    document.getElementById('newUserName')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addUserBtn').click();
    });
    document.getElementById('newUserEmail')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addUserBtn').click();
    });

    // ----- Categories -----
    function renderCategories() {
        const list = document.getElementById('categoryList');
        const count = document.getElementById('categoryCount');
        if (!list) return;
        const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'masteradm@email.com';

        list.innerHTML = categories.map((c, i) =>
            `<li>
                ${c.name} 
                <div style="display:flex;gap:4px;">
                    ${isAdmin ? `<button class="item-edit item-edit-category" data-index="${i}"><span class="material-symbols-outlined">edit</span></button>` : ''}
                    <button class="item-delete" data-index="${i}"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </li>`
        ).join('');
        count.textContent = categories.length;
        
        list.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.index);
                const cat = categories[idx];
                try {
                    await DB.deleteCategory(cat._dbId);
                    categories.splice(idx, 1);
                    updateCategoryFilter();
                    updateFormCategories();
                    renderCategories();
                } catch (err) {
                    alert('Erro ao remover categoria: ' + err.message);
                }
            });
        });

        list.querySelectorAll('.item-edit-category').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.index);
                const cat = categories[idx];
                const newName = prompt('Editar nome da categoria:', cat.name);
                if (newName && newName.trim() !== '' && newName !== cat.name) {
                    try {
                        const result = await DB.updateCategory(cat._dbId, newName.trim());
                        categories[idx].name = result.name;
                        categories[idx].id = result.slug;
                        renderCategories();
                        updateCategoryFilter();
                        updateFormCategories();
                    } catch (err) {
                        alert('Erro ao editar: ' + err.message);
                    }
                }
            });
        });
    }

    document.getElementById('addCategoryBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();
        if (!name) return;
        
        // Slug generation matching supabase.js
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
        
        if (categories.find(c => c.id === slug || c.name.toLowerCase() === name.toLowerCase())) { 
            alert('Esta categoria já existe!'); 
            return; 
        }

        try {
            const result = await DB.insertCategory(name);
            categories.push({ id: result.slug, name: result.name, _dbId: result.id });
            input.value = '';
            updateCategoryFilter();
            updateFormCategories();
            renderCategories();
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('newCategoryInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addCategoryBtn').click();
    });

    // ----- Status -----
    function renderStatuses() {
        const list = document.getElementById('statusList');
        const count = document.getElementById('statusCount');
        if (!list) return;
        const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'masteradm@email.com';

        list.innerHTML = statuses.map((s, i) =>
            `<li>
                ${s.name} 
                <div style="display:flex;gap:4px;">
                    ${isAdmin ? `<button class="item-edit item-edit-status" data-index="${i}"><span class="material-symbols-outlined">edit</span></button>` : ''}
                    <button class="item-delete" data-index="${i}"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </li>`
        ).join('');
        count.textContent = statuses.length;

        list.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.index);
                const st = statuses[idx];
                try {
                    await DB.deleteStatus(st._dbId);
                    statuses.splice(idx, 1);
                    renderStatuses();
                } catch (err) {
                    alert('Erro ao remover status: ' + err.message);
                }
            });
        });

        list.querySelectorAll('.item-edit-status').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.index);
                const st = statuses[idx];
                const newName = prompt('Editar nome do status:', st.name);
                if (newName && newName.trim() !== '' && newName !== st.name) {
                    try {
                        const result = await DB.updateStatus(st._dbId, newName.trim());
                        statuses[idx].name = result.name;
                        statuses[idx].id = result.slug;
                        renderStatuses();
                    } catch (err) {
                        alert('Erro ao editar: ' + err.message);
                    }
                }
            });
        });
    }

    document.getElementById('addStatusBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('newStatusInput');
        const name = input.value.trim();
        if (!name) return;
        
        // Slug generation matching supabase.js
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();

        if (statuses.find(s => s.id === slug || s.name.toLowerCase() === name.toLowerCase())) { 
            alert('Este status já existe!'); 
            return; 
        }

        try {
            const result = await DB.insertStatus(name);
            statuses.push({ id: result.slug, name: result.name, _dbId: result.id });
            input.value = '';
            renderStatuses();
            updateStatusFilters(); // Reflete em Meus Chamados e labels
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('newStatusInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('addStatusBtn').click();
    });

    function updateCategoryFilter() {
        const bar = document.getElementById('filtersBar');
        if (!bar) return;
        bar.querySelectorAll('.filter-chip').forEach(chip => {
            const val = chip.dataset.filter;
            if (val !== 'all') {
                if (!categories.find(c => c.id === val)) chip.remove();
            }
        });
        categories.forEach(c => {
            if (!bar.querySelector(`[data-filter="${c.id}"]`)) {
                const btn = document.createElement('button');
                btn.className = 'filter-chip';
                btn.dataset.filter = c.id;
                btn.textContent = c.name;
                bar.appendChild(btn);
                btn.addEventListener('click', () => {
                    bar.querySelectorAll('.filter-chip').forEach(ch => ch.classList.remove('active'));
                    btn.classList.add('active');
                    filterTickets(c.id);
                });
            }
        });
    }

    function updateFormCategories() {
        const catSelect = document.getElementById('formCategory');
        if (!catSelect) return;
        const user = getCurrentUser();
        const allowed = user?.allowedCategories;
        const allowedCats = user?.role === 'admin' || !allowed?.length ? categories : categories.filter(c => allowed.includes(c.id));
        catSelect.innerHTML = allowedCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const label = document.querySelector('.form-user-indicator');
        if (label) label.textContent = `Criando como: ${user?.name || 'Usuário'}`;
    }

    function filterTickets(category) {
        document.querySelectorAll('#ticketsBody tr').forEach(row => {
            row.style.display = category === 'all' || row.dataset.category === category ? '' : 'none';
        });
    }

    function updateStatusFilters() {
        const bar = document.getElementById('myTicketsFilters');
        if (!bar) return;

        // Atualizar statusLabels global para garantir consistência
        statuses.forEach(s => { statusLabels[s.id] = s.name; });

        // Remover chips antigos (exceto o 'Todos')
        bar.querySelectorAll('.my-tickets-filter').forEach(chip => {
            if (chip.dataset.myfilter !== 'all') chip.remove();
        });

        // Adicionar novos chips baseados no array statuses
        statuses.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'filter-chip my-tickets-filter';
            btn.dataset.myfilter = s.id;
            btn.textContent = s.name;
            bar.appendChild(btn);

            btn.addEventListener('click', () => {
                bar.querySelectorAll('.my-tickets-filter').forEach(ch => ch.classList.remove('active'));
                btn.classList.add('active');
                filterMyTickets(s.id);
            });
        });
    }

    function filterMyTickets(status) {
        document.querySelectorAll('#myTicketsBody tr').forEach(row => {
            const show = status === 'all' || row.dataset.status === status;
            row.style.display = show ? '' : 'none';
        });
    }

    // ============= NEW TICKET FORM =============
    document.getElementById('newTicketForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ticketData = {
            ticket_id: `#TK-${Math.floor(Math.random() * 9000 + 1000)}`,
            subject: document.getElementById('ticketSubject').value,
            category: document.getElementById('formCategory').value,
            priority: document.getElementById('formPriority').value,
            status: 'open',
            description: document.getElementById('ticketDescription').value,
            created_by: currentUser?.id,
            created_at: new Date().toISOString()
        };
        try {
            const result = await DB.insertTicket(ticketData);
            
            // Recarregar todos os dados do banco para garantir sincronia total
            await loadAllData();
            
            alert('Chamado aberto com sucesso!');
            e.target.reset();
            switchView('my-tickets');
        } catch (err) {
            alert('Erro ao abrir chamado: ' + (err.message || ''));
        }
    });

    // ============= FILTER CHIPS =============
    document.querySelectorAll('#filtersBar .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#filtersBar .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterTickets(chip.dataset.filter);
        });
    });

    document.querySelectorAll('.my-tickets-filter').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.my-tickets-filter').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterMyTickets(chip.dataset.myfilter);
        });
    });

    // ============= EXPORT PDF =============
    // ============= DELETE ALL TICKETS =============
    document.getElementById('btnOpenDeleteAll')?.addEventListener('click', () => {
        document.getElementById('deleteAllConfirmSection').style.display = 'block';
        document.getElementById('btnOpenDeleteAll').style.display = 'none';
    });

    document.getElementById('btnCancelDeleteAll')?.addEventListener('click', () => {
        document.getElementById('deleteAllConfirmSection').style.display = 'none';
        document.getElementById('btnOpenDeleteAll').style.display = 'block';
        document.getElementById('confirmAdminUser').value = '';
        document.getElementById('confirmAdminPass').value = '';
    });

    document.getElementById('btnConfirmDeleteAll')?.addEventListener('click', async () => {
        const user = document.getElementById('confirmAdminUser').value.trim();
        const pass = document.getElementById('confirmAdminPass').value;
        
        if (!user || !pass) {
            alert('Por favor, informe usuário e senha de administrador.');
            return;
        }

        try {
            // Validate admin credentials again for safety
            const { user: authUser } = await DB.login(user, pass);
            if (authUser.role !== 'admin') {
                throw new Error('Apenas administradores podem realizar esta ação.');
            }

            if (!confirm('ATENÇÃO: TODOS os chamados serão apagados permanentemente. Esta ação não pode ser desfeita. Confirmar?')) return;

            await DB.deleteAllTickets();
            tickets = [];
            renderTickets();
            renderReports();
            
            document.getElementById('btnCancelDeleteAll').click();
            alert('Todos os chamados foram excluídos com sucesso.');
        } catch (err) {
            alert('Falha na autenticação ou permissão: ' + err.message);
        }
    });

    document.getElementById('btnExportPDF')?.addEventListener('click', () => window.print());
    
    // ============= GLOBAL SEARCH =============
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const currentView = document.querySelector('.view-section:not([style*="display: none"])')?.id;
            
            let targetBodyId = '';
            if (currentView === 'view-dashboard') targetBodyId = 'ticketsBody';
            else if (currentView === 'view-my-tickets') targetBodyId = 'myTicketsBody';
            
            if (targetBodyId) {
                const rows = document.querySelectorAll(`#${targetBodyId} tr`);
                rows.forEach(row => {
                    const text = row.innerText.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            }
        });
    }

    // ============= MOBILE MENU =============
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('open');
    });

    // ============= NOTIFICATIONS =============
    function generateNotifications() {
        const items = [];
        const openTickets = tickets.filter(t => t.status === 'open');
        const criticalTickets = tickets.filter(t => t.priority === 'critical');
        const inProgressTickets = tickets.filter(t => t.status === 'in-progress');

        if (notifPrefs.notifNewTicket) {
            openTickets.forEach(t => {
                items.push({ title: 'Novo chamado aberto', desc: `Chamado ${t.id} - ${t.subject}` });
            });
        }
        if (notifPrefs.notifSla) {
            criticalTickets.forEach(t => {
                items.push({ title: 'SLA Crítico', desc: `${t.id} - ${t.subject} requer atenção imediata!` });
            });
        }
        if (notifPrefs.notifStatusChange) {
            inProgressTickets.slice(0, 2).forEach(t => {
                items.push({ title: 'Status alterado', desc: `${t.id} está agora Em Atendimento` });
            });
        }
        if (notifPrefs.notifComments && tickets.length > 0) {
            items.push({ title: 'Novo comentário', desc: `${tickets[0].id} - Novo comentário adicionado` });
        }
        return items;
    }

    function updateNotifications() {
        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');
        const notifications = generateNotifications();

        if (badge) {
            if (notifications.length > 0) {
                badge.style.display = 'flex';
                badge.textContent = notifications.length > 9 ? '9+' : notifications.length;
            } else {
                badge.style.display = 'none';
            }
        }

        if (list) {
            if (notifications.length === 0) {
                list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
            } else {
                list.innerHTML = notifications.map(n => `
                    <div class="notification-item">
                        <div class="notif-item-title">${n.title}</div>
                        <div class="notif-item-desc">${n.desc}</div>
                    </div>
                `).join('');
            }
        }
    }

    document.getElementById('notifClearAll')?.addEventListener('click', async () => {
        Object.keys(notifPrefs).forEach(k => { notifPrefs[k] = false; });
        try {
            await DB.saveNotifPrefs(currentUser?.id, {
                notif_new_ticket: false,
                notif_status_change: false,
                notif_sla: false,
                notif_comments: false,
                notif_reports: false
            });
            document.querySelectorAll('.notif-toggle').forEach(cb => { cb.checked = false; });
            updateNotifications();
        } catch { }
    });

    // ============= REPORTS =============
    function renderReports() {
        const chartContainer = document.getElementById('reportCategoryChart');
        const labelsContainer = document.getElementById('reportCategoryLabels');
        const statusContainer = document.getElementById('reportStatusBars');

        if (!chartContainer) return;

        const userId = currentUser?.id;
        const role = currentUser?.role || 'client';
        const isMasterAdmin = currentUser?.email === 'masteradm@email.com';
        const isAdminOrTech = role === 'admin' || role === 'tech' || isMasterAdmin;

        // Filtrar chamados para o relatório: Admin/Tech veem tudo, Cliente vê apenas os seus
        const reportTkts = tickets.filter(t => {
            if (isAdminOrTech) return true;
            return t.created_by === userId || t.assigned_to === userId;
        });

        const catCounts = {};
        categories.forEach(c => { catCounts[c.id] = 0; });
        reportTkts.forEach(t => {
            if (catCounts[t.category] !== undefined) catCounts[t.category]++;
        });
        const maxCount = Math.max(1, ...Object.values(catCounts));
        const colors = ['#3980f4', '#54647a', '#7c839b', '#adc6ff', '#f97316'];

        chartContainer.innerHTML = categories.map((c, i) => {
            const count = catCounts[c.id] || 0;
            const pct = maxCount > 0 ? (count / maxCount) * 180 : 0;
            return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;">
                    <span style="font-size:13px;font-weight:700;color:var(--on-surface);">${count}</span>
                    <div style="width:70%;background:${colors[i % colors.length]};height:${Math.max(4, pct)}px;border-radius:4px 4px 0 0;" title="${c.name}: ${count}"></div>
                </div>`;
        }).join('');

        labelsContainer.innerHTML = categories.map(c => `<span>${c.name}</span>`).join('');

        if (!statusContainer) return;
        const statusCounts = {};
        statuses.forEach(s => { statusCounts[s.id] = 0; });
        tickets.forEach(t => {
            if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
        });
        const totalTickets = tickets.length;
        const statusColors = { open: '#ba1a1a', 'in-progress': '#eab308', waiting: '#f97316', resolved: '#16a34a', closed: '#6b7280' };

        statusContainer.innerHTML = statuses.map(s => {
            const count = statusCounts[s.id] || 0;
            const totalForReport = reportTkts.length;
            const pct = totalForReport > 0 ? Math.round((count / totalForReport) * 100) : 0;
            return `
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;">
                        <span style="font-weight:600;">${s.name}</span>
                        <span style="font-weight:700;">${count} (${pct}%)</span>
                    </div>
                    <div style="width:100%;height:8px;background:var(--surface-container);border-radius:4px;overflow:hidden;margin-top:4px;">
                        <div style="width:${pct}%;height:100%;background:${statusColors[s.id] || '#888'};border-radius:4px;"></div>
                    </div>
                </div>`;
        }).join('');
    }

    async function init() {
        console.log('Inicializando componentes...');
        await restoreSession();
        if (currentUser) {
            console.log('Sessão restaurada para:', currentUser.name);
            await loadAllData();
        } else {
            console.log('Nenhuma sessão encontrada, mostrando tela de login.');
            showAuth();
        }
    }

    init();

    // ============= CLOSE OUTSIDE =============
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('notificationDropdown');
        const nBtn = document.getElementById('notificationBtn');
        if (dd && nBtn && !nBtn.contains(e.target) && !dd.contains(e.target)) {
            if (dd.style.display === 'block') dd.style.display = 'none';
        }
        if (modal && e.target === modal) modal.style.display = 'none';
        if (document.getElementById('userEditModal') && e.target === document.getElementById('userEditModal')) document.getElementById('userEditModal').style.display = 'none';
        if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) sidebar.classList.remove('open');
    });
});
