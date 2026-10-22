/* ============================================================
   advisor.js – Service Advisor Dashboard Logic
   ============================================================ */

let currentUser = null;
let currentPage = { appointments: 1 };
let selectedCheckinAptId = null;

// ------ Initialization ------
document.addEventListener('DOMContentLoaded', () => {
  seedDatabase();
  Theme.init();
  currentUser = Auth.guard('advisor');
  if (!currentUser) return;

  setupUI();
  setupSidebar();
  setupTopnav();
  loadDashboard();
  loadAppointments();
  loadCheckinView();
  loadJobCards();
  loadAssignView();
  loadServices();
  loadInvoices();
  loadCustomers();
  loadNotifications();

  // Default view
  switchView('dashboard');

  // Nav buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length > 1) runAdvisorGlobalSearch(q);
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    Modal.confirm('Logout', 'Are you sure you want to logout?', () => Auth.logout());
  });

  // Event listeners for forms and filters
  setupEventListeners();
});

// ------ UI Setup ------
function setupUI() {
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const setElem = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setElem('sidebarAvatar', initials);
  setElem('sidebarName', currentUser.name);
  setElem('topnavAvatar', initials);
  setElem('topnavName', currentUser.name);
  setElem('profileAvatar', initials);
  setElem('profileName', currentUser.name);

  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profPhone = document.getElementById('prof-phone');
  if (profName) profName.value = currentUser.name || '';
  if (profEmail) profEmail.value = currentUser.email || '';
  if (profPhone) profPhone.value = currentUser.phone || '';
}

// ------ Sidebar & Topnav ------
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('mobileOverlay');

  toggle?.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('active');
    } else {
      sidebar?.classList.toggle('collapsed');
      document.getElementById('mainContent')?.classList.toggle('expanded');
    }
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
  });
}

function setupTopnav() {
  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', () => Theme.toggle());

  // Notifications dropdown
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel?.classList.toggle('open');
  });

  document.getElementById('markAllRead')?.addEventListener('click', () => {
    markAllNotificationsRead();
  });

  document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
    markAllNotificationsRead();
  });

  // User menu dropdown
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userMenu = document.getElementById('userMenu');
  userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    notifPanel?.classList.remove('open');
    userMenu?.classList.remove('open');
  });
}

// ------ View Switcher ------
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('mobileOverlay')?.classList.remove('active');
  }

  // Refresh view contents
  switch (viewName) {
    case 'dashboard': loadDashboard(); break;
    case 'appointments': loadAppointments(); break;
    case 'checkin': loadCheckinView(); break;
    case 'jobcards': loadJobCards(); break;
    case 'assign': loadAssignView(); break;
    case 'services': loadServices(); break;
    case 'invoices': loadInvoices(); break;
    case 'customers': loadCustomers(); break;
    case 'notifications': loadNotifications(); break;
  }
}

// ------ Event Listeners Setup ------
function setupEventListeners() {
  // Appointment filters
  document.getElementById('advAptSearch')?.addEventListener('input', () => { currentPage.appointments = 1; loadAppointments(); });
  document.getElementById('advAptStatus')?.addEventListener('change', () => { currentPage.appointments = 1; loadAppointments(); });

  // Checkin dropdown change
  document.getElementById('checkin-apt')?.addEventListener('change', (e) => onCheckinSelect(e.target.value));

  // Job card filters
  document.getElementById('jcSearch')?.addEventListener('input', () => loadJobCards());
  document.getElementById('jcStatusFilter')?.addEventListener('change', () => loadJobCards());

  // Customer search
  document.getElementById('custSearch')?.addEventListener('input', () => loadCustomers());

  // Profile Form
  document.getElementById('profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name')?.value.trim();
    const email = document.getElementById('prof-email')?.value.trim();
    const phone = document.getElementById('prof-phone')?.value.trim();

    if (!name || !email) {
      Toast.error('Validation Error', 'Name and email are required');
      return;
    }

    DB.update(COLLECTIONS.USERS, currentUser.id, { name, email, phone });
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    Session.set(currentUser);
    setupUI();
    Toast.success('Profile Updated', 'Your profile details have been saved.');
  });

  // Password Form
  document.getElementById('passwordForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = e.target.elements['current'].value;
    const n = e.target.elements['newPass'].value;
    const c = e.target.elements['confirmPass'].value;

    const res = Auth.changePassword(currentUser.id, cur, n, c);
    if (res.success) {
      Toast.success('Password Changed', 'Password successfully updated.');
      e.target.reset();
    } else {
      Toast.error('Error', res.error);
    }
  });

  // Save Job Card status update
  document.getElementById('saveJcUpdateBtn')?.addEventListener('click', saveJobCardUpdate);

  // Assign mechanic modal confirm
  document.getElementById('confirmAssignBtn')?.addEventListener('click', confirmMechanicAssign);
}

