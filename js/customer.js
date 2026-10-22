/* ============================================================
   customer.js – Customer Dashboard Logic
   ============================================================ */

let currentUser = null;
let currentPage = { appointments: 1, history: 1 };
let currentInvoiceId = null;
let selectedRating = 0;

// ------ INIT ------
document.addEventListener('DOMContentLoaded', () => {
  seedDatabase();
  Theme.init();
  currentUser = Auth.guard('customer');
  if (!currentUser) return;

  setupUI();
  setupSidebar();
  setupTopnav();
  loadDashboard();
  loadNotifications();

  // Default view
  switchView('dashboard');

  // Sidebar nav delegation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length > 1) runGlobalSearch(q);
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    Modal.confirm('Logout', 'Are you sure you want to logout?', () => Auth.logout());
  });
});

// ------ UI Setup ------
function setupUI() {
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('topnavAvatar').textContent  = initials;
  document.getElementById('topnavName').textContent    = currentUser.name;
  document.getElementById('dashWelcomeName').textContent = currentUser.name.split(' ')[0];
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = currentUser.name;
  document.getElementById('profileEmail').textContent  = currentUser.email;

  // Profile form pre-fill
  const user = DB.getById(COLLECTIONS.USERS, currentUser.id);
  if (user) {
    document.getElementById('prof-name').value    = user.name    || '';
    document.getElementById('prof-email').value   = user.email   || '';
    document.getElementById('prof-phone').value   = user.phone   || '';
    document.getElementById('prof-address').value = user.address || '';
  }
}

// ------ Sidebar ------
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const topnav  = document.getElementById('topnav');
  const content = document.getElementById('mainContent');
  const toggle  = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('mobileOverlay');

  toggle?.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    topnav?.classList.toggle('sidebar-collapsed', collapsed);
    content?.classList.toggle('sidebar-collapsed', collapsed);
    // On mobile: open/close
    if (window.innerWidth <= 1024) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    }
    toggle.setAttribute('aria-expanded', !collapsed);
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// ------ Topnav ------
function setupTopnav() {
  // Theme
  const themeBtn = document.getElementById('themeToggle');
  const darkSwitch = document.getElementById('darkModeSwitch');
  if (themeBtn) {
    themeBtn.textContent = Theme.isDark() ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
      Theme.toggle();
      themeBtn.textContent = Theme.isDark() ? '☀️' : '🌙';
      if (darkSwitch) darkSwitch.checked = Theme.isDark();
    });
  }
  if (darkSwitch) {
    darkSwitch.checked = Theme.isDark();
    darkSwitch.addEventListener('change', () => {
      Theme.apply(darkSwitch.checked ? 'dark' : 'light');
      if (themeBtn) themeBtn.textContent = Theme.isDark() ? '☀️' : '🌙';
    });
  }

  // Notif panel
  document.getElementById('notifBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('notifPanel')?.classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('notifPanel')?.classList.remove('open'));

  // User dropdown
  document.getElementById('userMenuBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    const menu = document.getElementById('userMenu');
    menu?.classList.toggle('open');
    document.getElementById('userMenuBtn').setAttribute('aria-expanded', menu?.classList.contains('open'));
  });
  document.addEventListener('click', () => document.getElementById('userMenu')?.classList.remove('open'));

  // Mark all read
  document.getElementById('markAllRead')?.addEventListener('click', markAllNotificationsRead);
  document.getElementById('markAllReadBtn')?.addEventListener('click', markAllNotificationsRead);

  // Settings
  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    Toast.success('Settings Saved', 'Your preferences have been updated');
  });

  // Profile form
  document.getElementById('profileForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const valid = Validator.validate(form, { name:['required'], email:['required','email'], phone:['required','phone'] });
    if (!valid) return;
    const result = Auth.updateProfile(currentUser.id, {
      name:    form.querySelector('[name="name"]').value,
      email:   form.querySelector('[name="email"]').value,
      phone:   form.querySelector('[name="phone"]').value,
      address: form.querySelector('[name="address"]').value,
    });
    if (result.success) {
      currentUser = Session.get();
      setupUI();
      Toast.success('Profile Updated', 'Your profile has been saved successfully');
    } else {
      Toast.error('Error', result.error);
    }
  });

  // Password form
  document.getElementById('passwordForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const current = form.querySelector('[name="current"]').value;
    const newPass  = form.querySelector('[name="newPass"]').value;
    const confirm  = form.querySelector('[name="confirmPass"]').value;
    if (newPass !== confirm) { Toast.error('Error', 'Passwords do not match'); return; }
    if (newPass.length < 8)  { Toast.error('Error', 'New password must be at least 8 characters'); return; }
    const result = Auth.changePassword(currentUser.id, current, newPass);
    if (result.success) { Toast.success('Password Updated', 'Your password has been changed'); form.reset(); }
    else { Toast.error('Error', result.error); }
  });
}

// ------ View Switcher ------
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${viewName}`);
  if (view) view.classList.add('active');

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Lazy-load view data
  const loaders = {
    'dashboard':     loadDashboard,
    'vehicles':      loadVehicles,
    'book-service':  loadBookingForm,
    'appointments':  loadAppointments,
    'tracking':      loadTracking,
    'history':       loadHistory,
    'invoices':      loadInvoices,
    'payments':      loadPayments,
    'notifications': loadNotificationsView,
    'feedback':      loadFeedback,
  };
  if (loaders[viewName]) loaders[viewName]();
}

// ------ DASHBOARD ------
function loadDashboard() {
  const myVehicles     = DB.query(COLLECTIONS.VEHICLES, v => v.customerId === currentUser.id);
  const myAppointments = DB.query(COLLECTIONS.APPOINTMENTS, a => a.customerId === currentUser.id);
  const now = new Date();
  const upcoming   = myAppointments.filter(a => new Date(a.date) >= now && ['Pending','Confirmed'].includes(a.status));
  const active     = myAppointments.filter(a => a.status === 'Checked-In');
  const completed  = myAppointments.filter(a => a.status === 'Completed');
  const myInvoices = DB.query(COLLECTIONS.INVOICES, i => i.customerId === currentUser.id && i.status === 'Unpaid');

  animateCount(document.getElementById('statVehicles'), myVehicles.length);
  animateCount(document.getElementById('statUpcoming'), upcoming.length);
  animateCount(document.getElementById('statActive'),   active.length);
  animateCount(document.getElementById('statCompleted'), completed.length);
  animateCount(document.getElementById('statPending'),   myInvoices.length);

  // Recent appointments
  const recentEl = document.getElementById('recentAppointments');
  const recent = myAppointments.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,4);
  if (recent.length === 0) {
    renderEmpty(recentEl, 'No appointments yet. Book your first service!', '📅',
      `<button class="btn btn-primary btn-sm" onclick="switchView('book-service')">Book Service</button>`);
  } else {
    recentEl.innerHTML = recent.map(apt => {
      const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId);
      const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId);
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">📅</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.875rem">${svc?.name || 'Service'}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${veh?.registrationNo || ''} · ${Fmt.date(apt.date)}</div>
        </div>
        ${Fmt.statusBadge(apt.status)}
      </div>`;
    }).join('');
  }

  // Dashboard vehicles
  const vehEl = document.getElementById('dashboardVehicles');
  if (myVehicles.length === 0) {
    renderEmpty(vehEl, 'No vehicles registered. Add your first vehicle!', '🚗',
      `<button class="btn btn-primary btn-sm" onclick="switchView('vehicles')">Add Vehicle</button>`);
  } else {
    vehEl.innerHTML = myVehicles.slice(0,4).map(v => `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">🚗</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.875rem">${v.model}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${v.registrationNo} · ${v.fuelType}</div>
        </div>
        <span class="badge badge-success">${v.year}</span>
      </div>`).join('');
  }
}

