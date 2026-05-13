// localStorage data layer — no Supabase needed

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const STORE = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem('ts_' + key)); } catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem('ts_' + key, JSON.stringify(val));
  },
  _remove(key) {
    localStorage.removeItem('ts_' + key);
  }
};

const DB = {
  // ============= AUTH =============
  async login(username, password) {
    const users = STORE._get('users') || [];
    const user = users.find(u => (u.username === username || u.email === username) && u.password === password);
    if (!user) throw new Error('Usuário ou senha inválidos.');
    const sessionUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar_url || '',
      allowedCategories: user.allowed_categories || [],
      allowedStatuses: user.allowed_statuses || []
    };
    STORE._set('current_user', sessionUser);
    return { user: sessionUser, session: {} };
  },

  async logout() {
    STORE._remove('current_user');
  },

  async getCurrentUser() {
    const user = STORE._get('current_user');
    return { data: { user: user || null }, error: null };
  },

  async getSession() {
    const user = STORE._get('current_user');
    return { data: { session: user ? {} : null }, error: null };
  },

  async signIn(email, password) { return this.login(email, password); },
  async signOut() { return this.logout(); },

  onAuthChange(callback) {
    return { subscription: { unsubscribe: () => {} } };
  },

  // ============= CATEGORIES =============
  async loadCategories() {
    return STORE._get('categories') || [];
  },

  async insertCategory(name, slug) {
    const cats = STORE._get('categories') || [];
    const _slug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (cats.find(c => c.slug === _slug)) throw new Error('Categoria já existe.');
    const cat = { id: cats.length + 1, name, slug: _slug, created_at: new Date().toISOString() };
    cats.push(cat);
    STORE._set('categories', cats);
    return cat;
  },

  async deleteCategory(id) {
    let cats = STORE._get('categories') || [];
    cats = cats.filter(c => c.id !== id);
    STORE._set('categories', cats);
  },

  // ============= STATUSES =============
  async loadStatuses() {
    return STORE._get('statuses') || [];
  },

  async insertStatus(name, slug) {
    const sts = STORE._get('statuses') || [];
    const _slug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (sts.find(s => s.slug === _slug)) throw new Error('Status já existe.');
    const st = { id: sts.length + 1, name, slug: _slug, created_at: new Date().toISOString() };
    sts.push(st);
    STORE._set('statuses', sts);
    return st;
  },

  async deleteStatus(id) {
    let sts = STORE._get('statuses') || [];
    sts = sts.filter(s => s.id !== id);
    STORE._set('statuses', sts);
  },

  // ============= PROFILES / USERS =============
  async loadUsers() {
    const users = STORE._get('users') || [];
    return users.map(u => ({
      ...u,
      avatar: u.avatar_url,
      allowedCategories: u.allowed_categories || [],
      allowedStatuses: u.allowed_statuses || []
    }));
  },

  async loadProfile(userId) {
    const users = STORE._get('users') || [];
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
      email: user.email,
      allowed_categories: user.allowed_categories || [],
      allowed_statuses: user.allowed_statuses || []
    };
  },

  async updateUser(userId, updates) {
    const users = STORE._get('users') || [];
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Usuário não encontrado.');
    const dbUpdates = { ...updates };
    if (updates.avatar) { dbUpdates.avatar_url = updates.avatar; delete dbUpdates.avatar; }
    if (updates.allowedCategories) { dbUpdates.allowed_categories = updates.allowedCategories; delete dbUpdates.allowedCategories; }
    if (updates.allowedStatuses) { dbUpdates.allowed_statuses = updates.allowedStatuses; delete dbUpdates.allowedStatuses; }
    users[idx] = { ...users[idx], ...dbUpdates };
    STORE._set('users', users);
    return this.loadProfile(userId);
  },

  async addUser(userData) {
    const users = STORE._get('users') || [];
    if (users.find(u => u.username === userData.username)) throw new Error('Usuário já existe.');
    const newUser = {
      id: uuid(),
      username: userData.username,
      name: userData.name,
      email: userData.email || userData.username + '@local.local',
      role: userData.role || 'tech',
      password: userData.password || '123456',
      phone: '',
      avatar_url: '',
      allowed_categories: [],
      allowed_statuses: [],
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    STORE._set('users', users);
    return newUser;
  },

  async deleteUser(id) {
    let users = STORE._get('users') || [];
    users = users.filter(u => u.id !== id);
    STORE._set('users', users);
  },

  // ============= TICKETS =============
  async loadTickets() {
    return STORE._get('tickets') || [];
  },

  async insertTicket(ticket) {
    const tickets = STORE._get('tickets') || [];
    const newTicket = {
      id: tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1,
      ticket_id: ticket.ticket_id || `#TK-${Math.floor(Math.random() * 9000 + 1000)}`,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority || 'medium',
      status: ticket.status || 'open',
      description: ticket.description || '',
      created_by: ticket.created_by || null,
      assigned_to: ticket.assigned_to || null,
      created_at: ticket.created_at || new Date().toISOString(),
      closed_at: ticket.closed_at || null
    };
    tickets.unshift(newTicket);
    STORE._set('tickets', tickets);
    return newTicket;
  },

  async updateTicket(id, updates) {
    const tickets = STORE._get('tickets') || [];
    const idx = tickets.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Ticket não encontrado.');
    tickets[idx] = { ...tickets[idx], ...updates };
    STORE._set('tickets', tickets);
    return tickets[idx];
  },

  // ============= NOTIFICATION PREFS =============
  async loadNotifPrefs(userId) {
    const prefs = STORE._get('notif_prefs') || {};
    return prefs[userId] || null;
  },

  async saveNotifPrefs(userId, prefs) {
    const all = STORE._get('notif_prefs') || {};
    all[userId] = prefs;
    STORE._set('notif_prefs', all);
    return all[userId];
  },

  // ============= APPEARANCE PREFS =============
  async loadAppearancePrefs(userId) {
    const prefs = STORE._get('appearance_prefs') || {};
    return prefs[userId] || null;
  },

  async saveAppearancePrefs(userId, prefs) {
    const all = STORE._get('appearance_prefs') || {};
    all[userId] = { ...all[userId], ...prefs };
    STORE._set('appearance_prefs', all);
    return all[userId];
  },

  // ============= SYSTEM CONFIG =============
  async loadSystemConfig() {
    return STORE._get('system_config');
  },

  async saveSystemConfig(config) {
    STORE._set('system_config', config);
    return config;
  },

  // ============= SECURITY =============
  async changePassword(userId, currentPassword, newPassword) {
    const users = STORE._get('users') || [];
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.password !== currentPassword) throw new Error('Senha atual incorreta.');
    user.password = newPassword;
    STORE._set('users', users);
  },

  // ============= INIT =============
  _init() {
    if (STORE._get('_seeded')) return;

    const adminId = uuid();
    const techId = uuid();
    const clientId = uuid();
    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();

    STORE._set('users', [
      { id: adminId, username: 'admin', name: 'Administrador', email: 'admin@admin.com', role: 'admin', password: 'admin123', phone: '(11) 99999-0001', avatar_url: '', allowed_categories: [], allowed_statuses: [], created_at: daysAgo(30) },
      { id: techId, username: 'tech', name: 'Técnico Suporte', email: 'tech@tech.com', role: 'tech', password: 'tech123', phone: '(11) 99999-0002', avatar_url: '', allowed_categories: [], allowed_statuses: [], created_at: daysAgo(25) },
      { id: clientId, username: 'client', name: 'Usuário Final', email: 'client@client.com', role: 'client', password: 'client123', phone: '(11) 99999-0003', avatar_url: '', allowed_categories: [], allowed_statuses: [], created_at: daysAgo(20) }
    ]);

    STORE._set('categories', [
      { id: 1, name: 'Informática/TI', slug: 'ti', created_at: daysAgo(30) },
      { id: 2, name: 'Elétrica', slug: 'electrical', created_at: daysAgo(30) },
      { id: 3, name: 'Predial/Civil', slug: 'building', created_at: daysAgo(30) },
      { id: 4, name: 'Segurança Eletrônica', slug: 'security', created_at: daysAgo(30) },
      { id: 5, name: 'Telecomunicações', slug: 'telecom', created_at: daysAgo(30) }
    ]);

    STORE._set('statuses', [
      { id: 1, name: 'Aberto', slug: 'open', created_at: daysAgo(30) },
      { id: 2, name: 'Em Atendimento', slug: 'in-progress', created_at: daysAgo(30) },
      { id: 3, name: 'Aguardando Peças', slug: 'waiting', created_at: daysAgo(30) },
      { id: 4, name: 'Resolvido', slug: 'resolved', created_at: daysAgo(30) },
      { id: 5, name: 'Fechado', slug: 'closed', created_at: daysAgo(30) }
    ]);

    STORE._set('tickets', [
      { id: 1, ticket_id: '#TK-8902', subject: 'Falha de conexão VPN', category: 'ti', priority: 'critical', status: 'open', description: 'Usuário do setor financeiro não consegue conectar na VPN corporativa. Já tentou reiniciar o computador e o modem.', created_by: adminId, assigned_to: techId, created_at: daysAgo(5), closed_at: null },
      { id: 2, ticket_id: '#TK-8895', subject: 'Substituição de Lâmpadas Setor B', category: 'electrical', priority: 'medium', status: 'in-progress', description: 'Três lâmpadas queimadas no corredor principal do Setor B. Necessário substituição com urgência.', created_by: clientId, assigned_to: techId, created_at: daysAgo(3), closed_at: null },
      { id: 3, ticket_id: '#TK-8880', subject: 'Câmera 04 Offline (Portaria)', category: 'security', priority: 'high', status: 'waiting', description: 'Câmera de segurança da portaria principal parou de transmitir imagens. Já foi verificado cabeamento.', created_by: adminId, assigned_to: null, created_at: daysAgo(1), closed_at: null },
      { id: 4, ticket_id: '#TK-8872', subject: 'Vazamento Ar Condicionado', category: 'building', priority: 'medium', status: 'open', description: 'Vazamento intenso de água no duto central do ar condicionado. Risco de danos aos equipamentos próximos.', created_by: clientId, assigned_to: null, created_at: daysAgo(0), closed_at: null },
      { id: 5, ticket_id: '#TK-8865', subject: 'Troca de nobreak', category: 'electrical', priority: 'low', status: 'resolved', description: 'Nobreak do servidor está emitindo alerta sonoro. Necessário substituição.', created_by: techId, assigned_to: techId, created_at: daysAgo(10), closed_at: daysAgo(8) },
      { id: 6, ticket_id: '#TK-8851', subject: 'Configuração de e-mail no celular', category: 'ti', priority: 'low', status: 'closed', description: 'Usuário não consegue configurar e-mail corporativo no celular Android.', created_by: clientId, assigned_to: techId, created_at: daysAgo(15), closed_at: daysAgo(13) }
    ]);

    STORE._set('system_config', {
      title: 'TechSupport Pro',
      subtitle: 'Enterprise Console',
      logo_url: ''
    });

    STORE._set('_seeded', true);
  }
};

DB._init();
