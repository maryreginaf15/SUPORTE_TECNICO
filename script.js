document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando TechSupport Pro...');
    
    // ============= STATE =============
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
            const { user } = await DB.login(username, password);
            currentUser = user;
            await loadAllData();
        } catch (err) {
            document.getElementById('authLoginBtn').disabled = false;
            document.getElementById('authLoginBtn').textContent = 'Entrar';
            authError.textContent = err.message || 'Erro ao fazer login.';
            authError.style.display = 'block';
        }
    });

    // Enter key on auth fields
    document.getElementById('authPassword')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('authLoginBtn').click();
    });
    document.getElementById('authUsername')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('authLoginBtn').click();
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
    (function() {
        const saved = DB.getCurrentUser();
        if (saved) currentUser = saved;
    })();

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
        if (tickets.length === 0) {
            const now = new Date();
            const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();
            const seedTickets = [
                { ticket_id: '#TK-8902', subject: 'Falha de conexão VPN', category: 'ti', priority: 'critical', status: 'open', description: 'Usuário não consegue conectar na rede externa.', created_by: currentUser?.id, created_at: daysAgo(5) },
                { ticket_id: '#TK-8895', subject: 'Substituição de Lâmpadas Setor B', category: 'electrical', priority: 'medium', status: 'in-progress', description: 'Lâmpadas queimadas no corredor principal.', created_by: currentUser?.id, created_at: daysAgo(3) },
                { ticket_id: '#TK-8880', subject: 'Câmera 04 Offline (Portaria)', category: 'security', priority: 'high', status: 'waiting', description: 'Câmera parou de transmitir imagens subitamente.', created_by: currentUser?.id, created_at: daysAgo(1) },
                { ticket_id: '#TK-8872', subject: 'Vazamento Ar Condicionado', category: 'building', priority: 'medium', status: 'open', description: 'Vazamento intenso de água no duto central.', created_by: currentUser?.id, created_at: daysAgo(0) }
            ];
            for (const t of seedTickets) {
                try {
                    const result = await DB.insertTicket(t);
                    tickets.push({ id: result.ticket_id, subject: result.subject, category: result.category, priority: result.priority, status: result.status, description: result.description, created_at: result.created_at, closed_at: result.closed_at, _dbId: result.id });
                } catch { }
            }
        }
    }

    async function loadAllData() {
        if (!currentUser) { showAuth(); return false; }

        profile = {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            avatar: currentUser.avatar || ''
        };

        // Load users
        const dbUsers = await DB.loadUsers();
        users = dbUsers;

        // Load categories
        const dbCats = await DB.loadCategories();
        categories = dbCats.map(c => ({ id: c.slug, name: c.name, _dbId: c.id }));

        // Load statuses
        const dbStatuses = await DB.loadStatuses();
        statuses = dbStatuses.map(s => ({ id: s.slug, name: s.name, _dbId: s.id }));

        // Load tickets
        const dbTickets = await DB.loadTickets();
        tickets = dbTickets.map(t => ({
            id: t.ticket_id,
            subject: t.subject,
            category: t.category,
            priority: t.priority,
            status: t.status,
            description: t.description || '',
            created_at: t.created_at,
            closed_at: t.closed_at,
            _dbId: t.id
        }));

        // Set allowed categories/statuses for non-admin users
        if (profile.role !== 'admin') {
            const u = users.find(x => x.id === currentUser.id);
            if (u) {
                profile.allowedCategories = u.allowedCategories?.length ? u.allowedCategories : allIds(categories);
                profile.allowedStatuses = u.allowedStatuses?.length ? u.allowedStatuses : allIds(statuses);
            }
        }

        // Load notification prefs
        const np = await DB.loadNotifPrefs(currentUser.id);
        notifPrefs = np ? {
            notifNewTicket: np.notif_new_ticket ?? true,
            notifStatusChange: np.notif_status_change ?? true,
            notifSla: np.notif_sla ?? true,
            notifComments: np.notif_comments ?? true,
            notifReports: np.notif_reports ?? false
        } : { notifNewTicket: true, notifStatusChange: true, notifSla: true, notifComments: true, notifReports: false };

        // Load appearance prefs
        const ap = await DB.loadAppearancePrefs(currentUser.id);
        appearancePrefs = ap ? {
            darkMode: ap.dark_mode ?? false,
            compactMode: ap.compact_mode ?? false,
            monoFont: ap.mono_font ?? true
        } : { darkMode: false, compactMode: false, monoFont: true };

        // Load system config
        try {
            const sc = await DB.loadSystemConfig();
            if (sc) {
                systemConfig = {
                    title: sc.title || 'TechSupport Pro',
                    subtitle: sc.subtitle || 'Enterprise Console',
                    logo_url: sc.logo_url || ''
                };
            }
        } catch { }

        // Seed defaults if empty
        await seedDefaults();

        applyPermissions();
        applySystemConfig();
        showApp();
        return true;
    }

    // ============= TICKETS RENDER =============
    function renderTickets() {
        const dashboardBody = document.getElementById('ticketsBody');
        const myTicketsBody = document.getElementById('myTicketsBody');

        const generateRow = (t) => {
            const cat = categories.find(c => c.id === t.category);
            const st = statuses.find(s => s.id === t.status);
            return `
            <tr data-category="${t.category}" data-status="${t.status}">
                <td class="ticket-id">${t.id}</td>
                <td class="ticket-subject">${t.subject}</td>
                <td><span class="category-badge" style="background:var(--secondary-container);color:var(--on-secondary-container)">${cat ? cat.name : t.category.toUpperCase()}</span></td>
                ${t.priority ? `<td><div class="priority-cell"><div class="priority-dot" style="background:var(--${t.priority === 'critical' ? 'error' : 'secondary'});"></div>${priorityMap[t.priority] || t.priority}</div></td>` : ''}
                <td><span class="status-badge" style="${statusStyle[t.status] || ''}">${st ? st.name : t.status}</span></td>
                <td class="actions-cell">
                    <button class="icon-btn view-ticket" data-id="${t.id}"><span class="material-symbols-outlined">visibility</span></button>
                    <button class="icon-btn assign-ticket" data-id="${t.id}"><span class="material-symbols-outlined">person_add</span></button>
                </td>
            </tr>`;
        };

        if (dashboardBody) dashboardBody.innerHTML = tickets.map(generateRow).join('');
        if (myTicketsBody) myTicketsBody.innerHTML = tickets.map(generateRow).join('');
    }

    // ============= EVENT DELEGATION =============
    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-ticket');
        if (viewBtn) {
            const t = tickets.find(tk => tk.id === viewBtn.dataset.id);
            if (t) { openModal(t); } else { alert('Ticket não encontrado: ' + viewBtn.dataset.id); }
            return;
        }
        const assignBtn = e.target.closest('.assign-ticket');
        if (assignBtn) {
            alert(`Chamado ${assignBtn.dataset.id} atribuído com sucesso!`);
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
        document.getElementById('modalCat').textContent = cat ? cat.name : ticket.category.toUpperCase();
        document.getElementById('modalPriority').textContent = priorityMap[ticket.priority] || ticket.priority;
        const st = statuses.find(s => s.id === ticket.status);
        document.getElementById('modalStatus').textContent = st ? st.name : ticket.status;
        document.getElementById('modalDescription').textContent = ticket.description || 'Sem descrição detalhada.';
        document.getElementById('modalCreatedAt').textContent = formatDate(ticket.created_at);
        document.getElementById('modalClosedAt').textContent = formatDate(ticket.closed_at);

        const isAdmin = getCurrentUser()?.role === 'admin';
        document.getElementById('modalEditBtn').style.display = isAdmin ? 'block' : 'none';
        document.getElementById('modalAdminSection').style.display = 'none';
        document.getElementById('modalStatusFeedback').style.display = 'none';

        if (isAdmin) {
            const select = document.getElementById('modalStatusSelect');
            select.innerHTML = statuses.map(s =>
                `<option value="${s.id}" ${s.id === ticket.status ? 'selected' : ''}>${s.name}</option>`
            ).join('');
        }

        modal.style.display = 'flex';
    }

    document.getElementById('modalEditBtn')?.addEventListener('click', () => {
        document.getElementById('modalAdminSection').style.display = 'block';
    });

    document.getElementById('modalSaveStatusBtn')?.addEventListener('click', async () => {
        if (!currentModalTicket) return;
        const newStatus = document.getElementById('modalStatusSelect').value;
        const fb = document.getElementById('modalStatusFeedback');
        fb.style.display = 'none';

        try {
            const updates = { status: newStatus };
            if (newStatus === 'closed') {
                updates.closed_at = new Date().toISOString();
            } else {
                updates.closed_at = null;
            }

            await DB.updateTicket(currentModalTicket._dbId, updates);

            currentModalTicket.status = newStatus;
            currentModalTicket.closed_at = updates.closed_at;

            const st = statuses.find(s => s.id === newStatus);
            document.getElementById('modalStatus').textContent = st ? st.name : newStatus;
            document.getElementById('modalClosedAt').textContent = formatDate(currentModalTicket.closed_at);

            document.getElementById('modalAdminSection').style.display = 'none';
            renderTickets();

            fb.textContent = 'Status atualizado com sucesso!';
            fb.style.color = 'var(--success, #16a34a)';
            fb.style.display = 'block';
            setTimeout(() => { fb.style.display = 'none'; }, 3000);
        } catch (err) {
            fb.textContent = 'Erro: ' + err.message;
            fb.style.color = 'var(--error)';
            fb.style.display = 'block';
        }
    });

    // ============= NAVIGATION =============
    const navLinks = document.querySelectorAll('.nav-menu .nav-link, .btn-new-ticket, .user-profile');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.querySelector('.page-title');

    function switchView(viewId) {
        sections.forEach(s => s.style.display = 'none');
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.style.display = 'block';
            const titles = { dashboard: 'Dashboard de Suporte', 'new-ticket': 'Novo Chamado', 'my-tickets': 'Meus Chamados', reports: 'Relatórios', settings: 'Configurações' };
            if (pageTitle && titles[viewId]) pageTitle.textContent = titles[viewId];
            navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === viewId));
        }
        if (viewId === 'my-tickets' || viewId === 'dashboard') renderTickets();
        if (viewId === 'settings') renderManagement();
        if (viewId === 'reports') renderReports();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const v = link.dataset.view;
            if (v) { e.preventDefault(); switchView(v); }
        });
    });

    // ============= NAVIGATION =============

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
        profile.name = document.getElementById('profileName').value;
        profile.role = document.getElementById('profileRole').value;
        profile.email = document.getElementById('profileEmail').value;
        profile.phone = document.getElementById('profilePhone').value;
        try {
            await DB.updateUser(currentUser?.id, {
                name: profile.name,
                role: profile.role,
                email: profile.email,
                phone: profile.phone,
                avatar: profile.avatar || ''
            });
            currentUser = DB.getCurrentUser();
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
        settingsTabs.forEach(tab => {
            const tabName = tab.dataset.settingsTab;
            if (tabName === 'management' || tabName === 'notifications') {
                tab.style.display = isAdmin ? 'block' : 'none';
            } else if (tabName === 'appearance') {
                tab.style.display = isClient ? 'none' : 'block';
            } else {
                tab.style.display = 'block';
            }
        });

        // Nav visibility
        const navLinks = document.querySelectorAll('.nav-menu .nav-link');
        navLinks.forEach(link => {
            const view = link.dataset.view;
            if (isClient) {
                link.style.display = view === 'my-tickets' ? 'flex' : 'none';
            } else {
                link.style.display = 'flex';
            }
        });

        // User profile visibility
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) userProfile.style.display = 'flex';

        // Logout button in settings
        let logoutBtn = document.getElementById('settingsLogoutBtn');
        if (!logoutBtn) {
            const settingsContent = document.getElementById('settings-content');
            if (settingsContent) {
                const logoutDiv = document.createElement('div');
                logoutDiv.style.cssText = 'margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--outline-variant);';
                logoutDiv.innerHTML = '<button id="settingsLogoutBtn" style="width:100%;padding:var(--space-sm) var(--space-lg);border-radius:var(--radius-default);border:1px solid var(--error);color:var(--error);font-weight:600;">Sair da conta</button>';
                settingsContent.appendChild(logoutDiv);
                document.getElementById('settingsLogoutBtn')?.addEventListener('click', async () => {
                    await DB.logout();
                    currentUser = null;
                    tickets = [];
                    showAuth();
                });
            }
        }

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
        document.getElementById('logoTitle').textContent = systemConfig.title;
        document.getElementById('logoSubtitle').textContent = systemConfig.subtitle;
        document.title = `${systemConfig.title} - ${systemConfig.subtitle}`;

        const iconSpan = document.getElementById('logoIconSpan');
        const iconImg = document.getElementById('logoIconImg');
        if (systemConfig.logo_url) {
            iconSpan.style.display = 'none';
            iconImg.style.display = 'block';
            iconImg.src = systemConfig.logo_url;
        } else {
            iconSpan.style.display = 'block';
            iconImg.style.display = 'none';
        }
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
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
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
            return `<tr>
                <td><strong>${u.name}</strong> ${isCurrent ? '<span style="font-size:10px;color:var(--primary);font-weight:600;">(ativo)</span>' : ''}</td>
                <td>${u.email}</td>
                <td><span class="user-role-badge ${u.role}">${u.role === 'admin' ? 'Administrador' : u.role === 'tech' ? 'Técnico' : 'Cliente'}</span></td>
                <td style="text-align:right;white-space:nowrap;">
                    <button class="user-config-btn" data-index="${i}" style="color:var(--primary);font-weight:600;font-size:12px;padding:4px 8px;border-radius:4px;">Configurar</button>
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
        if (!username || !name) { alert('Preencha usuário e nome.'); return; }
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert('Já existe um usuário com este nome de usuário.'); return;
        }
        const defaultPassword = '123456';
        try {
            await DB.addUser({ username, name, email, role, password: defaultPassword });
            users = await DB.loadUsers();
            document.getElementById('newUserUsername').value = '';
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserEmail').value = '';
            renderUsers();
            alert(`Usuário ${name} criado! Usuário: ${username}, Senha: ${defaultPassword}`);
        } catch (err) {
            alert('Erro ao criar usuário: ' + err.message);
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
        list.innerHTML = categories.map((c, i) =>
            `<li>${c.name} <button class="item-delete" data-index="${i}"><span class="material-symbols-outlined">delete</span></button></li>`
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
    }

    document.getElementById('addCategoryBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();
        if (!name) return;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (categories.find(c => c.id === slug)) { alert('Categoria já existe!'); return; }
        try {
            const result = await DB.insertCategory(name);
            categories.push({ id: result.slug, name: result.name, _dbId: result.id });
            input.value = '';
            updateCategoryFilter();
            updateFormCategories();
            renderCategories();
        } catch (err) {
            alert('Erro ao adicionar categoria: ' + err.message);
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
        list.innerHTML = statuses.map((s, i) =>
            `<li>${s.name} <button class="item-delete" data-index="${i}"><span class="material-symbols-outlined">delete</span></button></li>`
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
    }

    document.getElementById('addStatusBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('newStatusInput');
        const name = input.value.trim();
        if (!name) return;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (statuses.find(s => s.id === slug)) { alert('Status já existe!'); return; }
        try {
            const result = await DB.insertStatus(name);
            statuses.push({ id: result.slug, name: result.name, _dbId: result.id });
            input.value = '';
            renderStatuses();
        } catch (err) {
            alert('Erro ao adicionar status: ' + err.message);
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
            tickets.unshift({
                id: result.ticket_id,
                subject: result.subject,
                category: result.category,
                priority: result.priority,
                status: result.status,
                description: result.description || '',
                created_at: result.created_at,
                closed_at: result.closed_at,
                _dbId: result.id
            });
            renderTickets();
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
    document.getElementById('btnExportPDF')?.addEventListener('click', () => window.print());

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

        const catCounts = {};
        categories.forEach(c => { catCounts[c.id] = 0; });
        tickets.forEach(t => {
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
            const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
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

    // ============= INIT =============
    async function init() {
        const ok = await loadAllData();
        if (!ok) return;

        applyAppearance();
        loadProfileUI();
        loadNotifUI();
        updateCategoryFilter();
        updateFormCategories();
        renderTickets();
        updateNotifications();
        renderReports();

        if (currentUser?.role === 'client') switchView('my-tickets');
    }

    await init();

    // ============= CLOSE OUTSIDE =============
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('notificationDropdown');
        const nBtn = document.getElementById('notificationBtn');
        if (dd && nBtn && !nBtn.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
        if (modal && e.target === modal) modal.style.display = 'none';
        if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) sidebar.classList.remove('open');
    });
});