// ------ VEHICLES ------
function loadVehicles() {
  const container = document.getElementById('vehiclesContainer');
  const myVehicles = DB.query(COLLECTIONS.VEHICLES, v => v.customerId === currentUser.id);

  // Search
  const searchEl = document.getElementById('vehicleSearch');
  searchEl.oninput = () => renderVehiclesGrid(myVehicles);
  renderVehiclesGrid(myVehicles);

  // Add vehicle
  document.getElementById('addVehicleBtn').onclick = () => openVehicleModal(null);
}

function renderVehiclesGrid(vehicles) {
  const q = document.getElementById('vehicleSearch')?.value || '';
  const filtered = searchRecords(vehicles, q, ['registrationNo','model','type','fuelType','color']);
  const container = document.getElementById('vehiclesContainer');

  if (filtered.length === 0) {
    renderEmpty(container, 'No vehicles found. Add your first vehicle!', '🚗',
      `<button class="btn btn-primary" onclick="openVehicleModal(null)">+ Add Vehicle</button>`);
    return;
  }

  container.innerHTML = `<div class="grid-3">` + filtered.map(v => `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
          <div style="width:52px;height:52px;border-radius:var(--radius);background:linear-gradient(135deg,var(--primary),var(--purple));display:flex;align-items:center;justify-content:center;font-size:1.5rem" aria-hidden="true">🚗</div>
          <div>${Fmt.statusBadge(v.status || 'Active')}</div>
        </div>
        <h4 style="margin-bottom:4px">${v.model}</h4>
        <p style="font-size:.8125rem;color:var(--text-muted);margin-bottom:12px">${v.registrationNo}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">Type:</span><br><strong>${v.type}</strong></div>
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">Year:</span><br><strong>${v.year}</strong></div>
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">Fuel:</span><br><strong>${v.fuelType}</strong></div>
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">Mileage:</span><br><strong>${v.mileage ? v.mileage.toLocaleString('en-IN') + ' km' : '—'}</strong></div>
          ${v.color ? `<div style="font-size:.78rem"><span style="color:var(--text-muted)">Color:</span><br><strong>${v.color}</strong></div>` : ''}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-outline-primary" onclick="openVehicleModal('${v.id}')" aria-label="Edit ${v.model}">✏️ Edit</button>
          <button class="btn btn-sm btn-outline-danger"  onclick="deleteVehicle('${v.id}')" aria-label="Delete ${v.model}">🗑️ Delete</button>
          <button class="btn btn-sm btn-ghost"           onclick="bookForVehicle('${v.id}')" aria-label="Book service for ${v.model}">📅 Book</button>
        </div>
      </div>
    </div>`).join('') + `</div>`;
}

function openVehicleModal(id) {
  const form   = document.getElementById('vehicleForm');
  const title  = document.getElementById('vehicleModalTitle');
  form.reset();
  document.getElementById('vehicle-id').value = '';

  if (id) {
    const v = DB.getById(COLLECTIONS.VEHICLES, id);
    if (!v) return;
    title.textContent = 'Edit Vehicle';
    document.getElementById('vehicle-id').value  = v.id;
    document.getElementById('veh-reg').value     = v.registrationNo;
    document.getElementById('veh-model').value   = v.model;
    document.getElementById('veh-type').value    = v.type;
    document.getElementById('veh-year').value    = v.year;
    document.getElementById('veh-fuel').value    = v.fuelType;
    document.getElementById('veh-color').value   = v.color || '';
    document.getElementById('veh-mileage').value = v.mileage || '';
  } else {
    title.textContent = 'Add New Vehicle';
  }

  Validator.clearErrors(form);
  Modal.open('vehicleModal');

  document.getElementById('vehicleSaveBtn').onclick = () => saveVehicle();
}

function saveVehicle() {
  const form  = document.getElementById('vehicleForm');
  const valid = Validator.validate(form, {
    registrationNo: ['required'],
    model: ['required'],
    type:  ['required'],
    year:  ['required', { fn: v => Validator.rules.year(v) === true, msg: `Year must be between 1990 and ${new Date().getFullYear()}` }],
    fuelType: ['required'],
  });
  if (!valid) return;

  const id = document.getElementById('vehicle-id').value;
  const data = {
    registrationNo: document.getElementById('veh-reg').value.toUpperCase().trim(),
    model:          document.getElementById('veh-model').value.trim(),
    type:           document.getElementById('veh-type').value,
    year:           Number(document.getElementById('veh-year').value),
    fuelType:       document.getElementById('veh-fuel').value,
    color:          document.getElementById('veh-color').value.trim(),
    mileage:        Number(document.getElementById('veh-mileage').value) || 0,
    status:         'Active',
  };

  if (id) {
    DB.update(COLLECTIONS.VEHICLES, id, data);
    Toast.success('Vehicle Updated', `${data.model} has been updated`);
  } else {
    // Check duplicate registration
    const all = DB.getAll(COLLECTIONS.VEHICLES);
    if (all.find(v => v.registrationNo === data.registrationNo)) {
      Toast.error('Error', 'A vehicle with this registration number already exists');
      return;
    }
    DB.insert(COLLECTIONS.VEHICLES, { id: DB.generateId('VEH'), customerId: currentUser.id, ...data, createdAt: new Date().toISOString() });
    Toast.success('Vehicle Added', `${data.model} has been registered`);
  }

  Modal.close('vehicleModal');
  loadVehicles();
  loadDashboard();
}

