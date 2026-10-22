/* ============================================================
   auth.js – Authentication Logic
   ============================================================ */

const Auth = {
  // Login
  login(email, password, role = null) {
    const users = DB.getAll(COLLECTIONS.USERS);
    const user = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password &&
      (role ? u.role === role : true)
    );
    if (!user) return { success: false, error: 'Invalid email or password' };
    if (user.status === 'Inactive') return { success: false, error: 'Your account has been deactivated. Contact admin.' };

    const sessionData = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
    Session.set(sessionData);
    return { success: true, user: sessionData };
  },

  // Register
  register(data) {
    const users = DB.getAll(COLLECTIONS.USERS);

    // Check duplicate email
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const prefixMap = { customer: 'USR', advisor: 'ADV', mechanic: 'MEC', admin: 'ADM' };
    const prefix = prefixMap[data.role] || 'USR';

    const newUser = {
      id: DB.generateId(prefix),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      role: data.role || 'customer',
      password: data.password,
      address: data.address || '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    DB.insert(COLLECTIONS.USERS, newUser);

    // Auto login
    const sessionData = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone };
    Session.set(sessionData);

    // Welcome notification
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'),
      userId: newUser.id,
      type: 'welcome',
      title: 'Welcome to VSMS! 🎉',
      message: `Hello ${newUser.name}! Your account has been created successfully. Book your first service now.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return { success: true, user: sessionData };
  },

  // Logout
  logout() {
    Session.clear();
    window.location.href = 'index.html';
  },

  // Get redirect URL by role
  roleRedirect(role) {
    const map = { customer: 'customer.html', advisor: 'advisor.html', mechanic: 'mechanic.html', admin: 'admin.html' };
    return map[role] || 'index.html';
  },

  // Guard – redirect if not logged in or wrong role
  guard(requiredRole = null) {
    const session = Session.get();
    if (!session) { window.location.href = 'login.html'; return null; }
    if (requiredRole && session.role !== requiredRole) {
      window.location.href = Auth.roleRedirect(session.role);
      return null;
    }
    return session;
  },

  // Update profile
  updateProfile(userId, updates) {
    const allowed = ['name', 'phone', 'address', 'email'];
    const filtered = {};
    allowed.forEach(k => { if (updates[k] !== undefined) filtered[k] = updates[k]; });

    // Check email uniqueness
    if (filtered.email) {
      const users = DB.getAll(COLLECTIONS.USERS);
      const dup = users.find(u => u.email.toLowerCase() === filtered.email.toLowerCase() && u.id !== userId);
      if (dup) return { success: false, error: 'Email already in use by another account' };
    }

    const updated = DB.update(COLLECTIONS.USERS, userId, filtered);
    if (!updated) return { success: false, error: 'User not found' };

    // Update session
    const session = Session.get();
    if (session && session.id === userId) {
      Session.set({ ...session, ...filtered });
    }
    return { success: true, user: updated };
  },

  // Change password
  changePassword(userId, current, newPass) {
    const user = DB.getById(COLLECTIONS.USERS, userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.password !== current) return { success: false, error: 'Current password is incorrect' };
    DB.update(COLLECTIONS.USERS, userId, { password: newPass });
    return { success: true };
  }
};

// ------ Auth Form Handlers ------
function initAuthPage() {
  // Redirect if already logged in
  const session = Session.get();
  if (session) {
    window.location.href = Auth.roleRedirect(session.role);
    return;
  }

  // Tab switching
  const loginTab   = document.getElementById('tab-login');
  const registerTab= document.getElementById('tab-register');
  const loginForm  = document.getElementById('login-form-wrap');
  const registerForm = document.getElementById('register-form-wrap');
  const resetForm  = document.getElementById('reset-form-wrap');

  function showTab(tab) {
    [loginForm, registerForm, resetForm].forEach(f => f && f.classList.add('hidden'));
    if (tab === 'login')    { loginForm.classList.remove('hidden');    loginTab.classList.add('active');    registerTab.classList.remove('active'); }
    if (tab === 'register') { registerForm.classList.remove('hidden'); registerTab.classList.add('active'); loginTab.classList.remove('active'); }
    if (tab === 'reset')    { resetForm.classList.remove('hidden'); }
  }

  loginTab?.addEventListener('click',    () => showTab('login'));
  registerTab?.addEventListener('click', () => showTab('register'));
  document.getElementById('goto-register')?.addEventListener('click', () => showTab('register'));
  document.getElementById('goto-login')?.addEventListener('click',    () => showTab('login'));
  document.getElementById('forgot-link')?.addEventListener('click',   () => showTab('reset'));
  document.getElementById('back-to-login')?.addEventListener('click', () => showTab('login'));

  // Check URL param
  if (new URLSearchParams(location.search).get('tab') === 'register') showTab('register');

  // Password Toggle
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.previousElementSibling;
      if (inp) {
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
      }
    });
  });

  // Password Strength
  const regPw = document.getElementById('reg-password');
  if (regPw) {
    regPw.addEventListener('input', () => {
      const v = regPw.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const segs  = document.querySelectorAll('.strength-seg');
      const label = document.getElementById('strength-text');
      const levels = ['','weak','fair','good','strong'];
      const words  = ['','Weak','Fair','Good','Strong'];
      segs.forEach((s, i) => {
        s.className = 'strength-seg ' + (i < score ? `active ${levels[score]}` : '');
      });
      if (label) label.textContent = v ? `Strength: ${words[score]}` : '';
    });
  }

  // Role selection
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const input = opt.querySelector('input');
      if (input) input.checked = true;
    });
  });

  // ---- LOGIN Submit ----
  document.getElementById('login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const form  = e.target;
    const email = form.querySelector('[name="email"]').value;
    const pass  = form.querySelector('[name="password"]').value;
    const role  = form.querySelector('[name="role"]')?.value || null;

    const isValid = Validator.validate(form, {
      email:    ['required', 'email'],
      password: ['required'],
    });
    if (!isValid) return;

    const btn = form.querySelector('[type="submit"]');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    setTimeout(() => {
      const result = Auth.login(email, pass, role || null);
      btn.classList.remove('btn-loading');
      btn.disabled = false;

      if (result.success) {
        Toast.success('Login Successful', `Welcome back, ${result.user.name}!`);
        setTimeout(() => { window.location.href = Auth.roleRedirect(result.user.role); }, 800);
      } else {
        Toast.error('Login Failed', result.error);
        document.getElementById('login-error')?.classList.remove('hidden');
        document.getElementById('login-error-msg').textContent = result.error;
      }
    }, 600);
  });

  // ---- REGISTER Submit ----
  document.getElementById('register-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const isValid = Validator.validate(form, {
      name:     ['required'],
      email:    ['required', 'email'],
      phone:    ['required', 'phone'],
      password: ['required', { fn: v => v.length >= 8, msg: 'Password must be at least 8 characters' }],
      confirm_password: ['required', { fn: v => v === form.querySelector('[name="password"]').value, msg: 'Passwords do not match' }],
    });
    if (!isValid) return;

    const role = form.querySelector('[name="role"]:checked')?.value || 'customer';
    const btn  = form.querySelector('[type="submit"]');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    setTimeout(() => {
      const result = Auth.register({
        name:     form.querySelector('[name="name"]').value,
        email:    form.querySelector('[name="email"]').value,
        phone:    form.querySelector('[name="phone"]').value,
        password: form.querySelector('[name="password"]').value,
        role,
      });

      btn.classList.remove('btn-loading');
      btn.disabled = false;

      if (result.success) {
        Toast.success('Account Created!', 'Redirecting to your dashboard…');
        setTimeout(() => { window.location.href = Auth.roleRedirect(result.user.role); }, 1000);
      } else {
        Toast.error('Registration Failed', result.error);
      }
    }, 800);
  });

  // ---- RESET Submit ----
  document.getElementById('reset-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const isValid = Validator.validate(form, { email: ['required', 'email'] });
    if (!isValid) return;

    const btn = form.querySelector('[type="submit"]');
    btn.classList.add('btn-loading'); btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('btn-loading'); btn.disabled = false;
      Toast.success('Reset Email Sent', 'Check your inbox for password reset instructions (simulated)');
      setTimeout(() => showTab('login'), 2000);
    }, 1000);
  });
}