// ------ Dashboard Overview ------
function loadDashboard() {
  const appointments = DB.getAll(COLLECTIONS.APPOINTMENTS);
  const jobCards = DB.getAll(COLLECTIONS.JOB_CARDS);

  const pendingApts = appointments.filter(a => a.status === 'Pending').length;
  const checkedIn = appointments.filter(a => a.status === 'Checked-In').length;
  const activeJCs = jobCards.filter(j => !['Closed', 'Completed'].includes(j.status)).length;
  const completedToday = jobCards.filter(j => ['Closed', 'Completed'].includes(j.status)).length;

  document.getElementById('statPending').textContent = pendingApts;
  document.getElementById('statCheckedIn').textContent = checkedIn;
  document.getElementById('statJobCards').textContent = activeJCs;
  document.getElementById('statCompleted').textContent = completedToday;

  // Today's Appointments List
  const todayContainer = document.getElementById('todayAppointments');
  if (todayContainer) {
    const list = appointments.slice().reverse().slice(0, 5);
    if (!list.length) {
      todayContainer.innerHTML = `<div class="p-4 text-center text-muted">No appointments found.</div>`;
    } else {
      todayContainer.innerHTML = list.map(apt => {
        const cust = DB.getById(COLLECTIONS.USERS, apt.customerId) || { name: 'Customer' };
        const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { model: 'Vehicle', registrationNo: '' };
        const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'Service' };
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${cust.name} – <span class="text-muted">${veh.registrationNo || veh.model}</span></div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${svc.name} • ${Fmt.date(apt.date)} ${apt.time || ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${Fmt.badge(apt.status)}
              <button class="btn btn-xs btn-outline-primary" onclick="quickViewAppointment('${apt.id}')">View</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Active Job Cards List
  const jcContainer = document.getElementById('activeJobCards');
  if (jcContainer) {
    const activeList = jobCards.filter(j => !['Closed', 'Completed'].includes(j.status)).slice(0, 5);
    if (!activeList.length) {
      jcContainer.innerHTML = `<div class="p-4 text-center text-muted">No active job cards currently.</div>`;
    } else {
      jcContainer.innerHTML = activeList.map(jc => {
        const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { model: 'Vehicle', registrationNo: '' };
        const mech = jc.mechanicId ? (DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId) || { name: 'Assigned' }) : null;
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${jc.id} – <span class="text-muted">${veh.registrationNo || veh.model}</span></div>
              <div style="font-size:0.8rem;color:var(--text-muted)">Mechanic: ${mech ? mech.name : '<span style="color:var(--danger)">Unassigned</span>'} • Est: ${Fmt.currency(jc.estimatedCost || 0)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${Fmt.badge(jc.status)}
              <button class="btn btn-xs btn-outline-primary" onclick="openJobCardDetail('${jc.id}')">Manage</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// ------ Appointments Management ------
function loadAppointments() {
  const tbody = document.getElementById('advAppointmentsBody');
  if (!tbody) return;

  const q = document.getElementById('advAptSearch')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('advAptStatus')?.value || '';

  let list = DB.getAll(COLLECTIONS.APPOINTMENTS);

  if (statusFilter) {
    list = list.filter(a => a.status === statusFilter);
  }

  if (q) {
    list = list.filter(a => {
      const cust = DB.getById(COLLECTIONS.USERS, a.customerId) || {};
      const veh = DB.getById(COLLECTIONS.VEHICLES, a.vehicleId) || {};
      const svc = DB.getById(COLLECTIONS.SERVICES, a.serviceId) || {};
      return a.id.toLowerCase().includes(q) ||
        (cust.name && cust.name.toLowerCase().includes(q)) ||
        (veh.registrationNo && veh.registrationNo.toLowerCase().includes(q)) ||
        (svc.name && svc.name.toLowerCase().includes(q));
    });
  }

  list.reverse();

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-4">No appointments found matching your criteria.</td></tr>`;
    document.getElementById('advAptPagination').innerHTML = '';
    return;
  }

  // Pagination
  const pageSize = 8;
  const page = currentPage.appointments || 1;
  const totalPages = Math.ceil(list.length / pageSize);
  const pagedList = list.slice((page - 1) * pageSize, page * pageSize);

  tbody.innerHTML = pagedList.map(apt => {
    const cust = DB.getById(COLLECTIONS.USERS, apt.customerId) || { name: 'Customer', phone: '' };
    const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { model: 'Vehicle', registrationNo: 'N/A' };
    const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'General Service' };

    let actionButtons = '';
    if (apt.status === 'Pending') {
      actionButtons += `<button class="btn btn-xs btn-success" onclick="updateAppointmentStatus('${apt.id}', 'Confirmed')">Confirm</button> `;
      actionButtons += `<button class="btn btn-xs btn-danger" onclick="cancelAppointmentPrompt('${apt.id}')">Cancel</button>`;
    } else if (apt.status === 'Confirmed') {
      actionButtons += `<button class="btn btn-xs btn-primary" onclick="proceedToCheckin('${apt.id}')">Check-In</button> `;
      actionButtons += `<button class="btn btn-xs btn-danger" onclick="cancelAppointmentPrompt('${apt.id}')">Cancel</button>`;
    } else if (apt.status === 'Checked-In') {
      const jc = DB.query(COLLECTIONS.JOB_CARDS, j => j.appointmentId === apt.id)[0];
      if (jc) {
        actionButtons += `<button class="btn btn-xs btn-outline-primary" onclick="openJobCardDetail('${jc.id}')">View JC</button>`;
      } else {
        actionButtons += `<button class="btn btn-xs btn-primary" onclick="proceedToCheckin('${apt.id}')">Create JC</button>`;
      }
    } else {
      actionButtons += `<span class="text-muted" style="font-size:0.8rem">Completed</span>`;
    }

    return `
      <tr>
        <td><strong>${apt.id}</strong></td>
        <td>
          <div style="font-weight:600">${cust.name}</div>
          <small class="text-muted">${cust.phone || ''}</small>
        </td>
        <td>
          <div>${veh.registrationNo}</div>
          <small class="text-muted">${veh.model || ''}</small>
        </td>
        <td>${svc.name}</td>
        <td>
          <div>${Fmt.date(apt.date)}</div>
          <small class="text-muted">${apt.time || '10:00 AM'}</small>
        </td>
        <td>${Fmt.badge(apt.status)}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join('');

  // Pagination buttons
  renderPagination('advAptPagination', page, totalPages, (newPage) => {
    currentPage.appointments = newPage;
    loadAppointments();
  });
}

function updateAppointmentStatus(aptId, newStatus) {
  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, aptId);
  if (!apt) return;

  DB.update(COLLECTIONS.APPOINTMENTS, aptId, { status: newStatus });

  // Send Notification to Customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: apt.customerId,
    type: 'appointment',
    title: `Appointment ${newStatus}`,
    message: `Your appointment ${apt.id} has been marked as ${newStatus}.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Toast.success('Updated', `Appointment ${aptId} status changed to ${newStatus}.`);
  loadAppointments();
  loadDashboard();
}

function cancelAppointmentPrompt(aptId) {
  Modal.confirm('Cancel Appointment', `Are you sure you want to cancel appointment ${aptId}?`, () => {
    const apt = DB.getById(COLLECTIONS.APPOINTMENTS, aptId);
    if (!apt) return;

    DB.update(COLLECTIONS.APPOINTMENTS, aptId, { status: 'Cancelled' });

    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'),
      userId: apt.customerId,
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: `Your appointment ${apt.id} has been cancelled by the service center.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    Toast.info('Cancelled', `Appointment ${aptId} has been cancelled.`);
    loadAppointments();
    loadDashboard();
  });
}

function quickViewAppointment(aptId) {
  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, aptId);
  if (!apt) return;
  const cust = DB.getById(COLLECTIONS.USERS, apt.customerId) || { name: 'Customer', phone: '', email: '' };
  const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { model: 'N/A', registrationNo: 'N/A', year: '', mileage: '' };
  const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'General Service', price: 0 };

  const content = `
    <div style="line-height:1.7">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h4 style="margin:0">${apt.id}</h4>
        ${Fmt.badge(apt.status)}
      </div>
      <div class="grid-2 mb-3">
        <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius)">
          <strong>Customer:</strong> ${cust.name}<br>
          <strong>Phone:</strong> ${cust.phone || 'N/A'}<br>
          <strong>Email:</strong> ${cust.email || 'N/A'}
        </div>
        <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius)">
          <strong>Vehicle:</strong> ${veh.model} (${veh.year || 'N/A'})<br>
          <strong>Reg No:</strong> ${veh.registrationNo}<br>
          <strong>Mileage:</strong> ${veh.mileage ? veh.mileage + ' km' : 'N/A'}
        </div>
      </div>
      <p><strong>Service Requested:</strong> ${svc.name} (${Fmt.currency(svc.price)})</p>
      <p><strong>Appointment Date:</strong> ${Fmt.date(apt.date)} at ${apt.time || '10:00 AM'}</p>
      <p><strong>Customer Notes:</strong> ${apt.notes || 'None'}</p>
    </div>
  `;

  document.getElementById('jcDetailTitle').textContent = `Appointment Details – ${apt.id}`;
  document.getElementById('jcDetailContent').innerHTML = content;
  document.getElementById('jcDetailFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="Modal.close('jcDetailModal')">Close</button>
    ${apt.status === 'Pending' ? `<button class="btn btn-success" onclick="Modal.close('jcDetailModal');updateAppointmentStatus('${apt.id}','Confirmed')">Confirm Appointment</button>` : ''}
    ${apt.status === 'Confirmed' ? `<button class="btn btn-primary" onclick="Modal.close('jcDetailModal');proceedToCheckin('${apt.id}')">Proceed to Check-In</button>` : ''}
  `;
  Modal.open('jcDetailModal');
}

// ------ Vehicle Check-In View ------
function loadCheckinView() {
  const select = document.getElementById('checkin-apt');
  const pendingContainer = document.getElementById('pendingCheckins');
  if (!select) return;

  const confirmedApts = DB.query(COLLECTIONS.APPOINTMENTS, a => a.status === 'Confirmed');

  select.innerHTML = '<option value="">-- Select confirmed appointment --</option>' +
    confirmedApts.map(a => {
      const cust = DB.getById(COLLECTIONS.USERS, a.customerId) || { name: 'Customer' };
      const veh = DB.getById(COLLECTIONS.VEHICLES, a.vehicleId) || { registrationNo: 'Vehicle' };
      return `<option value="${a.id}">${a.id} - ${cust.name} (${veh.registrationNo})</option>`;
    }).join('');

  if (selectedCheckinAptId && confirmedApts.some(a => a.id === selectedCheckinAptId)) {
    select.value = selectedCheckinAptId;
    onCheckinSelect(selectedCheckinAptId);
  } else {
    document.getElementById('checkinPreview')?.classList.add('hidden');
    selectedCheckinAptId = null;
  }

  // Pending Check-ins sidebar widget
  if (pendingContainer) {
    if (!confirmedApts.length) {
      pendingContainer.innerHTML = `<div class="p-4 text-center text-muted">No confirmed appointments waiting for check-in.</div>`;
    } else {
      pendingContainer.innerHTML = confirmedApts.map(apt => {
        const cust = DB.getById(COLLECTIONS.USERS, apt.customerId) || { name: 'Customer' };
        const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { registrationNo: 'Vehicle', model: '' };
        const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'Service' };
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${veh.registrationNo} <span class="text-muted">(${veh.model})</span></div>
              <div style="font-size:0.8rem;color:var(--text-muted)">Owner: ${cust.name} • ${svc.name}</div>
            </div>
            <button class="btn btn-xs btn-primary" onclick="proceedToCheckin('${apt.id}')">Select</button>
          </div>
        `;
      }).join('');
    }
  }
}

function proceedToCheckin(aptId) {
  selectedCheckinAptId = aptId;
  switchView('checkin');
  const sel = document.getElementById('checkin-apt');
  if (sel) {
    sel.value = aptId;
    onCheckinSelect(aptId);
  }
}

function onCheckinSelect(aptId) {
  const preview = document.getElementById('checkinPreview');
  const details = document.getElementById('checkinDetails');
  if (!aptId) {
    preview?.classList.add('hidden');
    return;
  }

  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, aptId);
  if (!apt) {
    preview?.classList.add('hidden');
    return;
  }

  const cust = DB.getById(COLLECTIONS.USERS, apt.customerId) || { name: 'Customer', phone: '', email: '' };
  const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { model: 'N/A', registrationNo: 'N/A', year: '', mileage: '' };
  const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'General Service', price: 0, duration: 2 };

  details.innerHTML = `
    <h4 style="margin-top:0;color:var(--primary)">Vehicle & Appointment Information</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.9rem">
      <div><strong>Customer:</strong> ${cust.name} (${cust.phone})</div>
      <div><strong>Vehicle:</strong> ${veh.model} [${veh.registrationNo}]</div>
      <div><strong>Mileage:</strong> ${veh.mileage || '30,000'} km</div>
      <div><strong>Service:</strong> ${svc.name}</div>
      <div><strong>Est. Base Cost:</strong> ${Fmt.currency(svc.price)}</div>
      <div><strong>Est. Duration:</strong> ${svc.duration} Hours</div>
    </div>
    <div class="mt-2" style="font-size:0.85rem;color:var(--text-secondary)">
      <strong>Customer Notes:</strong> ${apt.notes || 'None provided'}
    </div>
  `;
  preview?.classList.remove('hidden');
}

function processCheckin() {
  const aptId = document.getElementById('checkin-apt')?.value;
  if (!aptId) {
    Toast.error('Selection Missing', 'Please select a confirmed appointment to process check-in.');
    return;
  }

  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, aptId);
  if (!apt) return;

  const svc = DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'General Service', price: 2000 };
  const veh = DB.getById(COLLECTIONS.VEHICLES, apt.vehicleId) || { registrationNo: 'Vehicle' };

  // 1. Update appointment to Checked-In
  DB.update(COLLECTIONS.APPOINTMENTS, aptId, { status: 'Checked-In' });

  // 2. Create Job Card
  const newJcId = DB.generateId('JC');
  const newJobCard = {
    id: newJcId,
    appointmentId: apt.id,
    customerId: apt.customerId,
    vehicleId: apt.vehicleId,
    complaint: `${svc.name}: ${apt.notes || 'Regular maintenance inspection requested by customer'}`,
    mechanicId: null,
    inspectionDetails: `Initial vehicle walkaround completed. Mileage verified. Checked in by advisor ${currentUser.name}.`,
    repairDetails: '',
    requiredParts: [],
    estimatedCost: svc.price || 2500,
    actualCost: null,
    labourCost: Math.round((svc.price || 2500) * 0.4),
    status: 'Created',
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  DB.insert(COLLECTIONS.JOB_CARDS, newJobCard);

  // 3. Notify Customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: apt.customerId,
    type: 'status',
    title: 'Vehicle Checked In',
    message: `Your vehicle (${veh.registrationNo}) has been checked in. Job Card ${newJcId} is created.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Toast.success('Check-In Complete', `Job Card ${newJcId} has been successfully generated.`);

  selectedCheckinAptId = null;
  loadCheckinView();
  loadAppointments();
  loadJobCards();
  loadDashboard();

  // Offer to assign mechanic right away
  openAssignModal(newJcId);
}

// ------ Job Cards Management ------
function loadJobCards() {
  const tbody = document.getElementById('jobCardsBody');
  if (!tbody) return;

  const q = document.getElementById('jcSearch')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('jcStatusFilter')?.value || '';

  let list = DB.getAll(COLLECTIONS.JOB_CARDS);

  if (statusFilter) {
    list = list.filter(j => j.status === statusFilter);
  }

  if (q) {
    list = list.filter(j => {
      const cust = DB.getById(COLLECTIONS.USERS, j.customerId) || {};
      const veh = DB.getById(COLLECTIONS.VEHICLES, j.vehicleId) || {};
      const mech = j.mechanicId ? (DB.getById(COLLECTIONS.MECHANICS, j.mechanicId) || {}) : {};
      return j.id.toLowerCase().includes(q) ||
        (cust.name && cust.name.toLowerCase().includes(q)) ||
        (veh.registrationNo && veh.registrationNo.toLowerCase().includes(q)) ||
        (mech.name && mech.name.toLowerCase().includes(q));
    });
  }

  list.reverse();

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">No job cards found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(jc => {
    const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer' };
    const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'N/A', model: '' };
    const apt = DB.getById(COLLECTIONS.APPOINTMENTS, jc.appointmentId);
    const svc = apt ? (DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'Service' }) : { name: 'Service' };
    const mech = jc.mechanicId ? (DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId) || { name: 'Mechanic' }) : null;

    let actions = `<button class="btn btn-xs btn-outline-primary" onclick="openJobCardDetail('${jc.id}')">View</button> `;
    actions += `<button class="btn btn-xs btn-secondary" onclick="openUpdateJcModal('${jc.id}')">Update</button> `;

    if (!jc.mechanicId) {
      actions += `<button class="btn btn-xs btn-warning" onclick="openAssignModal('${jc.id}')">Assign</button> `;
    }

    if (jc.status === 'Completed' || jc.status === 'Closed') {
      const existingInv = DB.query(COLLECTIONS.INVOICES, i => i.jobCardId === jc.id)[0];
      if (!existingInv) {
        actions += `<button class="btn btn-xs btn-success" onclick="openGenInvoiceModal('${jc.id}')">Invoice</button>`;
      }
    }

    return `
      <tr>
        <td><strong>${jc.id}</strong></td>
        <td>${cust.name}</td>
        <td>
          <div>${veh.registrationNo}</div>
          <small class="text-muted">${veh.model || ''}</small>
        </td>
        <td>${svc.name}</td>
        <td>
          ${mech ? `<span class="badge badge-info">${mech.name}</span>` : `<span class="badge badge-warning">Unassigned</span>`}
        </td>
        <td>${Fmt.currency(jc.estimatedCost || 0)}</td>
        <td>${Fmt.badge(jc.status)}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

function openJobCardDetail(jcId) {
  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer', phone: '', email: '' };
  const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { model: 'N/A', registrationNo: 'N/A', type: 'Car', year: '' };
  const mech = jc.mechanicId ? (DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId) || { name: 'Not Assigned' }) : null;
  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, jc.appointmentId);
  const svc = apt ? (DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'General Service' }) : { name: 'General Service' };

  let partsTable = '';
  if (jc.requiredParts && jc.requiredParts.length > 0) {
    const totalParts = jc.requiredParts.reduce((acc, p) => acc + (p.price * p.qty), 0);
    partsTable = `
      <h5 class="mt-4 mb-2">Parts Used</h5>
      <table class="table table-sm">
        <thead><tr><th>Part</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
          ${jc.requiredParts.map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td>${Fmt.currency(p.price)}</td><td>${Fmt.currency(p.price * p.qty)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><th colspan="3">Parts Total</th><th>${Fmt.currency(totalParts)}</th></tr></tfoot>
      </table>
    `;
  } else {
    partsTable = `<p class="text-muted mt-2" style="font-size:0.85rem">No spare parts billed yet.</p>`;
  }

  const content = `
    <div style="line-height:1.6">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">${jc.id} – <span class="text-primary">${svc.name}</span></h3>
        <div>${Fmt.badge(jc.status)}</div>
      </div>

      <div class="grid-2 mb-3">
        <div style="background:var(--bg-body);padding:14px;border-radius:var(--radius)">
          <strong>Vehicle:</strong> ${veh.model} [${veh.registrationNo}] (${veh.year || '2022'})<br>
          <strong>Customer:</strong> ${cust.name} (${cust.phone || 'N/A'})<br>
          <strong>Created:</strong> ${Fmt.date(jc.createdAt)}
        </div>
        <div style="background:var(--bg-body);padding:14px;border-radius:var(--radius)">
          <strong>Mechanic:</strong> ${mech ? mech.name : '<span style="color:var(--danger)">Unassigned</span>'}<br>
          <strong>Est. Cost:</strong> ${Fmt.currency(jc.estimatedCost || 0)}<br>
          <strong>Actual Cost:</strong> ${jc.actualCost ? Fmt.currency(jc.actualCost) : 'Pending calculation'}<br>
          <strong>Labor Cost:</strong> ${Fmt.currency(jc.labourCost || 0)}
        </div>
      </div>

      <div class="card mb-3 p-3">
        <h5 style="margin-top:0">Customer Complaint</h5>
        <p style="margin:0;color:var(--text-secondary)">${jc.complaint || 'None'}</p>
      </div>

      <div class="card mb-3 p-3">
        <h5 style="margin-top:0">Vehicle Inspection Findings</h5>
        <p style="margin:0;color:var(--text-secondary)">${jc.inspectionDetails || 'Inspection pending.'}</p>
      </div>

      <div class="card mb-3 p-3">
        <h5 style="margin-top:0">Repair Work Done</h5>
        <p style="margin:0;color:var(--text-secondary)">${jc.repairDetails || 'Repair work in progress or not documented yet.'}</p>
      </div>

      ${partsTable}
    </div>
  `;

  document.getElementById('jcDetailTitle').textContent = `Job Card – ${jc.id}`;
  document.getElementById('jcDetailContent').innerHTML = content;

  let footerBtns = `<button class="btn btn-secondary" onclick="Modal.close('jcDetailModal')">Close</button> `;
  footerBtns += `<button class="btn btn-primary" onclick="Modal.close('jcDetailModal');openUpdateJcModal('${jc.id}')">Update Status & Work</button> `;

  if (!jc.mechanicId) {
    footerBtns += `<button class="btn btn-warning" onclick="Modal.close('jcDetailModal');openAssignModal('${jc.id}')">Assign Mechanic</button> `;
  }

  const existingInv = DB.query(COLLECTIONS.INVOICES, i => i.jobCardId === jc.id)[0];
  if (existingInv) {
    footerBtns += `<button class="btn btn-success" onclick="Modal.close('jcDetailModal');viewInvoiceModal('${existingInv.id}')">View Invoice</button>`;
  } else if (jc.status === 'Completed' || jc.status === 'Closed') {
    footerBtns += `<button class="btn btn-success" onclick="Modal.close('jcDetailModal');openGenInvoiceModal('${jc.id}')">Generate Invoice</button>`;
  }

  document.getElementById('jcDetailFooter').innerHTML = footerBtns;
  Modal.open('jcDetailModal');
}

function openUpdateJcModal(jcId) {
  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  document.getElementById('update-jc-id').value = jc.id;
  document.getElementById('update-jc-status').value = jc.status;
  document.getElementById('update-jc-inspection').value = jc.inspectionDetails || '';
  document.getElementById('update-jc-repair').value = jc.repairDetails || '';
  document.getElementById('update-jc-cost').value = jc.actualCost || jc.estimatedCost || '';

  Modal.open('updateJcModal');
}

function saveJobCardUpdate() {
  const jcId = document.getElementById('update-jc-id').value;
  const status = document.getElementById('update-jc-status').value;
  const inspectionDetails = document.getElementById('update-jc-inspection').value.trim();
  const repairDetails = document.getElementById('update-jc-repair').value.trim();
  const costVal = parseFloat(document.getElementById('update-jc-cost').value) || null;

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  const updates = {
    status,
    inspectionDetails,
    repairDetails,
    actualCost: costVal
  };

  if (status === 'Completed' || status === 'Closed') {
    if (!jc.completedAt) updates.completedAt = new Date().toISOString();

    // Also update associated appointment to Completed if Closed
    if (jc.appointmentId) {
      DB.update(COLLECTIONS.APPOINTMENTS, jc.appointmentId, { status: 'Completed' });
    }
  }

  DB.update(COLLECTIONS.JOB_CARDS, jcId, updates);

  // Send update notification to customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: jc.customerId,
    type: 'status',
    title: `Job Card Updated: ${status}`,
    message: `Your vehicle service job card ${jc.id} status is now: ${status}.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Modal.close('updateJcModal');
  Toast.success('Updated', `Job Card ${jcId} updated successfully.`);
  loadJobCards();
  loadDashboard();
}

// ------ Assign Mechanic View & Modal ------
function loadAssignView() {
  const container = document.getElementById('assignContainer');
  if (!container) return;

  const jobCards = DB.getAll(COLLECTIONS.JOB_CARDS);
  const unassigned = jobCards.filter(j => !j.mechanicId && !['Closed', 'Completed'].includes(j.status));
  const assigned = jobCards.filter(j => j.mechanicId && !['Closed', 'Completed'].includes(j.status));

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3 class="card-title">⚠️ Unassigned Job Cards (${unassigned.length})</h3></div>
        <div class="card-body p-0">
          ${!unassigned.length ? '<div class="p-4 text-center text-muted">All active job cards have been assigned to mechanics! 🎉</div>' :
            unassigned.map(jc => {
              const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'Vehicle', model: '' };
              const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer' };
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid var(--border)">
                  <div>
                    <strong>${jc.id}</strong> – ${veh.registrationNo} (${veh.model})
                    <div style="font-size:0.8rem;color:var(--text-muted)">Customer: ${cust.name} • ${jc.complaint}</div>
                  </div>
                  <button class="btn btn-sm btn-primary" onclick="openAssignModal('${jc.id}')">Assign Now</button>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">👷 Currently Assigned Jobs (${assigned.length})</h3></div>
        <div class="card-body p-0">
          ${!assigned.length ? '<div class="p-4 text-center text-muted">No assigned jobs in progress.</div>' :
            assigned.map(jc => {
              const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'Vehicle', model: '' };
              const mech = DB.getById(COLLECTIONS.MECHANICS, jc.mechanicId) || { name: 'Mechanic' };
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid var(--border)">
                  <div>
                    <strong>${jc.id}</strong> – ${veh.registrationNo}
                    <div style="font-size:0.8rem;color:var(--text-muted)">Assigned to: <strong style="color:var(--primary)">${mech.name}</strong> • ${jc.status}</div>
                  </div>
                  <button class="btn btn-xs btn-outline-secondary" onclick="openAssignModal('${jc.id}')">Reassign</button>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    </div>
  `;
}

function openAssignModal(jcId) {
  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  document.getElementById('assign-jc-id').value = jc.id;
  const select = document.getElementById('assign-mechanic-select');
  const mechanics = DB.getAll(COLLECTIONS.MECHANICS);

  select.innerHTML = '<option value="">-- Select mechanic --</option>' +
    mechanics.map(m => `
      <option value="${m.id}" ${jc.mechanicId === m.id ? 'selected' : ''}>
        ${m.name} (${(m.specialization || []).join(', ')}) - Status: ${m.status || 'Available'} [Jobs: ${m.assignedJobs || 0}]
      </option>
    `).join('');

  const mechInfo = document.getElementById('mechanicInfo');
  mechInfo.classList.add('hidden');

  select.onchange = (e) => {
    const selectedMech = mechanics.find(m => m.id === e.target.value);
    if (selectedMech) {
      mechInfo.innerHTML = `
        <div style="background:var(--bg-body);padding:10px;border-radius:var(--radius);margin-top:10px;font-size:0.85rem">
          <strong>Experience:</strong> ${selectedMech.experience} years | <strong>Rating:</strong> ⭐ ${selectedMech.rating} | <strong>Current Workload:</strong> ${selectedMech.assignedJobs || 0} jobs
        </div>
      `;
      mechInfo.classList.remove('hidden');
    } else {
      mechInfo.classList.add('hidden');
    }
  };

  Modal.open('assignMechanicModal');
}

function confirmMechanicAssign() {
  const jcId = document.getElementById('assign-jc-id').value;
  const mechanicId = document.getElementById('assign-mechanic-select').value;

  if (!mechanicId) {
    Toast.error('Selection Missing', 'Please select a mechanic.');
    return;
  }

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  const mech = DB.getById(COLLECTIONS.MECHANICS, mechanicId);
  if (!jc || !mech) return;

  const prevMechanicId = jc.mechanicId;

  // Update JC
  const newStatus = jc.status === 'Created' ? 'Assigned' : jc.status;
  DB.update(COLLECTIONS.JOB_CARDS, jcId, {
    mechanicId,
    status: newStatus
  });

  // Update mechanic job counts
  DB.update(COLLECTIONS.MECHANICS, mechanicId, {
    assignedJobs: (mech.assignedJobs || 0) + 1,
    status: 'Busy'
  });

  if (prevMechanicId && prevMechanicId !== mechanicId) {
    const prevMech = DB.getById(COLLECTIONS.MECHANICS, prevMechanicId);
    if (prevMech) {
      DB.update(COLLECTIONS.MECHANICS, prevMechanicId, {
        assignedJobs: Math.max(0, (prevMech.assignedJobs || 1) - 1)
      });
    }
  }

  // Notify Mechanic
  if (mech.userId) {
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'),
      userId: mech.userId,
      type: 'assignment',
      title: 'New Service Job Assigned',
      message: `Job Card ${jc.id} has been assigned to you.`,
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  // Notify Customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: jc.customerId,
    type: 'status',
    title: 'Mechanic Assigned',
    message: `${mech.name} has been assigned to work on your vehicle.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Modal.close('assignMechanicModal');
  Toast.success('Assigned', `Job card ${jcId} assigned to ${mech.name}.`);
  loadJobCards();
  loadAssignView();
  loadDashboard();
}

// ------ Services Catalog View ------
function loadServices() {
  const container = document.getElementById('serviceCatalog');
  if (!container) return;

  const services = DB.getAll(COLLECTIONS.SERVICES);
  const icons = {
    Maintenance: '🔧',
    Fluid: '🛢️',
    Safety: '🛑',
    Repair: '⚙️',
    Comfort: '❄️',
    Electrical: '🔋',
    Tyres: '🛞',
    Inspection: '🔍'
  };

  container.innerHTML = services.map(svc => `
    <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <span style="font-size:2rem">${icons[svc.category] || '🚗'}</span>
          <span class="badge badge-primary">${svc.category}</span>
        </div>
        <h4 style="margin:0 0 6px 0">${svc.name}</h4>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:14px">${svc.description}</p>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:1.15rem;font-weight:700;color:var(--primary)">${Fmt.currency(svc.price)}</span>
          <div style="font-size:0.75rem;color:var(--text-muted)">Approx: ${svc.duration} hrs</div>
        </div>
        <span class="badge badge-success">Available</span>
      </div>
    </div>
  `).join('');
}

// ------ Invoices Management ------
function loadInvoices() {
  const container = document.getElementById('advInvoicesContainer');
  if (!container) return;

  const invoices = DB.getAll(COLLECTIONS.INVOICES).slice().reverse();
  const completedWithoutInvoices = DB.query(COLLECTIONS.JOB_CARDS, j =>
    (j.status === 'Completed' || j.status === 'Closed') &&
    !invoices.some(inv => inv.jobCardId === j.id)
  );

  let bannerHtml = '';
  if (completedWithoutInvoices.length > 0) {
    bannerHtml = `
      <div class="card mb-4" style="border-left:4px solid var(--warning)">
        <div class="card-header"><h3 class="card-title">⚠️ Pending Invoice Generations (${completedWithoutInvoices.length})</h3></div>
        <div class="card-body p-0">
          ${completedWithoutInvoices.map(jc => {
            const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer' };
            const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'Vehicle' };
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
                <div>
                  <strong>${jc.id}</strong> – ${veh.registrationNo} (${cust.name})
                  <div style="font-size:0.8rem;color:var(--text-muted)">Work completed • Ready for billing</div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="openGenInvoiceModal('${jc.id}')">+ Generate Invoice</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = bannerHtml + `
    <div class="card">
      <div class="card-header"><h3 class="card-title">All Invoices</h3></div>
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Invoice ID</th><th>Customer</th><th>Vehicle</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${!invoices.length ? '<tr><td colspan="7" class="text-center text-muted p-4">No invoices issued yet.</td></tr>' :
              invoices.map(inv => {
                const cust = DB.getById(COLLECTIONS.USERS, inv.customerId) || { name: 'Customer' };
                const veh = DB.getById(COLLECTIONS.VEHICLES, inv.vehicleId) || { registrationNo: 'Vehicle' };
                return `
                  <tr>
                    <td><strong>${inv.id}</strong></td>
                    <td>${cust.name}</td>
                    <td>${veh.registrationNo}</td>
                    <td>${Fmt.date(inv.createdAt)}</td>
                    <td><strong>${Fmt.currency(inv.grandTotal)}</strong></td>
                    <td>${inv.status === 'Paid' ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Unpaid</span>'}</td>
                    <td>
                      <button class="btn btn-xs btn-outline-primary" onclick="viewInvoiceModal('${inv.id}')">View</button>
                      <button class="btn btn-xs btn-secondary" onclick="printElement('invoiceViewContent');viewInvoiceModal('${inv.id}')">Print</button>
                    </td>
                  </tr>
                `;
              }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openGenInvoiceModal(jcId) {
  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer' };
  const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'Vehicle', model: '' };
  const apt = DB.getById(COLLECTIONS.APPOINTMENTS, jc.appointmentId);
  const svc = apt ? (DB.getById(COLLECTIONS.SERVICES, apt.serviceId) || { name: 'Service', price: 2000 }) : { name: 'Service', price: 2000 };

  const labourCost = jc.labourCost || 800;
  const parts = jc.requiredParts || [];
  const partsTotal = parts.reduce((acc, p) => acc + (p.price * p.qty), 0);
  const subtotal = labourCost + partsTotal;
  const tax = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + tax;

  const content = document.getElementById('genInvoiceContent');
  content.innerHTML = `
    <div style="line-height:1.6">
      <div class="grid-2 mb-3">
        <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius)">
          <strong>Customer:</strong> ${cust.name}<br>
          <strong>Vehicle:</strong> ${veh.registrationNo} (${veh.model})<br>
          <strong>Job Card:</strong> ${jc.id}
        </div>
        <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius)">
          <strong>Primary Service:</strong> ${svc.name}<br>
          <strong>Base Labour:</strong> ${Fmt.currency(labourCost)}<br>
          <strong>Parts Count:</strong> ${parts.length} items
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Labor Cost (₹)</label>
        <input type="number" id="invLabour" class="form-control" value="${labourCost}" onchange="recalcInvoiceTotal()">
      </div>

      <div class="form-group">
        <label class="form-label">Discount (₹)</label>
        <input type="number" id="invDiscount" class="form-control" value="0" onchange="recalcInvoiceTotal()">
      </div>

      <div id="invoiceSummaryBox" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Labour Cost:</span><span id="sumLabour">${Fmt.currency(labourCost)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Spare Parts:</span><span id="sumParts">${Fmt.currency(partsTotal)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>GST (18%):</span><span id="sumTax">${Fmt.currency(tax)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Discount:</span><span id="sumDiscount" style="color:var(--danger)">₹0</span></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:10px 0">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.15rem"><span>Grand Total:</span><span id="sumGrand" style="color:var(--primary)">${Fmt.currency(grandTotal)}</span></div>
      </div>
    </div>
  `;

  window._currentInvoiceGenData = {
    jcId: jc.id,
    appointmentId: jc.appointmentId,
    customerId: jc.customerId,
    vehicleId: jc.vehicleId,
    serviceName: svc.name,
    partsTotal,
    parts
  };

  document.getElementById('createInvoiceBtn').onclick = createInvoiceAction;
  Modal.open('genInvoiceModal');
}

function recalcInvoiceTotal() {
  if (!window._currentInvoiceGenData) return;
  const data = window._currentInvoiceGenData;
  const labour = parseFloat(document.getElementById('invLabour').value) || 0;
  const discount = parseFloat(document.getElementById('invDiscount').value) || 0;
  const subtotal = Math.max(0, labour + data.partsTotal - discount);
  const tax = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + tax;

  document.getElementById('sumLabour').textContent = Fmt.currency(labour);
  document.getElementById('sumDiscount').textContent = '-' + Fmt.currency(discount);
  document.getElementById('sumTax').textContent = Fmt.currency(tax);
  document.getElementById('sumGrand').textContent = Fmt.currency(grandTotal);
}

function createInvoiceAction() {
  if (!window._currentInvoiceGenData) return;
  const data = window._currentInvoiceGenData;
  const labour = parseFloat(document.getElementById('invLabour').value) || 0;
  const discount = parseFloat(document.getElementById('invDiscount').value) || 0;
  const subtotal = Math.max(0, labour + data.partsTotal);
  const tax = Math.round((subtotal - discount) * 0.18);
  const grandTotal = subtotal - discount + tax;

  const invId = DB.generateId('INV');
  const newInvoice = {
    id: invId,
    jobCardId: data.jcId,
    appointmentId: data.appointmentId,
    customerId: data.customerId,
    vehicleId: data.vehicleId,
    serviceItems: [{ name: data.serviceName, amount: labour }],
    partItems: data.parts,
    labourCost: labour,
    subtotal,
    tax,
    discount,
    grandTotal,
    status: 'Unpaid',
    paymentMethod: null,
    createdAt: new Date().toISOString(),
    paidAt: null
  };

  DB.insert(COLLECTIONS.INVOICES, newInvoice);

  // Notify customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: data.customerId,
    type: 'invoice',
    title: 'Invoice Issued',
    message: `Invoice ${invId} for ₹${grandTotal} has been generated for your recent service.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Modal.close('genInvoiceModal');
  Toast.success('Invoice Created', `Invoice ${invId} generated successfully.`);
  loadInvoices();
  loadJobCards();
  loadDashboard();
}

function viewInvoiceModal(invId) {
  const inv = DB.getById(COLLECTIONS.INVOICES, invId);
  if (!inv) return;

  const cust = DB.getById(COLLECTIONS.USERS, inv.customerId) || { name: 'Customer', email: '', phone: '', address: '' };
  const veh = DB.getById(COLLECTIONS.VEHICLES, inv.vehicleId) || { model: 'N/A', registrationNo: 'N/A' };

  const content = document.getElementById('invoiceViewContent');
  content.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:var(--radius);padding:24px;font-family:inherit">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid var(--primary);padding-bottom:16px;margin-bottom:20px">
        <div>
          <h2 style="margin:0;color:var(--primary)">VSMS SERVICE CENTER</h2>
          <p style="margin:4px 0 0 0;font-size:0.85rem;color:var(--text-secondary)">Professional Vehicle Care & Diagnostics</p>
        </div>
        <div style="text-align:right">
          <h3 style="margin:0">${inv.id}</h3>
          <div style="font-size:0.85rem;color:var(--text-muted)">Date: ${Fmt.date(inv.createdAt)}</div>
          <div class="mt-1">${inv.status === 'Paid' ? '<span class="badge badge-success">PAID</span>' : '<span class="badge badge-warning">UNPAID</span>'}</div>
        </div>
      </div>

      <div class="grid-2 mb-4" style="font-size:0.9rem">
        <div>
          <strong>Billed To:</strong><br>
          ${cust.name}<br>
          ${cust.phone || ''} | ${cust.email || ''}<br>
          ${cust.address || ''}
        </div>
        <div style="text-align:right">
          <strong>Vehicle Information:</strong><br>
          Model: ${veh.model}<br>
          Reg No: <strong>${veh.registrationNo}</strong><br>
          Job Card Ref: ${inv.jobCardId || 'N/A'}
        </div>
      </div>

      <table class="table mb-4">
        <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${(inv.serviceItems || []).map(s => `<tr><td>${s.name} (Labour)</td><td>1</td><td style="text-align:right">${Fmt.currency(s.amount)}</td></tr>`).join('')}
          ${(inv.partItems || []).map(p => `<tr><td>${p.name}</td><td>${p.qty}</td><td style="text-align:right">${Fmt.currency(p.price * p.qty)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end">
        <div style="width:260px;font-size:0.9rem;line-height:1.8">
          <div style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${Fmt.currency(inv.subtotal || 0)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>GST (18%):</span><span>${Fmt.currency(inv.tax || 0)}</span></div>
          ${inv.discount ? `<div style="display:flex;justify-content:space-between;color:var(--danger)"><span>Discount:</span><span>-${Fmt.currency(inv.discount)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.15rem;border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
            <span>Total:</span><span style="color:var(--primary)">${Fmt.currency(inv.grandTotal)}</span>
          </div>
        </div>
      </div>

      ${inv.status === 'Paid' ? `
        <div style="margin-top:20px;padding:12px;background:var(--success-light);color:var(--success-dark);border-radius:var(--radius);text-align:center;font-weight:600">
          ✓ Payment Received via ${inv.paymentMethod || 'Online'} on ${Fmt.date(inv.paidAt || inv.createdAt)}
        </div>
      ` : ''}
    </div>
  `;

  Modal.open('invoiceViewModal');
}

// ------ Customers View ------
function loadCustomers() {
  const tbody = document.getElementById('customersBody');
  if (!tbody) return;

  const q = document.getElementById('custSearch')?.value.toLowerCase().trim() || '';
  let customers = DB.query(COLLECTIONS.USERS, u => u.role === 'customer');

  if (q) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }

  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">No customers found.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => {
    const vehCount = DB.query(COLLECTIONS.VEHICLES, v => v.customerId === c.id).length;
    const aptCount = DB.query(COLLECTIONS.APPOINTMENTS, a => a.customerId === c.id).length;

    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || 'N/A'}</td>
        <td>${c.email}</td>
        <td><span class="badge badge-info">${vehCount} Vehicles</span></td>
        <td><span class="badge badge-secondary">${aptCount} Appts</span></td>
        <td><span class="badge badge-success">${c.status || 'Active'}</span></td>
      </tr>
    `;
  }).join('');
}

// ------ Notifications ------
function loadNotifications() {
  const allNotifs = DB.getAll(COLLECTIONS.NOTIFICATIONS).slice().reverse();
  const unreadCount = allNotifs.filter(n => !n.read).length;

  const notifCountElem = document.getElementById('notifCount');
  const sidebarNotifBadge = document.getElementById('sidebarNotifBadge');
  if (notifCountElem) notifCountElem.textContent = unreadCount;
  if (sidebarNotifBadge) sidebarNotifBadge.textContent = unreadCount || '';

  // Dropdown list
  const notifList = document.getElementById('notifList');
  if (notifList) {
    if (!allNotifs.length) {
      notifList.innerHTML = `<div class="p-3 text-center text-muted">No notifications</div>`;
    } else {
      notifList.innerHTML = allNotifs.slice(0, 6).map(n => `
        <div class="notif-item ${!n.read ? 'unread' : ''}" style="padding:10px 14px;border-bottom:1px solid var(--border)">
          <div style="font-weight:600;font-size:0.85rem">${n.title}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">${n.message}</div>
          <small class="text-muted">${Fmt.date(n.createdAt)}</small>
        </div>
      `).join('');
    }
  }

  // View notifications container
  const viewContainer = document.getElementById('advNotificationsContainer');
  if (viewContainer) {
    if (!allNotifs.length) {
      viewContainer.innerHTML = `<div class="card p-4 text-center text-muted">No notifications in your inbox.</div>`;
    } else {
      viewContainer.innerHTML = allNotifs.map(n => `
        <div class="card mb-3 p-3 ${!n.read ? 'border-primary' : ''}" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h4 style="margin:0 0 4px 0">${n.title}</h4>
            <p style="margin:0 0 6px 0;color:var(--text-secondary);font-size:0.9rem">${n.message}</p>
            <small class="text-muted">${Fmt.date(n.createdAt)}</small>
          </div>
          <div>
            ${!n.read ? `<button class="btn btn-xs btn-outline-primary" onclick="markSingleNotifRead('${n.id}')">Mark Read</button>` : '<span class="text-muted" style="font-size:0.8rem">Read</span>'}
          </div>
        </div>
      `).join('');
    }
  }
}

function markSingleNotifRead(id) {
  DB.update(COLLECTIONS.NOTIFICATIONS, id, { read: true });
  loadNotifications();
}

function markAllNotificationsRead() {
  const all = DB.getAll(COLLECTIONS.NOTIFICATIONS);
  all.forEach(n => { n.read = true; });
  DB.saveAll(COLLECTIONS.NOTIFICATIONS, all);
  loadNotifications();
  Toast.success('Updated', 'All notifications marked as read.');
}

// ------ Global Search ------
function runAdvisorGlobalSearch(q) {
  const qLower = q.toLowerCase();
  const aptMatch = DB.query(COLLECTIONS.APPOINTMENTS, a => a.id.toLowerCase().includes(qLower))[0];
  const jcMatch = DB.query(COLLECTIONS.JOB_CARDS, j => j.id.toLowerCase().includes(qLower))[0];
  const custMatch = DB.query(COLLECTIONS.USERS, u => u.role === 'customer' && u.name.toLowerCase().includes(qLower))[0];

  if (jcMatch) {
    switchView('jobcards');
    const searchInput = document.getElementById('jcSearch');
    if (searchInput) searchInput.value = q;
    loadJobCards();
  } else if (aptMatch) {
    switchView('appointments');
    const searchInput = document.getElementById('advAptSearch');
    if (searchInput) searchInput.value = q;
    loadAppointments();
  } else if (custMatch) {
    switchView('customers');
    const searchInput = document.getElementById('custSearch');
    if (searchInput) searchInput.value = q;
    loadCustomers();
  }
}

// ------ Helper: Pagination UI ------
function renderPagination(containerId, currentPage, totalPages, onChange) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<div style="display:flex;gap:6px;justify-content:center;align-items:center">`;
  html += `<button class="btn btn-xs btn-secondary" ${currentPage === 1 ? 'disabled' : ''} id="${containerId}-prev">Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn btn-xs ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="btn btn-xs btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} id="${containerId}-next">Next</button>`;
  html += `</div>`;

  container.innerHTML = html;

  document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => onChange(currentPage - 1));
  document.getElementById(`${containerId}-next`)?.addEventListener('click', () => onChange(currentPage + 1));
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => onChange(parseInt(btn.dataset.page)));
  });
}