function deleteVehicle(id) {
  const v = DB.getById(COLLECTIONS.VEHICLES, id);
  if (!v) return;
  Modal.confirm('Delete Vehicle', `Delete ${v.model} (${v.registrationNo})? This cannot be undone.`, () => {
    DB.delete(COLLECTIONS.VEHICLES, id);
    Toast.success('Vehicle Deleted', `${v.model} has been removed`);
    loadVehicles();
    loadDashboard();
  }, true);
}

function bookForVehicle(vehicleId) {
  switchView('book-service');
  setTimeout(() => {
    const sel = document.getElementById('book-vehicle');
    if (sel) sel.value = vehicleId;
  }, 100);
}

// ------ BOOKING ------
function loadBookingForm() {
  const myVehicles = DB.query(COLLECTIONS.VEHICLES, v => v.customerId === currentUser.id);
  const services   = DB.getAll(COLLECTIONS.SERVICES);

  const vehSel = document.getElementById('book-vehicle');
  vehSel.innerHTML = '<option value="">-- Select your vehicle --</option>' +
    myVehicles.map(v => `<option value="${v.id}">${v.model} (${v.registrationNo})</option>`).join('');

  const svcSel = document.getElementById('book-service');
  svcSel.innerHTML = '<option value="">-- Select service type --</option>' +
    services.map(s => `<option value="${s.id}">${s.name} – ₹${s.price.toLocaleString('en-IN')}</option>`).join('');

  // Set min date to tomorrow
  const dateInput = document.getElementById('book-date');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];

  // Service preview
  svcSel.addEventListener('change', () => {
    const svc = DB.getById(COLLECTIONS.SERVICES, svcSel.value);
    const preview = document.getElementById('servicePreview');
    if (svc) {
      preview.classList.remove('hidden');
      preview.innerHTML = `<strong>${svc.name}</strong> – ${svc.description}<br>
        <span>⏱️ Est. duration: ${svc.duration}h</span> | <span>💰 Price: ${Fmt.currency(svc.price)}</span>`;
    } else {
      preview.classList.add('hidden');
    }
  });

  // Services list
  const listEl = document.getElementById('servicesListPreview');
  listEl.innerHTML = services.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer"
         onclick="document.getElementById('book-service').value='${s.id}';document.getElementById('book-service').dispatchEvent(new Event('change'))">
      <div>
        <div style="font-weight:600;font-size:.875rem">${s.name}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${s.category} · ${s.duration}h</div>
      </div>
      <span style="font-weight:700;color:var(--primary);font-size:.875rem">${Fmt.currency(s.price)}</span>
    </div>`).join('');

  // Submit
  document.getElementById('bookingForm').onsubmit = submitBooking;
}

function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  const valid = Validator.validate(form, {
    vehicleId:     ['required'],
    serviceId:     ['required'],
    serviceCenter: ['required'],
    date:          ['required'],
    time:          ['required'],
  });
  if (!valid) return;

  const vehicleId     = form.querySelector('[name="vehicleId"]').value;
  const serviceId     = form.querySelector('[name="serviceId"]').value;
  const serviceCenter = form.querySelector('[name="serviceCenter"]').value;
  const date          = form.querySelector('[name="date"]').value;
  const time          = form.querySelector('[name="time"]').value;
  const notes         = form.querySelector('[name="notes"]').value;

  const btn = document.getElementById('bookSubmitBtn');
  btn.classList.add('btn-loading'); btn.disabled = true;

  setTimeout(() => {
    const apt = {
      id: DB.generateId('APT'),
      customerId:    currentUser.id,
      vehicleId, serviceId, serviceCenter,
      date: new Date(`${date}T${time}:00`).toISOString(),
      time, notes, status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    DB.insert(COLLECTIONS.APPOINTMENTS, apt);

    // Notification
    const svc = DB.getById(COLLECTIONS.SERVICES, serviceId);
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'), userId: currentUser.id, type: 'appointment',
      title: 'Appointment Booked!',
      message: `Your ${svc?.name} appointment (${apt.id}) is booked for ${Fmt.date(apt.date)} at ${time}. Status: Pending confirmation.`,
      read: false, createdAt: new Date().toISOString()
    });

    btn.classList.remove('btn-loading'); btn.disabled = false;
    Toast.success('Appointment Booked!', `${apt.id} confirmed. You'll receive a notification shortly.`);
    form.reset();
    document.getElementById('servicePreview').classList.add('hidden');
    loadNotifications();
    setTimeout(() => switchView('appointments'), 1200);
  }, 800);
}

// ------ APPOINTMENTS ------
function loadAppointments() {
  const myApts = DB.query(COLLECTIONS.APPOINTMENTS, a => a.customerId === currentUser.id)
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const search = document.getElementById('aptSearch');
  const filter = document.getElementById('aptStatusFilter');

  const render = () => {
    const q   = search?.value || '';
    const st  = filter?.value || '';
    let filtered = myApts;
    if (st) filtered = filtered.filter(a => a.status === st);
    if (q)  filtered = searchRecords(filtered, q, ['id','status','serviceCenter','time']);
    renderAppointmentsTable(filtered);
  };

  search?.addEventListener('input', render);
  filter?.addEventListener('change', render);
  render();
}

