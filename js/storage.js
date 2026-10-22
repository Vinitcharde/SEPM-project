/* ============================================================
   storage.js – Data Layer (localStorage CRUD)
   ============================================================ */

const DB = {
  // Generate unique IDs
  generateId(prefix = 'ID') {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${ts}${rnd}`;
  },

  // Save full collection
  saveAll(key, data) {
    try { localStorage.setItem(`vsms_${key}`, JSON.stringify(data)); return true; }
    catch (e) { console.error('Storage save error:', e); return false; }
  },

  // Get full collection
  getAll(key) {
    try {
      const d = localStorage.getItem(`vsms_${key}`);
      return d ? JSON.parse(d) : [];
    } catch (e) { return []; }
  },

  // Get single record by id
  getById(key, id) {
    return this.getAll(key).find(r => r.id === id) || null;
  },

  // Insert record
  insert(key, record) {
    const all = this.getAll(key);
    all.push(record);
    return this.saveAll(key, all) ? record : null;
  },

  // Update record by id
  update(key, id, updates) {
    const all = this.getAll(key);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveAll(key, all);
    return all[idx];
  },

  // Delete record by id
  delete(key, id) {
    const all = this.getAll(key);
    const filtered = all.filter(r => r.id !== id);
    if (filtered.length === all.length) return false;
    return this.saveAll(key, filtered);
  },

  // Query with filter function
  query(key, filterFn) {
    return this.getAll(key).filter(filterFn);
  },

  // Count records
  count(key, filterFn = null) {
    const all = this.getAll(key);
    return filterFn ? all.filter(filterFn).length : all.length;
  },

  // Check if key has data
  hasData(key) {
    return this.getAll(key).length > 0;
  },

  // Clear a collection
  clear(key) {
    localStorage.removeItem(`vsms_${key}`);
  },

  // Get/Set simple value
  getValue(key, def = null) {
    try {
      const v = localStorage.getItem(`vsms_cfg_${key}`);
      return v !== null ? JSON.parse(v) : def;
    } catch { return def; }
  },
  setValue(key, value) {
    try { localStorage.setItem(`vsms_cfg_${key}`, JSON.stringify(value)); return true; }
    catch { return false; }
  }
};

// ---- Collection Keys ----
const COLLECTIONS = {
  USERS:        'users',
  VEHICLES:     'vehicles',
  APPOINTMENTS: 'appointments',
  JOB_CARDS:    'job_cards',
  SERVICES:     'services',
  MECHANICS:    'mechanics_list',
  INVENTORY:    'inventory',
  INVOICES:     'invoices',
  PAYMENTS:     'payments',
  NOTIFICATIONS:'notifications',
  FEEDBACK:     'feedback',
  SUPPLIERS:    'suppliers',
  SERVICE_HISTORY: 'service_history',
};

// ---- Session Management ----
const Session = {
  set(user) { sessionStorage.setItem('vsms_session', JSON.stringify(user)); },
  get()     {
    try { const s = sessionStorage.getItem('vsms_session'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  },
  clear()   { sessionStorage.removeItem('vsms_session'); },
  isLoggedIn() { return this.get() !== null; },
  role()    { const u = this.get(); return u ? u.role : null; },
  userId()  { const u = this.get(); return u ? u.id : null; },
};
