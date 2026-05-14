// Configuração do Supabase
const SUPABASE_URL = 'https://qiowrejltobnyutdelhp.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpb3dyZWpsdG9ibnl1dGRlbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODYyMjgsImV4cCI6MjA5NDI2MjIyOH0.eskixl33ZCgEfX6QnY55e430eYB5g97eux8WaEHmX0k';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB = {
  // ============= AUTH =============
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Carregar perfil estendido
    const profile = await this.loadProfile(data.user.id);
        return { 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email.split('@')[0],
        // Heurística: se o e-mail contém 'admin', assume 'admin' caso não haja perfil
        role: profile?.role || (data.user.email.includes('admin') ? 'admin' : 'tech'),
        avatar: profile?.avatar_url || '',
        allowedCategories: profile?.allowed_categories || [],
        allowedStatuses: profile?.allowed_statuses || []
      }, 
      session: data.session 
    };
  },

  async logout() {
    await supabaseClient.auth.signOut();
  },

  async getCurrentUser() {
    return await supabaseClient.auth.getUser();
  },

  async getSession() {
    return await supabaseClient.auth.getSession();
  },

  onAuthChange(callback) {
    return supabaseClient.auth.onAuthStateChange(callback);
  },

  // Função auxiliar para gerar slug robusto
  generateSlug(text) {
    return text.toString().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '')       // Remove caracteres especiais
      .replace(/\s+/g, '-')           // Substitui espaços por hífens
      .replace(/--+/g, '-')           // Remove hífens duplicados
      .trim();
  },

  // ============= CATEGORIES =============
  async loadCategories() {
    const { data, error } = await supabaseClient.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async insertCategory(name, slug) {
    const _slug = slug || this.generateSlug(name);
    const { data, error } = await supabaseClient.from('categories').insert([{ name, slug: _slug }]).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Esta categoria já existe (nome ou slug duplicado).');
      throw error;
    }
    return data;
  },

  async deleteCategory(id) {
    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  async updateCategory(id, name) {
    const slug = this.generateSlug(name);
    const { data, error } = await supabaseClient.from('categories').update({ name, slug }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ============= STATUSES =============
  async loadStatuses() {
    const { data, error } = await supabaseClient.from('statuses').select('*').order('id');
    if (error) throw error;
    return data;
  },

  async insertStatus(name, slug) {
    const _slug = slug || this.generateSlug(name);
    const { data, error } = await supabaseClient.from('statuses').insert([{ name, slug: _slug }]).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Este status já existe (nome ou slug duplicado).');
      throw error;
    }
    return data;
  },

  async deleteStatus(id) {
    const { error } = await supabaseClient.from('statuses').delete().eq('id', id);
    if (error) throw error;
  },

  async updateStatus(id, name) {
    const slug = this.generateSlug(name);
    const { data, error } = await supabaseClient.from('statuses').update({ name, slug }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ============= PROFILES / USERS =============
  async loadUsers() {
    const { data, error } = await supabaseClient.from('profiles').select('*').order('name');
    if (error) throw error;
    return data.map(u => ({
      ...u,
      avatar: u.avatar_url,
      allowedCategories: u.allowed_categories || [],
      allowedStatuses: u.allowed_statuses || []
    }));
  },

  async loadProfile(userId) {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  async updateUser(userId, updates) {
    const dbUpdates = { ...updates };
    // Removemos avatar/avatar_url pois a coluna não existe no banco de dados atual
    delete dbUpdates.avatar;
    delete dbUpdates.avatar_url;
    
    if (updates.allowedCategories) { dbUpdates.allowed_categories = updates.allowedCategories; delete dbUpdates.allowedCategories; }
    if (updates.allowedStatuses) { dbUpdates.allowed_statuses = updates.allowedStatuses; delete dbUpdates.allowedStatuses; }
    
    const { data, error } = await supabaseClient.from('profiles').update(dbUpdates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },

  async addUser(userData) {
    const { data, error } = await supabaseClient.auth.signUp({
      email: userData.email || `${userData.username}@suporte.pro`,
      password: userData.password || 'suporte123',
      options: {
        data: {
          name: userData.name,
          role: userData.role || 'tech'
        }
      }
    });
    if (error) throw error;
    return data.user;
  },

  async deleteUser(id) {
    const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // ============= TICKETS =============
  async loadTickets() {
    const { data, error } = await supabaseClient.from('tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async insertTicket(ticket) {
    const newTicket = {
      ticket_id: ticket.ticket_id || `#TK-${Math.floor(Math.random() * 9000 + 1000)}`,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority || 'medium',
      status: ticket.status || 'open',
      description: ticket.description || '',
      created_by: (await supabaseClient.auth.getUser()).data.user?.id || null,
      assigned_to: ticket.assigned_to || null
    };
    const { data, error } = await supabaseClient.from('tickets').insert([newTicket]).select().single();
    if (error) throw error;
    return data;
  },

  async updateTicket(id, updates) {
    const { data, error } = await supabaseClient.from('tickets').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ============= PREFERENCES =============
  async loadNotifPrefs(userId) {
    const { data, error } = await supabaseClient.from('notification_preferences').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data;
  },

  async saveNotifPrefs(userId, prefs) {
    const { data, error } = await supabaseClient.from('notification_preferences').upsert({ user_id: userId, ...prefs }).select().single();
    if (error) throw error;
    return data;
  },

  async loadAppearancePrefs(userId) {
    const { data, error } = await supabaseClient.from('appearance_preferences').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data;
  },

  async saveAppearancePrefs(userId, prefs) {
    const { data, error } = await supabaseClient.from('appearance_preferences').upsert({ user_id: userId, ...prefs }).select().single();
    if (error) throw error;
    return data;
  },

  // ============= SYSTEM CONFIG =============
  async loadSystemConfig() {
    const { data, error } = await supabaseClient.from('system_config').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async saveSystemConfig(config) {
    const { data, error } = await supabaseClient.from('system_config').upsert({ id: 1, ...config }).select().single();
    if (error) throw error;
    return data;
  },

  // ============= TICKET DELETION =============
  async deleteTicket(id) {
    const { error } = await supabaseClient.from('tickets').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteAllTickets() {
    const { error } = await supabaseClient.from('tickets').delete().neq('id', 0);
    if (error) throw error;
  }
};