function renderAppointmentsTable(apts) {
  const pag  = paginate(apts, currentPage.appointments, 8);
  const tbody = document.getElementById('appointmentsTableBody');

  if (apts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:30px">
      <div class="empty-state-icon">📅</div><h3>No Appointments Found</h3>
      <button class="btn btn-primary btn-sm" onclick="switchView('book-service')">Book Service</button></div></td></tr>`;
    return;
  }

  tbody.innerHTML = pag.items.map(apt => {
    const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId);
    const veh = DB.getById(COLLECTIONS.VEHICLES,  apt.vehicleId);
    const canCancel     = ['Pending','Confirmed'].includes(apt.status);
    const canReschedule = ['Pending','Confirmed'].includes(apt.status);
    return `<tr>
      <td><strong>${apt.id}</strong></td>
      <td>${veh ? `<div style="font-weight:600;font-size:.85rem">${veh.model}</div><div style="font-size:.75rem;color:var(--text-muted)">${veh.registrationNo}</div>` : '—'}</td>
      <td>${svc?.name || '—'}</td>
      <td><div style="font-weight:600;font-size:.85rem">${Fmt.date(apt.date)}</div><div style="font-size:.75rem;color:var(--text-muted)">${apt.time}</div></td>
      <td>${apt.serviceCenter}</td>
      <td>${Fmt.statusBadge(apt.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewAppointment('${apt.id}')" aria-label="View appointment ${apt.id}">👁️</button>
          ${canReschedule ? `<button class="btn btn-sm btn-outline-primary" onclick="openReschedule('${apt.id}')" aria-label="Reschedule">📅</button>` : ''}
          ${canCancel     ? `<button class="btn btn-sm btn-outline-danger"  onclick="cancelAppointment('${apt.id}')" aria-label="Cancel">✕</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(document.getElementById('aptPagination'), pag, p => {
    currentPage.appointments = p;
    renderAppointmentsTable(apts);
  });
}

function viewAppointment(id) {
  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, id);
  if (!apt) return;
  const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId);
  const veh = DB.getById(COLLECTIONS.VEHICLES,  apt.vehicleId);
  const jc  = DB.query(COLLECTIONS.JOB_CARDS, j => j.appointmentId === id)[0];

  document.getElementById('aptDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><div class="text-muted text-sm">Appointment ID</div><div class="font-bold">${apt.id}</div></div>
      <div><div class="text-muted text-sm">Status</div>${Fmt.statusBadge(apt.status)}</div>
      <div><div class="text-muted text-sm">Service</div><div class="font-semibold">${svc?.name || '—'}</div></div>
      <div><div class="text-muted text-sm">Service Center</div><div>${apt.serviceCenter}</div></div>
      <div><div class="text-muted text-sm">Date</div><div>${Fmt.date(apt.date)}</div></div>
      <div><div class="text-muted text-sm">Time</div><div>${apt.time}</div></div>
      <div><div class="text-muted text-sm">Vehicle</div><div>${veh?.model} (${veh?.registrationNo})</div></div>
      <div><div class="text-muted text-sm">Booked On</div><div>${Fmt.datetime(apt.createdAt)}</div></div>
      ${apt.notes ? `<div style="grid-column:1/-1"><div class="text-muted text-sm">Notes</div><div>${apt.notes}</div></div>` : ''}
    </div>
    ${jc ? `<hr class="divider"><h4>Job Card: ${jc.id}</h4>
    <p><strong>Status:</strong> ${jc.status}</p>
    <p><strong>Complaint:</strong> ${jc.complaint}</p>
    ${jc.inspectionDetails ? `<p><strong>Inspection:</strong> ${jc.inspectionDetails}</p>` : ''}` : ''}`;

  Modal.open('aptDetailModal');
}

function openReschedule(id) {
  document.getElementById('reschedule-apt-id').value = id;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('reschedule-date').min = tomorrow.toISOString().split('T')[0];
  document.getElementById('confirmReschedule').onclick = () => confirmReschedule(id);
  Modal.open('rescheduleModal');
}

function confirmReschedule(id) {
  const date = document.getElementById('reschedule-date').value;
  const time = document.getElementById('reschedule-time').value;
  if (!date || !time) { Toast.warning('Required', 'Please select new date and time'); return; }
  DB.update(COLLECTIONS.APPOINTMENTS, id, { date: new Date(`${date}T${time}:00`).toISOString(), time, status: 'Rescheduled' });
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'), userId: currentUser.id, type: 'appointment',
    title: 'Appointment Rescheduled',
    message: `Your appointment ${id} has been rescheduled to ${Fmt.date(date)} at ${time}.`,
    read: false, createdAt: new Date().toISOString()
  });
  Modal.close('rescheduleModal');
  Toast.success('Rescheduled', `Appointment moved to ${Fmt.date(date)} at ${time}`);
  loadAppointments();
  loadNotifications();
}

function cancelAppointment(id) {
  Modal.confirm('Cancel Appointment', 'Are you sure you want to cancel this appointment?', () => {
    DB.update(COLLECTIONS.APPOINTMENTS, id, { status: 'Cancelled' });
    Toast.success('Cancelled', 'Your appointment has been cancelled');
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'), userId: currentUser.id, type: 'appointment',
      title: 'Appointment Cancelled',
      message: `Your appointment ${id} has been cancelled.`,
      read: false, createdAt: new Date().toISOString()
    });
    loadAppointments();
    loadDashboard();
    loadNotifications();
  }, true);
}

// ------ TRACKING ------
function loadTracking() {
  const container = document.getElementById('trackingContainer');
  const activeApts = DB.query(COLLECTIONS.APPOINTMENTS, a =>
    a.customerId === currentUser.id && ['Checked-In','Confirmed','Pending'].includes(a.status));
  const completedApts = DB.query(COLLECTIONS.APPOINTMENTS, a =>
    a.customerId === currentUser.id && a.status === 'Completed').slice(0,3);

  if (activeApts.length === 0 && completedApts.length === 0) {
    renderEmpty(container, 'No active services to track', '📍',
      `<button class="btn btn-primary" onclick="switchView('book-service')">Book a Service</button>`);
    return;
  }

  const allToShow = [...activeApts, ...completedApts];
  container.innerHTML = allToShow.map(apt => renderTrackingCard(apt)).join('');
}

function renderTrackingCard(apt) {
  const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId);
  const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId);
  const jc  = DB.query(COLLECTIONS.JOB_CARDS, j => j.appointmentId === apt.id)[0];

  const statusMap = {
    'Pending':    0, 'Confirmed': 1, 'Checked-In': 2,
    'Rescheduled': 1, 'Completed': 7, 'Cancelled': -1
  };
  let step = statusMap[apt.status] ?? 0;
  if (jc) {
    const jcMap = { 'Created':0, 'Assigned':1, 'Under Inspection':2, 'Under Repair':3, 'Quality Check':4, 'Completed':5, 'Closed':6 };
    step = Math.max(step, (jcMap[jc.status] ?? 0) + 2);
  }

  const steps = [
    { icon:'📅', label:'Confirmed' },
    { icon:'🚗', label:'Checked-In' },
    { icon:'🔍', label:'Inspection' },
    { icon:'🔧', label:'Repair' },
    { icon:'✅', label:'Quality Check' },
    { icon:'🧾', label:'Invoice' },
    { icon:'💳', label:'Payment' },
    { icon:'🎉', label:'Completed' },
  ];

  return `
  <div class="card mb-4">
    <div class="card-header">
      <div>
        <h3 class="card-title">${svc?.name || 'Service'} – ${apt.id}</h3>
        <p class="card-subtitle">${veh?.model} (${veh?.registrationNo}) · ${Fmt.date(apt.date)}</p>
      </div>
      ${Fmt.statusBadge(apt.status)}
    </div>
    <div class="card-body">
      <div class="service-tracker" role="list" aria-label="Service progress">
        ${steps.map((s, i) => {
          const isDone   = i < step;
          const isActive = i === step;
          return `
          <div class="tracker-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}" role="listitem"
               aria-label="${s.label}: ${isDone ? 'completed' : isActive ? 'in progress' : 'pending'}">
            <div class="tracker-dot" aria-hidden="true">${isDone ? '✓' : s.icon}</div>
            <div class="tracker-label">${s.label}</div>
          </div>`;
        }).join('')}
      </div>
      ${jc ? `<div class="alert alert-info mt-4">
        <span>ℹ️</span>
        <div><strong>Latest Update:</strong> ${jc.inspectionDetails || jc.complaint || 'Job card created'}</div>
      </div>` : ''}
    </div>
  </div>`;
}

