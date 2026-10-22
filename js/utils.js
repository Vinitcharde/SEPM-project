/* ============================================================
   utils.js – Shared Utility Functions
   ============================================================ */

// ------ Toast Notifications ------
const Toast = {
  show(type, title, message, duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      <div class="toast-progress"></div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(title, msg) { this.show('success', title, msg); },
  error(title, msg)   { this.show('error',   title, msg); },
  warning(title, msg) { this.show('warning', title, msg); },
  info(title, msg)    { this.show('info',    title, msg); },
};

// ------ Modal Manager ------
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  },
  confirm(title, message, onConfirm, danger = false) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal modal-sm">
          <div class="modal-header">
            <h3 id="confirm-title"></h3>
            <button class="modal-close" onclick="Modal.close('confirm-modal')">✕</button>
          </div>
          <div class="modal-body"><p id="confirm-message"></p></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Modal.close('confirm-modal')">Cancel</button>
            <button id="confirm-ok" class="btn btn-danger">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    document.getElementById('confirm-title').textContent   = title;
    document.getElementById('confirm-message').textContent = message;
    const btn = document.getElementById('confirm-ok');
    btn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    btn.textContent = danger ? 'Delete' : 'Confirm';
    btn.onclick = () => { Modal.close('confirm-modal'); onConfirm(); };
    this.open('confirm-modal');
  },
};

// Close modals on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// ------ Form Validation ------
const Validator = {
  rules: {
    required: (v)    => (v !== null && v !== undefined && String(v).trim() !== '') || 'This field is required',
    email:    (v)    => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
    phone:    (v)    => /^[6-9]\d{9}$/.test(v.replace(/\s/g,'')) || 'Enter a valid 10-digit phone number',
    min:      (n)    => v => (String(v).length >= n) || `Minimum ${n} characters required`,
    max:      (n)    => v => (String(v).length <= n) || `Maximum ${n} characters allowed`,
    number:   (v)    => (!isNaN(v) && v !== '') || 'Must be a number',
    positive: (v)    => (Number(v) > 0) || 'Must be a positive number',
    year:     (v)    => { const y = Number(v); return (y >= 1990 && y <= new Date().getFullYear()) || `Year must be between 1990 and ${new Date().getFullYear()}`; },
  },

  validate(formEl, schema) {
    let isValid = true;
    this.clearErrors(formEl);

    for (const [field, rules] of Object.entries(schema)) {
      const input = formEl.querySelector(`[name="${field}"]`);
      if (!input) continue;
      const value = input.value;

      for (const rule of rules) {
        let fn, errMsg;
        if (typeof rule === 'string') {
          fn = this.rules[rule]; errMsg = null;
        } else if (typeof rule === 'object') {
          fn = rule.fn; errMsg = rule.msg;
        } else { fn = rule; errMsg = null; }

        if (!fn) continue;
        const result = fn(value);
        if (result !== true) {
          this.showError(input, errMsg || result);
          isValid = false;
          break;
        }
      }
    }
    return isValid;
  },

  showError(input, msg) {
    input.classList.add('is-invalid');
    let err = input.parentElement.querySelector('.form-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'form-error';
      input.parentElement.appendChild(err);
    }
    err.innerHTML = `<span>⚠️</span> ${msg}`;
  },

  clearErrors(formEl) {
    formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    formEl.querySelectorAll('.form-error').forEach(el => el.remove());
  },

  clearFieldError(input) {
    input.classList.remove('is-invalid');
    const err = input.parentElement.querySelector('.form-error');
    if (err) err.remove();
  }
};

// ------ Date/Time Utilities ------
const Fmt = {
  date(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  time(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)  return `${days}d ago`;
    return this.date(dateStr);
  },
  currency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  number(n) { return Number(n || 0).toLocaleString('en-IN'); },
  capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; },
  statusBadge(status) {
    const map = {
      // Appointments
      'Pending':          'badge-warning',
      'Confirmed':        'badge-primary',
      'Checked-In':       'badge-info',
      'Cancelled':        'badge-danger',
      'Completed':        'badge-success',
      'Rescheduled':      'badge-purple',
      // Job Cards
      'Created':          'badge-secondary',
      'Assigned':         'badge-primary',
      'Under Inspection': 'badge-info',
      'Under Repair':     'badge-warning',
      'Quality Check':    'badge-purple',
      'Closed':           'badge-secondary',
      // Inventory
      'In Stock':         'badge-success',
      'Low Stock':        'badge-warning',
      'Out of Stock':     'badge-danger',
      // Payment
      'Paid':             'badge-success',
      'Unpaid':           'badge-warning',
      'Failed':           'badge-danger',
      // User
      'Active':           'badge-success',
      'Inactive':         'badge-danger',
      // Misc
      'Open':             'badge-info',
      'Processing':       'badge-warning',
    };
    const cls = map[status] || 'badge-secondary';
    return `<span class="badge ${cls}">${status}</span>`;
  }
};

