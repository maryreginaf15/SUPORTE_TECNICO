// Supabase client & data operations
const SUPABASE_URL = 'https://zbcbmhuippmnnhnjuahl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PtUMIvrKhRzAGiFeGnPMwQ_FhqkY35R';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    if (typeof supabase === 'undefined') {
      throw new Error('Biblioteca Supabase não encontrada. Verifique a conexão com a internet.');
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

const DB = {
  // ============= AUTH =============
  async login(email, password) {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    if (!data.user) throw new Error('Usuário não encontrado após login.');

    // Buscar perfil para complementar os dados
    const profile = await this.loadProfile(data.user.id);
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email.split('@')[0],
        role: profile?.role || 'tech',
        phone: profile?.phone || '',
        avatar: profile?.avatar_url || '',
        allowedCategories: profile?.allowed_categories || [],
        allowedStatuses: profile?.allowed_statuses || []
      },
      session: data.session
    };
  },

  async logout() {
    const sb = getSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  async signIn(email, password) { return this.login(email, password); },
  async signOut() { return this.logout(); },

  async getSession() {
    return getSupabase().auth.getSession();
  },

  async getCurrentUser() {
    return getSupabase().auth.getUser();
  },

  onAuthChange(callback) {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data;
  },

  // ============= CATEGORIES =============
  async loadCategories() {
    const { data, error } = await getSupabase().from('categories').select('*').order('id');
    if (error) throw error;
    return data || [];
  },

  async insertCategory(name, slug) {
    const _slug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await getSupabase().from('categories').insert({ name, slug: _slug }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await getSupabase().from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // ============= STATUSES =============
  async loadStatuses() {
    const { data, error } = await getSupabase().from('statuses').select('*').order('id');
    if (error) throw error;
    return data || [];
  },

  async insertStatus(name, slug) {
    const _slug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await getSupabase().from('statuses').insert({ name, slug: _slug }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteStatus(id) {
    const { error } = await getSupabase().from('statuses').delete().eq('id', id);
    if (error) throw error;
  },

  // ============= PROFILES / USERS =============
  async loadUsers() {
    const { data, error } = await getSupabase().from('profiles').select('*').order('created_at');
    if (error) throw error;
    return (data || []).map(u => ({
      ...u,
      avatar: u.avatar_url,
      allowedCategories: u.allowed_categories || [],
      allowedStatuses: u.allowed_statuses || []
    }));
  },

  async loadProfile(userId) {
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  async updateUser(userId, updates) {
    const dbUpdates = { ...updates };
    if (updates.avatar) {
      dbUpdates.avatar_url = updates.avatar;
      delete dbUpdates.avatar;
    }
    if (updates.allowedCategories) {
      dbUpdates.allowed_categories = updates.allowedCategories;
      delete dbUpdates.allowedCategories;
    }
    if (updates.allowedStatuses) {
      dbUpdates.allowed_statuses = updates.allowedStatuses;
      delete dbUpdates.allowedStatuses;
    }

    const { data, error } = await getSupabase().from('profiles').update(dbUpdates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },

  async addUser(userData) {
    const { data, error } = await getSupabase().auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async deleteUser(id) {
    const { error } = await getSupabase().from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // ============= TICKETS =============
  async loadTickets() {
    const { data, error } = await getSupabase().from('tickets').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertTicket(ticket) {
    const { data, error } = await getSupabase().from('tickets').insert(ticket).select().single();
    if (error) throw error;
    return data;
  },

  async updateTicket(id, updates) {
    const { data, error } = await getSupabase().from('tickets').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ============= NOTIFICATION PREFS =============
  async loadNotifPrefs(userId) {
    const { data, error } = await getSupabase().from('notification_preferences').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data;
  },

  async saveNotifPrefs(userId, prefs) {
    const { data, error } = await getSupabase().from('notification_preferences').upsert({
      user_id: userId,
      ...prefs
    }).select().single();
    if (error) throw error;
    return data;
  },

  // ============= APPEARANCE PREFS =============
  async loadAppearancePrefs(userId) {
    const { data, error } = await getSupabase().from('appearance_preferences').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data;
  },

  async saveAppearancePrefs(userId, prefs) {
    const { data, error } = await getSupabase().from('appearance_preferences').upsert({
      user_id: userId,
      ...prefs
    }).select().single();
    if (error) throw error;
    return data;
  },

  // ============= SYSTEM CONFIG =============
  async loadSystemConfig() {
    const { data, error } = await getSupabase().from('system_config').select('*').eq('id', 1).single();
    if (error) return null;
    return data;
  },

  async saveSystemConfig(config) {
    const { data, error } = await getSupabase().from('system_config').upsert({
      id: 1,
      ...config
    }).select().single();
    if (error) throw error;
    return data;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
};