// ------ SERVICE HISTORY ------
function loadHistory() {
  const myVehicles = DB.query(COLLECTIONS.VEHICLES, v => v.customerId === currentUser.id);
  const myApts     = DB.query(COLLECTIONS.APPOINTMENTS, a => a.customerId === currentUser.id && a.status === 'Completed');
  const myJCs      = DB.query(COLLECTIONS.JOB_CARDS, j => j.customerId === currentUser.id);

  // Populate vehicle filter
  const vehFilter = document.getElementById('histVehicleFilter');
  vehFilter.innerHTML = '<option value="">All Vehicles</option>' +
    myVehicles.map(v => `<option value="${v.id}">${v.model} (${v.registrationNo})</option>`).join('');

  const render = () => {
    const q      = document.getElementById('histSearch')?.value || '';
    const vehId  = document.getElementById('histVehicleFilter')?.value || '';
    const dFrom  = document.getElementById('histDateFrom')?.value || '';
    const dTo    = document.getElementById('histDateTo')?.value   || '';

    let filtered = myJCs;
    if (vehId) filtered = filtered.filter(j => j.vehicleId === vehId);
    if (dFrom) filtered = filtered.filter(j => new Date(j.createdAt) >= new Date(dFrom));
    if (dTo)   filtered = filtered.filter(j => new Date(j.createdAt) <= new Date(dTo + 'T23:59:59'));
    if (q)     filtered = searchRecords(filtered, q, ['id','complaint','status']);

    renderHistoryTable(filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  document.getElementById('histSearch')?.addEventListener('input', render);
  document.getElementById('histVehicleFilter')?.addEventListener('change', render);
  document.getElementById('histDateFrom')?.addEventListener('change', render);
  document.getElementById('histDateTo')?.addEventListener('change', render);
  render();
}

function renderHistoryTable(jcs) {
  const pag  = paginate(jcs, currentPage.history, 8);
  const tbody = document.getElementById('historyTableBody');

  if (jcs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:30px"><div class="empty-state-icon">📋</div><h3>No Service History</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = pag.items.map(jc => {
    const veh  = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId);
    const apt  = DB.getById(COLLECTIONS.APPOINTMENTS, jc.appointmentId);
    const svc  = apt ? DB.getById(COLLECTIONS.SERVICES, apt.serviceId) : null;
    const mec  = DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId);
    const cost = jc.actualCost ?? jc.estimatedCost;
    return `<tr>
      <td><strong>${jc.id}</strong></td>
      <td>${veh ? `<div class="font-semibold">${veh.model}</div><div class="text-xs text-muted">${veh.registrationNo}</div>` : '—'}</td>
      <td>${svc?.name || '—'}</td>
      <td>${Fmt.date(jc.createdAt)}</td>
      <td>${mec?.name || '—'}</td>
      <td>${cost ? Fmt.currency(cost) : '—'}</td>
      <td>${Fmt.statusBadge(jc.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewJobCard('${jc.id}')" aria-label="View job card">👁️</button>
          ${jc.status === 'Closed' || jc.status === 'Completed' ? `<button class="btn btn-sm btn-outline-primary" onclick="viewInvoice('${jc.id}')" aria-label="View invoice">🧾</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(document.getElementById('histPagination'), pag, p => {
    currentPage.history = p;
    renderHistoryTable(jcs);
  });
}

function viewJobCard(id) {
  const jc  = DB.getById(COLLECTIONS.JOB_CARDS, id);
  if (!jc) return;
  const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId);
  const mec = DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId);
  document.getElementById('aptDetailContent').innerHTML = `
    <h4 style="margin-bottom:16px">Job Card: ${jc.id}</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:.875rem">
      <div><div class="text-muted text-sm">Vehicle</div><div class="font-semibold">${veh?.model} (${veh?.registrationNo})</div></div>
      <div><div class="text-muted text-sm">Status</div>${Fmt.statusBadge(jc.status)}</div>
      <div><div class="text-muted text-sm">Mechanic</div><div>${mec?.name || '—'}</div></div>
      <div><div class="text-muted text-sm">Est. Cost</div><div>${Fmt.currency(jc.estimatedCost)}</div></div>
      <div style="grid-column:1/-1"><div class="text-muted text-sm">Complaint</div><div>${jc.complaint}</div></div>
      ${jc.inspectionDetails ? `<div style="grid-column:1/-1"><div class="text-muted text-sm">Inspection</div><div>${jc.inspectionDetails}</div></div>` : ''}
      ${jc.repairDetails ? `<div style="grid-column:1/-1"><div class="text-muted text-sm">Repair Details</div><div>${jc.repairDetails}</div></div>` : ''}
    </div>
    ${jc.requiredParts?.length ? `<hr class="divider"><h4>Parts Used</h4>
    <ul style="font-size:.875rem">${jc.requiredParts.map(p => `<li>${p.name} × ${p.qty} – ${Fmt.currency(p.price * p.qty)}</li>`).join('')}</ul>` : ''}`;
  Modal.open('aptDetailModal');
}

function viewInvoice(jcId) {
  const jc  = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  const inv = jc ? DB.query(COLLECTIONS.INVOICES, i => i.jobCardId === jcId)[0] : null;
  if (inv) {
    openInvoiceModal(inv.id);
  } else {
    Toast.info('No Invoice', 'Invoice not yet generated for this job card');
  }
}