// ------ DOM Helpers ------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function setText(sel, text, ctx = document) {
  const el = $(sel, ctx);
  if (el) el.textContent = text;
}

function setHTML(sel, html, ctx = document) {
  const el = $(sel, ctx);
  if (el) el.innerHTML = html;
}

function show(sel, ctx = document) {
  const el = $(sel, ctx);
  if (el) el.classList.remove('hidden');
}

function hide(sel, ctx = document) {
  const el = $(sel, ctx);
  if (el) el.classList.add('hidden');
}

function toggle(sel, condition, ctx = document) {
  const el = $(sel, ctx);
  if (el) el.classList.toggle('hidden', !condition);
}

// ------ Loading State ------
const Loader = {
  show(text = 'Loading…') {
    let el = document.getElementById('global-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loader';
      el.className = 'loading-overlay';
      el.innerHTML = `<div style="text-align:center"><div class="spinner" style="margin:0 auto 16px"></div><p style="color:var(--text-secondary);font-size:.9rem">${text}</p></div>`;
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  },
  hide() {
    const el = document.getElementById('global-loader');
    if (el) el.style.display = 'none';
  }
};

// ------ Search Utility ------
function searchRecords(records, query, fields) {
  if (!query || !query.trim()) return records;
  const q = query.toLowerCase().trim();
  return records.filter(r => fields.some(f => {
    const val = f.split('.').reduce((o, k) => o && o[k], r);
    return val && String(val).toLowerCase().includes(q);
  }));
}

// ------ Render Empty State ------
function renderEmpty(container, msg = 'No records found', icon = '📋', actionHtml = '') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>Nothing Here Yet</h3>
      <p>${msg}</p>
      ${actionHtml}
    </div>`;
}

// ------ Pagination ------
function paginate(arr, page, size) {
  const start = (page - 1) * size;
  return { items: arr.slice(start, start + size), total: arr.length, pages: Math.ceil(arr.length / size), page };
}

function renderPagination(container, pag, onPage) {
  if (pag.pages <= 1) { container.innerHTML = ''; return; }
  const btns = [];
  if (pag.page > 1) btns.push(`<button class="btn btn-sm btn-secondary" data-p="${pag.page - 1}">‹ Prev</button>`);
  for (let i = 1; i <= pag.pages; i++) {
    btns.push(`<button class="btn btn-sm ${i === pag.page ? 'btn-primary' : 'btn-secondary'}" data-p="${i}">${i}</button>`);
  }
  if (pag.page < pag.pages) btns.push(`<button class="btn btn-sm btn-secondary" data-p="${pag.page + 1}">Next ›</button>`);
  container.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px">${btns.join('')}</div>`;
  container.querySelectorAll('[data-p]').forEach(b => {
    b.onclick = () => onPage(Number(b.dataset.p));
  });
}

// ------ Theme ------ */
const Theme = {
  init() {
    const saved = DB.getValue('theme', 'light');
    this.apply(saved);
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    DB.setValue('theme', theme);
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    this.apply(cur === 'dark' ? 'light' : 'dark');
  },
  isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
};

// ------ Print helper ------
function printElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Print</title><style>body{font-family:sans-serif;padding:24px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} @media print{button{display:none}}</style></head><body>${el.innerHTML}<br><button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
}

// ------ Number Animation ------
function animateCount(el, target, duration = 1000) {
  const start = 0;
  const step = (timestamp) => {
    if (!el._start) el._start = timestamp;
    const progress = Math.min((timestamp - el._start) / duration, 1);
    el.textContent = Math.floor(progress * target).toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(step);
    else { el.textContent = target.toLocaleString('en-IN'); delete el._start; }
  };
  requestAnimationFrame(step);
}

// ------ Chart Render ------
function renderBarChart(container, labels, values, color = 'var(--primary)') {
  const max = Math.max(...values, 1);
  container.innerHTML = labels.map((label, i) => `
    <div class="bar-item">
      <div class="bar" style="height:${(values[i]/max)*100}%;background:${color}" data-val="${values[i]}"></div>
      <span class="bar-label">${label}</span>
    </div>`).join('');
}