// ------ INVOICES ------
function loadInvoices() {
  const myInvoices = DB.query(COLLECTIONS.INVOICES, i => i.customerId === currentUser.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const container = document.getElementById('invoicesContainer');

  if (myInvoices.length === 0) {
    renderEmpty(container, 'No invoices generated yet', '🧾');
    return;
  }

  container.innerHTML = myInvoices.map(inv => {
    const veh = DB.getById(COLLECTIONS.VEHICLES, inv.vehicleId);
    return `
    <div class="card mb-3">
      <div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:48px;height:48px;border-radius:var(--radius);background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0" aria-hidden="true">🧾</div>
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700">${inv.id}</div>
          <div style="font-size:.8125rem;color:var(--text-muted)">${veh?.model} · ${Fmt.date(inv.createdAt)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:1.25rem;font-weight:800;color:var(--primary)">${Fmt.currency(inv.grandTotal)}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">Grand Total</div>
        </div>
        <div>${Fmt.statusBadge(inv.status)}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-outline-primary" onclick="openInvoiceModal('${inv.id}')" aria-label="View invoice ${inv.id}">👁️ View</button>
          ${inv.status === 'Unpaid' ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('${inv.id}')" aria-label="Pay invoice ${inv.id}">💳 Pay Now</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openInvoiceModal(invId) {
  const inv = DB.getById(COLLECTIONS.INVOICES, invId);
  if (!inv) return;
  currentInvoiceId = invId;

  const cust = DB.getById(COLLECTIONS.USERS, inv.customerId);
  const veh  = DB.getById(COLLECTIONS.VEHICLES, inv.vehicleId);

  const payBtn = document.getElementById('payInvoiceBtn');
  if (payBtn) {
    payBtn.style.display = inv.status === 'Unpaid' ? '' : 'none';
    payBtn.onclick = () => { Modal.close('invoiceModal'); openPaymentModal(invId); };
  }

  document.getElementById('invoiceContent').innerHTML = `
    <div id="invoice-printable">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h2 style="color:var(--primary)">🚗 VSMS</h2>
          <p style="font-size:.8rem;color:var(--text-muted)">Vehicle Service Management System</p>
        </div>
        <div style="text-align:right">
          <h3 style="margin-bottom:4px">INVOICE</h3>
          <p style="font-size:.875rem;color:var(--text-muted)">${inv.id}</p>
          <p style="font-size:.8rem;color:var(--text-muted)">${Fmt.date(inv.createdAt)}</p>
          <div style="margin-top:8px">${Fmt.statusBadge(inv.status)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:var(--bg-body);padding:14px;border-radius:var(--radius);margin-bottom:20px">
        <div><strong style="font-size:.8rem;color:var(--text-muted)">BILLED TO</strong>
          <p style="font-weight:600;margin-top:4px">${cust?.name || '—'}</p>
          <p style="font-size:.8rem;color:var(--text-muted)">${cust?.email}</p>
          <p style="font-size:.8rem;color:var(--text-muted)">${cust?.phone}</p>
        </div>
        <div><strong style="font-size:.8rem;color:var(--text-muted)">VEHICLE</strong>
          <p style="font-weight:600;margin-top:4px">${veh?.model || '—'}</p>
          <p style="font-size:.8rem;color:var(--text-muted)">${veh?.registrationNo}</p>
          <p style="font-size:.8rem;color:var(--text-muted)">${veh?.fuelType} · ${veh?.year}</p>
        </div>
      </div>
      <table class="table" style="margin-bottom:16px">
        <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${(inv.serviceItems || []).map(i => `<tr><td>${i.name}</td><td>1</td><td>${Fmt.currency(i.amount)}</td><td>${Fmt.currency(i.amount)}</td></tr>`).join('')}
          ${(inv.partItems || []).map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${Fmt.currency(i.price)}</td><td>${Fmt.currency(i.qty * i.price)}</td></tr>`).join('')}
          ${inv.labourCost ? `<tr><td>Labour Charges</td><td>1</td><td>${Fmt.currency(inv.labourCost)}</td><td>${Fmt.currency(inv.labourCost)}</td></tr>` : ''}
        </tbody>
      </table>
      <div style="max-width:280px;margin-left:auto">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span>Subtotal</span><span>${Fmt.currency(inv.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span>GST (18%)</span><span>${Fmt.currency(inv.tax)}</span></div>
        ${inv.discount ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem;color:var(--success)"><span>Discount</span><span>−${Fmt.currency(inv.discount)}</span></div>` : ''}
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:800;font-size:1.1rem;color:var(--primary)"><span>TOTAL</span><span>${Fmt.currency(inv.grandTotal)}</span></div>
      </div>
      ${inv.status === 'Paid' ? `<div class="alert alert-success mt-4">✅ Paid via ${inv.paymentMethod} on ${Fmt.date(inv.paidAt)}</div>` : ''}
    </div>`;

  Modal.open('invoiceModal');
}

// ------ PAYMENTS ------
function loadPayments() {
  const myPayments = DB.query(COLLECTIONS.PAYMENTS, p => p.customerId === currentUser.id)
    .sort((a,b) => new Date(b.date) - new Date(a.date));
  const myUnpaid   = DB.query(COLLECTIONS.INVOICES, i => i.customerId === currentUser.id && i.status === 'Unpaid');
  const container  = document.getElementById('paymentsContainer');

  let html = '';

  if (myUnpaid.length > 0) {
    html += `<div class="card mb-4">
      <div class="card-header"><h3 class="card-title">⚠️ Pending Payments</h3></div>
      <div class="card-body" style="padding:0">
        ${myUnpaid.map(inv => {
          const veh = DB.getById(COLLECTIONS.VEHICLES, inv.vehicleId);
          return `
          <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)">
            <div style="flex:1"><div class="font-semibold">${inv.id}</div>
            <div class="text-xs text-muted">${veh?.model} (${veh?.registrationNo}) · ${Fmt.date(inv.createdAt)}</div></div>
            <div class="font-bold text-primary-color">${Fmt.currency(inv.grandTotal)}</div>
            <button class="btn btn-sm btn-primary" onclick="openPaymentModal('${inv.id}')" aria-label="Pay ${inv.id}">💳 Pay Now</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  if (myPayments.length > 0) {
    html += `<div class="card">
      <div class="card-header"><h3 class="card-title">✅ Payment History</h3></div>
      <div class="table-container">
        <table class="table"><thead><tr><th>Payment ID</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>${myPayments.map(p => `<tr>
          <td><strong>${p.id}</strong></td>
          <td>${p.invoiceId}</td>
          <td class="font-bold">${Fmt.currency(p.amount)}</td>
          <td>${p.method}</td>
          <td>${Fmt.date(p.date)}</td>
          <td>${Fmt.statusBadge(p.status)}</td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>`;
  }

  if (!html) renderEmpty(container, 'No payment records found', '💳');
  else container.innerHTML = html;
}

function openPaymentModal(invId) {
  currentInvoiceId = invId;
  const inv = DB.getById(COLLECTIONS.INVOICES, invId);
  if (!inv) return;

  const content = document.getElementById('paymentContent');
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2rem;margin-bottom:8px">💳</div>
      <h3>Amount Due: <span style="color:var(--primary)">${Fmt.currency(inv.grandTotal)}</span></h3>
      <p class="text-sm text-muted">Invoice: ${inv.id}</p>
    </div>
    <div class="form-group">
      <label class="form-label">Payment Method <span class="required">*</span></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px" id="payMethodSelect" role="radiogroup" aria-label="Payment method">
        ${['UPI','Credit Card','Debit Card','Net Banking','Cash'].map(m => `
        <label style="border:2px solid var(--border);border-radius:var(--radius);padding:12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:var(--transition)" id="pm-${m.replace(/\s/g,'-')}">
          <input type="radio" name="payMethod" value="${m}" style="accent-color:var(--primary)" aria-label="${m}">
          <span>${m === 'UPI' ? '📱' : m === 'Credit Card' ? '💳' : m === 'Debit Card' ? '🏧' : m === 'Net Banking' ? '🏦' : '💵'} ${m}</span>
        </label>`).join('')}
      </div>
    </div>
    <div id="payDetails"></div>
    <button class="btn btn-primary btn-block btn-lg" id="processPayBtn" onclick="processPayment()">Process Payment</button>`;

  // Show method-specific fields
  content.querySelectorAll('[name="payMethod"]').forEach(r => {
    r.addEventListener('change', () => {
      content.querySelectorAll('label[id^="pm-"]').forEach(l => l.style.borderColor = 'var(--border)');
      const selected = content.querySelector('[name="payMethod"]:checked');
      if (selected) selected.closest('label').style.borderColor = 'var(--primary)';
      showPaymentFields(r.value);
    });
  });

  Modal.open('paymentModal');
}

function showPaymentFields(method) {
  const el = document.getElementById('payDetails');
  if (method === 'UPI') {
    el.innerHTML = `<div class="form-group"><label class="form-label">UPI ID</label>
      <input type="text" class="form-control" placeholder="yourname@upi" id="pay-upi"></div>`;
  } else if (method === 'Credit Card' || method === 'Debit Card') {
    el.innerHTML = `
      <div class="form-group"><label class="form-label">Card Number</label>
      <input type="text" class="form-control" placeholder="XXXX XXXX XXXX XXXX" maxlength="19" id="pay-card-no"
        oninput="this.value=this.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Expiry (MM/YY)</label>
          <input type="text" class="form-control" placeholder="MM/YY" maxlength="5" id="pay-expiry"></div>
        <div class="form-group"><label class="form-label">CVV</label>
          <input type="password" class="form-control" placeholder="•••" maxlength="3" id="pay-cvv"></div>
      </div>
      <div class="form-group"><label class="form-label">Name on Card</label>
        <input type="text" class="form-control" placeholder="As on card" id="pay-name"></div>`;
  } else if (method === 'Net Banking') {
    el.innerHTML = `<div class="form-group"><label class="form-label">Select Bank</label>
      <select class="form-control form-select" id="pay-bank">
        <option value="">Select your bank</option>
        <option>SBI</option><option>HDFC Bank</option><option>ICICI Bank</option>
        <option>Axis Bank</option><option>Kotak Mahindra</option><option>Other</option>
      </select></div>`;
  } else {
    el.innerHTML = `<div class="alert alert-info">💵 Please pay cash at the service counter. Your invoice will be marked as paid upon receipt.</div>`;
  }
}

function processPayment() {
  const method = document.querySelector('[name="payMethod"]:checked');
  if (!method) { Toast.warning('Select Method', 'Please select a payment method'); return; }

  const btn = document.getElementById('processPayBtn');
  btn.classList.add('btn-loading'); btn.disabled = true;
  btn.textContent = 'Processing…';

  setTimeout(() => {
    const inv = DB.getById(COLLECTIONS.INVOICES, currentInvoiceId);
    if (!inv) { btn.classList.remove('btn-loading'); btn.disabled = false; return; }

    // Simulate payment
    const payId = DB.generateId('PAY');
    const txnId = 'TXN' + Date.now();

    DB.insert(COLLECTIONS.PAYMENTS, {
      id: payId, invoiceId: currentInvoiceId,
      customerId: currentUser.id,
      transactionId: txnId,
      amount: inv.grandTotal,
      method: method.value,
      status: 'Paid',
      date: new Date().toISOString(),
      receipt: 'RCP-' + payId,
    });

    DB.update(COLLECTIONS.INVOICES, currentInvoiceId, {
      status: 'Paid', paymentMethod: method.value, paidAt: new Date().toISOString()
    });

    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'), userId: currentUser.id, type: 'payment',
      title: 'Payment Successful! 🎉',
      message: `Payment of ${Fmt.currency(inv.grandTotal)} received for ${currentInvoiceId}. Transaction ID: ${txnId}`,
      read: false, createdAt: new Date().toISOString()
    });

    // Show receipt
    document.getElementById('paymentContent').innerHTML = `
      <div style="text-align:center;padding:20px">
        <div style="font-size:3rem;margin-bottom:12px">🎉</div>
        <h3 style="color:var(--success)">Payment Successful!</h3>
        <p class="text-muted mt-2">Thank you for your payment</p>
        <div style="background:var(--bg-body);border-radius:var(--radius);padding:16px;margin:20px 0;text-align:left">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Payment ID</span><span class="font-bold">${payId}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Transaction ID</span><span>${txnId}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Amount</span><span class="font-bold" style="color:var(--success)">${Fmt.currency(inv.grandTotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Method</span><span>${method.value}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Date</span><span>${Fmt.datetime(new Date().toISOString())}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.875rem"><span class="text-muted">Status</span><span class="badge badge-success">Paid</span></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="Modal.close('paymentModal');loadPayments();loadInvoices();loadNotifications()">Close & View Payments</button>
      </div>`;

    Toast.success('Payment Successful!', `Transaction ID: ${txnId}`);
    loadNotifications();
  }, 1800);
}

// ------ NOTIFICATIONS ------
function loadNotifications() {
  const myNotifs = DB.query(COLLECTIONS.NOTIFICATIONS, n => n.userId === currentUser.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread   = myNotifs.filter(n => !n.read).length;

  document.getElementById('notifCount').textContent     = unread > 9 ? '9+' : unread;
  document.getElementById('sidebarNotifBadge').textContent = unread || '';
  document.getElementById('sidebarNotifBadge').style.display = unread ? '' : 'none';

  // Panel
  const panel = document.getElementById('notifList');
  if (panel) {
    const recent = myNotifs.slice(0,5);
    if (recent.length === 0) {
      panel.innerHTML = `<div class="empty-state" style="padding:24px"><p>No notifications yet</p></div>`;
    } else {
      panel.innerHTML = recent.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
          <div class="notif-icon" style="background:var(--primary-light)" aria-hidden="true">${getNotifIcon(n.type)}</div>
          <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-text">${n.message}</div>
            <div class="notif-time">${Fmt.timeAgo(n.createdAt)}</div>
          </div>
          ${!n.read ? '<div class="notif-unread-dot" aria-hidden="true"></div>' : ''}
        </div>`).join('');
    }
  }
}

function loadNotificationsView() {
  const myNotifs = DB.query(COLLECTIONS.NOTIFICATIONS, n => n.userId === currentUser.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const container = document.getElementById('notificationsContainer');

  if (myNotifs.length === 0) {
    renderEmpty(container, 'No notifications yet', '🔔');
    return;
  }

  container.innerHTML = myNotifs.map(n => `
    <div class="card mb-2 ${n.read ? '' : 'unread'}" style="${n.read ? '' : 'border-left:3px solid var(--primary)'}">
      <div class="card-body" style="display:flex;gap:14px;padding:16px;cursor:pointer" onclick="markNotifRead('${n.id}');this.closest('.card').style.borderLeft=''">
        <div class="notif-icon" style="background:var(--primary-light);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0" aria-hidden="true">${getNotifIcon(n.type)}</div>
        <div style="flex:1">
          <div style="font-weight:600;display:flex;justify-content:space-between"><span>${n.title}</span>${!n.read ? '<span class="badge badge-primary">New</span>' : ''}</div>
          <div style="font-size:.875rem;color:var(--text-secondary);margin-top:4px">${n.message}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:6px">${Fmt.timeAgo(n.createdAt)}</div>
        </div>
      </div>
    </div>`).join('');
}

function getNotifIcon(type) {
  const icons = { appointment:'📅', reminder:'⏰', status:'🔧', invoice:'🧾', payment:'💳', alert:'⚠️', assignment:'🔧', welcome:'🎉' };
  return icons[type] || 'ℹ️';
}

function markNotifRead(id) {
  DB.update(COLLECTIONS.NOTIFICATIONS, id, { read: true });
  loadNotifications();
}

function markAllNotificationsRead() {
  const myNotifs = DB.query(COLLECTIONS.NOTIFICATIONS, n => n.userId === currentUser.id && !n.read);
  myNotifs.forEach(n => DB.update(COLLECTIONS.NOTIFICATIONS, n.id, { read: true }));
  loadNotifications();
  loadNotificationsView();
  Toast.success('Done', 'All notifications marked as read');
}

// ------ FEEDBACK ------
function loadFeedback() {
  const completedApts = DB.query(COLLECTIONS.APPOINTMENTS, a =>
    a.customerId === currentUser.id && a.status === 'Completed');

  const sel = document.getElementById('fb-appointment');
  sel.innerHTML = '<option value="">-- Select completed appointment --</option>' +
    completedApts.map(a => {
      const svc = DB.getById(COLLECTIONS.SERVICES, a.serviceId);
      return `<option value="${a.id}">${a.id} – ${svc?.name || 'Service'} (${Fmt.date(a.date)})</option>`;
    }).join('');

  // Star rating
  setupStarRating();

  document.getElementById('feedbackForm').onsubmit = submitFeedback;

  // My feedback
  const myFeedback = DB.query(COLLECTIONS.FEEDBACK, f => f.customerId === currentUser.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const fbList = document.getElementById('myFeedbackList');
  if (myFeedback.length === 0) {
    renderEmpty(fbList, 'No feedback submitted yet', '⭐');
  } else {
    fbList.innerHTML = myFeedback.map(f => {
      const apt = DB.getById(COLLECTIONS.APPOINTMENTS, f.appointmentId);
      const svc = apt ? DB.getById(COLLECTIONS.SERVICES, apt.serviceId) : null;
      return `<div style="padding:16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div style="font-weight:600;font-size:.875rem">${svc?.name || 'Service'}</div>
          <div style="color:var(--accent)">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div>
        </div>
        <p style="font-size:.8125rem;color:var(--text-secondary);margin-top:6px">${f.comment}</p>
        <div style="font-size:.75rem;color:var(--text-muted);margin-top:4px">${Fmt.date(f.createdAt)}</div>
      </div>`;
    }).join('');
  }
}

function setupStarRating() {
  selectedRating = 0;
  const stars = document.querySelectorAll('#starRating button');
  const ratingInput = document.getElementById('fb-rating');
  const ratingText  = document.getElementById('ratingText');
  const words = ['','Poor','Fair','Good','Very Good','Excellent'];

  stars.forEach(s => {
    s.style.fontSize = '1.75rem';
    s.style.background = 'none';
    s.style.border = 'none';
    s.style.cursor = 'pointer';
    s.style.filter = 'grayscale(1)';
    s.style.transition = 'transform 0.1s';

    s.addEventListener('mouseover', () => {
      const n = Number(s.dataset.star);
      stars.forEach((st, i) => { st.style.filter = i < n ? 'none' : 'grayscale(1)'; });
    });
    s.addEventListener('mouseout', () => {
      stars.forEach((st, i) => { st.style.filter = i < selectedRating ? 'none' : 'grayscale(1)'; });
    });
    s.addEventListener('click', () => {
      selectedRating = Number(s.dataset.star);
      ratingInput.value = selectedRating;
      ratingText.textContent = words[selectedRating] || '';
      stars.forEach((st, i) => { st.style.filter = i < selectedRating ? 'none' : 'grayscale(1)'; });
    });
  });
}

function submitFeedback(e) {
  e.preventDefault();
  const form = e.target;
  const aptId = form.querySelector('[name="appointmentId"]').value;
  const comment = form.querySelector('[name="comment"]').value;

  if (!aptId)           { Toast.warning('Select', 'Please select an appointment'); return; }
  if (selectedRating === 0) { Toast.warning('Rate', 'Please select a rating'); return; }
  if (!comment.trim())  { Toast.warning('Required', 'Please write a comment'); return; }

  DB.insert(COLLECTIONS.FEEDBACK, {
    id: DB.generateId('FBK'),
    customerId: currentUser.id,
    appointmentId: aptId,
    rating: selectedRating,
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  });

  Toast.success('Thank You!', 'Your feedback has been submitted');
  form.reset();
  selectedRating = 0;
  loadFeedback();
}

// ------ GLOBAL SEARCH ------
function runGlobalSearch(q) {
  const vehicles     = searchRecords(DB.query(COLLECTIONS.VEHICLES,     v => v.customerId === currentUser.id), q, ['registrationNo','model','type']);
  const appointments = searchRecords(DB.query(COLLECTIONS.APPOINTMENTS, a => a.customerId === currentUser.id), q, ['id','status','serviceCenter']);
  const invoices     = searchRecords(DB.query(COLLECTIONS.INVOICES,     i => i.customerId === currentUser.id), q, ['id','status']);

  const total = vehicles.length + appointments.length + invoices.length;
  if (total > 0) {
    Toast.info(`Found ${total} results`, `Vehicles: ${vehicles.length} · Appointments: ${appointments.length} · Invoices: ${invoices.length}`);
  }
}
