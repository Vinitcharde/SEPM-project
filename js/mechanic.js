/* ============================================================
   mechanic.js – Mechanic Dashboard Logic
   ============================================================ */

let currentUser = null;
let currentMechanicRecord = null;

// ------ Initialization ------
document.addEventListener('DOMContentLoaded', () => {
  seedDatabase();
  Theme.init();
  currentUser = Auth.guard('mechanic');
  if (!currentUser) return;

  // Find mechanic entity
  const mechanics = DB.getAll(COLLECTIONS.MECHANICS);
  currentMechanicRecord = mechanics.find(m => m.userId === currentUser.id) ||
                          mechanics.find(m => m.name.toLowerCase() === currentUser.name.toLowerCase()) ||
                          mechanics[0];

  setupUI();
  setupSidebar();
  setupTopnav();
  loadDashboard();
  loadAssignedJobs();
  loadInspectionView();
  loadPartsRequisitionView();
  loadCompletedJobs();
  loadNotifications();

  // Default view
  switchView('dashboard');

  // Sidebar navigation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Global search
  document.getElementById('globalSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length > 1) runMechanicGlobalSearch(q);
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    Modal.confirm('Logout', 'Are you sure you want to logout?', () => Auth.logout());
  });

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
  setElem('dashWelcomeName', currentUser.name.split(' ')[0]);

  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profPhone = document.getElementById('prof-phone');
  if (profName) profName.value = currentUser.name || '';
  if (profEmail) profEmail.value = currentUser.email || '';
  if (profPhone) profPhone.value = currentUser.phone || '';

  // Mechanic Status selector
  const statusSelect = document.getElementById('mechanicStatusSelect');
  if (statusSelect && currentMechanicRecord) {
    statusSelect.value = currentMechanicRecord.status || 'Available';
  }
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

  document.getElementById('markAllRead')?.addEventListener('click', markAllNotificationsRead);
  document.getElementById('markAllReadBtn')?.addEventListener('click', markAllNotificationsRead);

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

  switch (viewName) {
    case 'dashboard': loadDashboard(); break;
    case 'assigned-jobs': loadAssignedJobs(); break;
    case 'inspection': loadInspectionView(); break;
    case 'parts-request': loadPartsRequisitionView(); break;
    case 'completed-jobs': loadCompletedJobs(); break;
    case 'notifications': loadNotifications(); break;
  }
}

// ------ Event Listeners ------
function setupEventListeners() {
  // Mechanic status change
  document.getElementById('mechanicStatusSelect')?.addEventListener('change', (e) => {
    const newStatus = e.target.value;
    if (currentMechanicRecord) {
      DB.update(COLLECTIONS.MECHANICS, currentMechanicRecord.id, { status: newStatus });
      Toast.success('Status Updated', `Your status is now ${newStatus}.`);
    }
  });

  // Filter assigned jobs
  document.getElementById('assignedJobSearch')?.addEventListener('input', loadAssignedJobs);
  document.getElementById('assignedJobStatusFilter')?.addEventListener('change', loadAssignedJobs);

  // Inspection dropdown
  document.getElementById('inspectionJobSelect')?.addEventListener('change', (e) => onInspectionJobSelect(e.target.value));

  // Save inspection
  document.getElementById('saveInspectionBtn')?.addEventListener('click', saveInspectionFindings);

  // Parts dropdown
  document.getElementById('partSelect')?.addEventListener('change', onPartSelectChange);
  document.getElementById('addPartToJobBtn')?.addEventListener('click', addPartToJob);

  // Save work modal
  document.getElementById('saveWorkBtn')?.addEventListener('click', saveWorkLog);

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
    Toast.success('Profile Saved', 'Details have been updated.');
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
}

// ------ Helper: Get My Job Cards ------
function getMyJobCards() {
  if (!currentMechanicRecord) return [];
  return DB.query(COLLECTIONS.JOB_CARDS, j => j.mechanicId === currentMechanicRecord.id);
}

// ------ Dashboard Overview ------
function loadDashboard() {
  const myJobs = getMyJobCards();
  const assigned = myJobs.filter(j => j.status === 'Assigned').length;
  const inspection = myJobs.filter(j => j.status === 'Under Inspection').length;
  const underRepair = myJobs.filter(j => j.status === 'Under Repair' || j.status === 'Quality Check').length;
  const completed = myJobs.filter(j => j.status === 'Completed' || j.status === 'Closed').length;

  document.getElementById('statAssigned').textContent = assigned;
  document.getElementById('statInspection').textContent = inspection;
  document.getElementById('statUnderRepair').textContent = underRepair;
  document.getElementById('statCompleted').textContent = completed;

  // Badge count on sidebar
  const activeCount = assigned + inspection + underRepair;
  const badge = document.getElementById('assignedCountBadge');
  if (badge) badge.textContent = activeCount > 0 ? activeCount : '';

  // Current Active Job Widget
  const activeJob = myJobs.find(j => ['Under Repair', 'Under Inspection', 'Quality Check'].includes(j.status)) ||
                    myJobs.find(j => j.status === 'Assigned');
  const activeWidget = document.getElementById('currentJobWidget');
  if (activeWidget) {
    if (!activeJob) {
      activeWidget.innerHTML = `
        <div class="text-center p-4 text-muted">
          <p style="font-size:1.5rem;margin-bottom:8px">🛠️</p>
          <p>No active job currently. Check your assigned queue to begin work.</p>
        </div>
      `;
    } else {
      const veh = DB.getById(COLLECTIONS.VEHICLES, activeJob.vehicleId) || { model: 'Vehicle', registrationNo: '' };
      const cust = DB.getById(COLLECTIONS.USERS, activeJob.customerId) || { name: 'Customer', phone: '' };

      activeWidget.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <h4 style="margin:0 0 4px 0">${activeJob.id} – <span class="text-primary">${veh.model}</span></h4>
            <div style="font-size:0.85rem;color:var(--text-secondary)">Reg: <strong>${veh.registrationNo}</strong> | Owner: ${cust.name}</div>
          </div>
          <div>${Fmt.badge(activeJob.status)}</div>
        </div>

        <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius);font-size:0.85rem;margin-bottom:16px">
          <strong>Customer Complaint:</strong><br>${activeJob.complaint || 'General diagnostic inspection required'}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="openWorkModal('${activeJob.id}')">⚙️ Update Work</button>
          <button class="btn btn-sm btn-secondary" onclick="startInspection('${activeJob.id}')">🔍 Inspection</button>
          <button class="btn btn-sm btn-outline-primary" onclick="openPartsRequisition('${activeJob.id}')">📦 Request Parts</button>
        </div>
      `;
    }
  }

  // Pending Jobs Queue Widget
  const pendingWidget = document.getElementById('pendingJobsWidget');
  if (pendingWidget) {
    const queue = myJobs.filter(j => !['Completed', 'Closed'].includes(j.status));
    if (!queue.length) {
      pendingWidget.innerHTML = `<div class="p-4 text-center text-muted">No pending jobs in your queue.</div>`;
    } else {
      pendingWidget.innerHTML = queue.map(j => {
        const veh = DB.getById(COLLECTIONS.VEHICLES, j.vehicleId) || { registrationNo: 'Vehicle', model: '' };
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${j.id} – ${veh.registrationNo} <span class="text-muted">(${veh.model})</span></div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${Fmt.date(j.createdAt)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              ${Fmt.badge(j.status)}
              <button class="btn btn-xs btn-outline-primary" onclick="openWorkModal('${j.id}')">Work</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// ------ My Assigned Jobs View ------
function loadAssignedJobs() {
  const tbody = document.getElementById('assignedJobsBody');
  if (!tbody) return;

  const q = document.getElementById('assignedJobSearch')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('assignedJobStatusFilter')?.value || '';

  let list = getMyJobCards().filter(j => !['Completed', 'Closed'].includes(j.status));

  if (statusFilter) {
    list = list.filter(j => j.status === statusFilter);
  }

  if (q) {
    list = list.filter(j => {
      const veh = DB.getById(COLLECTIONS.VEHICLES, j.vehicleId) || {};
      return j.id.toLowerCase().includes(q) ||
             (veh.registrationNo && veh.registrationNo.toLowerCase().includes(q)) ||
             (j.complaint && j.complaint.toLowerCase().includes(q));
    });
  }

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">No matching assigned jobs.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(jc => {
    const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'N/A', model: '' };
    return `
      <tr>
        <td><strong>${jc.id}</strong></td>
        <td>
          <div style="font-weight:600">${veh.registrationNo}</div>
          <small class="text-muted">${veh.model || ''}</small>
        </td>
        <td style="max-width:260px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${jc.complaint}</div></td>
        <td>${Fmt.date(jc.createdAt)}</td>
        <td>${Fmt.badge(jc.status)}</td>
        <td>
          <button class="btn btn-xs btn-primary" onclick="openWorkModal('${jc.id}')">Update Work</button>
          <button class="btn btn-xs btn-secondary" onclick="startInspection('${jc.id}')">Inspect</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ------ Vehicle Inspection View ------
function loadInspectionView() {
  const select = document.getElementById('inspectionJobSelect');
  if (!select) return;

  const myJobs = getMyJobCards().filter(j => !['Completed', 'Closed'].includes(j.status));

  select.innerHTML = '<option value="">-- Choose job card --</option>' +
    myJobs.map(j => {
      const veh = DB.getById(COLLECTIONS.VEHICLES, j.vehicleId) || { registrationNo: 'Vehicle' };
      return `<option value="${j.id}">${j.id} - ${veh.registrationNo} (${j.status})</option>`;
    }).join('');
}

function startInspection(jcId) {
  switchView('inspection');
  const sel = document.getElementById('inspectionJobSelect');
  if (sel) {
    sel.value = jcId;
    onInspectionJobSelect(jcId);
  }
}

function onInspectionJobSelect(jcId) {
  const area = document.getElementById('inspectionArea');
  const info = document.getElementById('inspectionVehicleInfo');
  if (!jcId) {
    area?.classList.add('hidden');
    return;
  }

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { model: 'N/A', registrationNo: 'N/A', year: '', mileage: '', fuelType: '' };
  const cust = DB.getById(COLLECTIONS.USERS, jc.customerId) || { name: 'Customer', phone: '' };

  info.innerHTML = `
    <div style="line-height:1.7;font-size:0.9rem">
      <div style="background:var(--bg-body);padding:12px;border-radius:var(--radius);margin-bottom:12px">
        <strong>Registration:</strong> <span style="font-size:1.1rem;color:var(--primary);font-weight:700">${veh.registrationNo}</span><br>
        <strong>Model:</strong> ${veh.model} (${veh.year || '2022'})<br>
        <strong>Fuel:</strong> ${veh.fuelType || 'Petrol'} | <strong>Mileage:</strong> ${veh.mileage || '25,000'} km
      </div>
      <div><strong>Customer:</strong> ${cust.name} (${cust.phone || ''})</div>
      <div class="mt-2"><strong>Reported Issue:</strong><br><span class="text-secondary">${jc.complaint}</span></div>
      <div class="mt-2"><strong>Current Status:</strong> ${Fmt.badge(jc.status)}</div>
    </div>
  `;

  document.getElementById('inspectionNotesInput').value = jc.inspectionDetails || '';
  area?.classList.remove('hidden');
}

function saveInspectionFindings() {
  const jcId = document.getElementById('inspectionJobSelect')?.value;
  if (!jcId) {
    Toast.error('Missing Job', 'Please choose a job card.');
    return;
  }

  const notes = document.getElementById('inspectionNotesInput')?.value.trim();
  const checks = [];
  if (document.getElementById('chk-engine')?.checked) checks.push('Engine/Fluids OK');
  if (document.getElementById('chk-brakes')?.checked) checks.push('Brakes Checked');
  if (document.getElementById('chk-battery')?.checked) checks.push('Battery OK');
  if (document.getElementById('chk-tyres')?.checked) checks.push('Tyres Inspected');
  if (document.getElementById('chk-suspension')?.checked) checks.push('Suspension OK');
  if (document.getElementById('chk-ac')?.checked) checks.push('AC Operational');
  if (document.getElementById('chk-lights')?.checked) checks.push('Lights/Electronics OK');

  const fullInspectionReport = `Checklist items verified: ${checks.join(', ')}. Findings: ${notes || 'Visual inspection completed with no abnormal defects.'}`;

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  const nextStatus = jc.status === 'Assigned' ? 'Under Inspection' : jc.status;

  DB.update(COLLECTIONS.JOB_CARDS, jcId, {
    inspectionDetails: fullInspectionReport,
    status: nextStatus
  });

  // Notify customer
  DB.insert(COLLECTIONS.NOTIFICATIONS, {
    id: DB.generateId('NTF'),
    userId: jc.customerId,
    type: 'status',
    title: 'Vehicle Inspection Completed',
    message: `Inspection diagnostics completed for your vehicle. Technical findings recorded.`,
    read: false,
    createdAt: new Date().toISOString()
  });

  Toast.success('Saved', `Inspection saved for ${jcId}.`);
  loadDashboard();
  loadAssignedJobs();
}

// ------ Parts Requisition View ------
function loadPartsRequisitionView() {
  const jobSelect = document.getElementById('partReqJobSelect');
  const partSelect = document.getElementById('partSelect');
  const workshopBody = document.getElementById('workshopPartsBody');
  if (!jobSelect || !partSelect) return;

  const myJobs = getMyJobCards().filter(j => !['Completed', 'Closed'].includes(j.status));
  jobSelect.innerHTML = '<option value="">-- Choose active job --</option>' +
    myJobs.map(j => {
      const veh = DB.getById(COLLECTIONS.VEHICLES, j.vehicleId) || { registrationNo: 'Vehicle' };
      return `<option value="${j.id}">${j.id} - ${veh.registrationNo}</option>`;
    }).join('');

  const inventory = DB.getAll(COLLECTIONS.INVENTORY);
  partSelect.innerHTML = '<option value="">-- Choose part from stock --</option>' +
    inventory.map(p => `
      <option value="${p.id}" ${p.quantity <= 0 ? 'disabled' : ''}>
        ${p.name} [Stock: ${p.quantity}] - ${Fmt.currency(p.price)}
      </option>
    `).join('');

  // Live Inventory Table
  if (workshopBody) {
    workshopBody.innerHTML = inventory.map(p => {
      let stockBadge = '<span class="badge badge-success">In Stock</span>';
      if (p.quantity === 0) stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
      else if (p.quantity <= p.minStock) stockBadge = '<span class="badge badge-warning">Low Stock</span>';

      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td>${p.quantity} units ${stockBadge}</td>
          <td>${Fmt.currency(p.price)}</td>
        </tr>
      `;
    }).join('');
  }
}

function openPartsRequisition(jcId) {
  switchView('parts-request');
  const sel = document.getElementById('partReqJobSelect');
  if (sel) sel.value = jcId;
}

function onPartSelectChange() {
  const partId = document.getElementById('partSelect')?.value;
  const preview = document.getElementById('partStockPreview');
  if (!partId) {
    preview?.classList.add('hidden');
    return;
  }

  const part = DB.getById(COLLECTIONS.INVENTORY, partId);
  if (!part) return;

  preview.innerHTML = `
    <strong>Available Quantity:</strong> ${part.quantity} units | <strong>Category:</strong> ${part.category} | <strong>Unit Price:</strong> ${Fmt.currency(part.price)}
  `;
  preview.classList.remove('hidden');
}

function addPartToJob() {
  const jcId = document.getElementById('partReqJobSelect')?.value;
  const partId = document.getElementById('partSelect')?.value;
  const qty = parseInt(document.getElementById('partQty')?.value) || 1;

  if (!jcId || !partId) {
    Toast.error('Selection Missing', 'Please select both a job card and a spare part.');
    return;
  }

  const part = DB.getById(COLLECTIONS.INVENTORY, partId);
  if (!part) return;

  if (part.quantity < qty) {
    Toast.error('Insufficient Stock', `Only ${part.quantity} units available in workshop inventory.`);
    return;
  }

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  // 1. Deduct Inventory Stock
  const newQty = part.quantity - qty;
  let newStatus = 'In Stock';
  if (newQty === 0) newStatus = 'Out of Stock';
  else if (newQty <= part.minStock) newStatus = 'Low Stock';

  DB.update(COLLECTIONS.INVENTORY, partId, {
    quantity: newQty,
    status: newStatus
  });

  // 2. Add to JC requiredParts
  const existingParts = jc.requiredParts || [];
  const existingIdx = existingParts.findIndex(p => p.partId === partId);

  if (existingIdx >= 0) {
    existingParts[existingIdx].qty += qty;
  } else {
    existingParts.push({
      partId: part.id,
      name: part.name,
      qty,
      price: part.price
    });
  }

  const addedCost = part.price * qty;
  const updatedEstCost = (jc.estimatedCost || 0) + addedCost;

  DB.update(COLLECTIONS.JOB_CARDS, jcId, {
    requiredParts: existingParts,
    estimatedCost: updatedEstCost
  });

  Toast.success('Part Issued', `${qty}x ${part.name} issued to job ${jcId}. Inventory updated.`);
  loadPartsRequisitionView();
  loadDashboard();
}

// ------ Completed Jobs View ------
function loadCompletedJobs() {
  const tbody = document.getElementById('completedJobsBody');
  if (!tbody) return;

  const completedList = getMyJobCards().filter(j => ['Completed', 'Closed'].includes(j.status)).reverse();

  if (!completedList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">No completed jobs yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = completedList.map(jc => {
    const veh = DB.getById(COLLECTIONS.VEHICLES, jc.vehicleId) || { registrationNo: 'N/A', model: '' };
    const partsCount = (jc.requiredParts || []).reduce((acc, p) => acc + p.qty, 0);

    return `
      <tr>
        <td><strong>${jc.id}</strong></td>
        <td>
          <div style="font-weight:600">${veh.registrationNo}</div>
          <small class="text-muted">${veh.model || ''}</small>
        </td>
        <td>${jc.repairDetails || 'Standard maintenance completed'}</td>
        <td>${partsCount > 0 ? `<span class="badge badge-info">${partsCount} parts used</span>` : '<span class="text-muted">None</span>'}</td>
        <td>${Fmt.date(jc.completedAt || jc.createdAt)}</td>
        <td>${Fmt.badge(jc.status)}</td>
      </tr>
    `;
  }).join('');
}

// ------ Work Log Modal ------
function openWorkModal(jcId) {
  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  document.getElementById('work-jc-id').value = jc.id;
  document.getElementById('workModalTitle').textContent = `Work Log – ${jc.id}`;
  document.getElementById('work-jc-status').value = jc.status === 'Assigned' ? 'Under Repair' : jc.status;
  document.getElementById('work-jc-repair-text').value = jc.repairDetails || '';

  const partsContainer = document.getElementById('workPartsAttached');
  if (jc.requiredParts && jc.requiredParts.length > 0) {
    partsContainer.innerHTML = `
      <div style="background:var(--bg-body);padding:10px;border-radius:var(--radius);font-size:0.85rem">
        <strong>Parts Assigned:</strong>
        ${jc.requiredParts.map(p => `<div>• ${p.name} (x${p.qty}) - ${Fmt.currency(p.price * p.qty)}</div>`).join('')}
      </div>
    `;
  } else {
    partsContainer.innerHTML = '';
  }

  Modal.open('workModal');
}

function saveWorkLog() {
  const jcId = document.getElementById('work-jc-id').value;
  const status = document.getElementById('work-jc-status').value;
  const repairText = document.getElementById('work-jc-repair-text').value.trim();
  const labourHours = parseFloat(document.getElementById('work-jc-labour-hours').value) || 2;

  const jc = DB.getById(COLLECTIONS.JOB_CARDS, jcId);
  if (!jc) return;

  const updates = {
    status,
    repairDetails: repairText,
    labourCost: Math.round(labourHours * 450)
  };

  if (status === 'Completed') {
    updates.completedAt = new Date().toISOString();
    if (currentMechanicRecord) {
      DB.update(COLLECTIONS.MECHANICS, currentMechanicRecord.id, {
        assignedJobs: Math.max(0, (currentMechanicRecord.assignedJobs || 1) - 1),
        status: 'Available'
      });
    }

    // Notify Advisor
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'),
      userId: 'ADV-001',
      type: 'status',
      title: 'Job Completed by Mechanic',
      message: `Mechanic ${currentUser.name} completed work on Job Card ${jc.id}. Ready for invoicing.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Notify Customer
    DB.insert(COLLECTIONS.NOTIFICATIONS, {
      id: DB.generateId('NTF'),
      userId: jc.customerId,
      type: 'status',
      title: 'Vehicle Service Completed',
      message: `Your vehicle service for Job Card ${jc.id} has been marked complete by the mechanic!`,
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  DB.update(COLLECTIONS.JOB_CARDS, jcId, updates);

  Modal.close('workModal');
  Toast.success('Saved', `Work log for ${jcId} updated to ${status}.`);
  loadDashboard();
  loadAssignedJobs();
  loadCompletedJobs();
}

// ------ Notifications ------
function loadNotifications() {
  const myNotifs = DB.query(COLLECTIONS.NOTIFICATIONS, n => n.userId === currentUser.id || !n.userId).reverse();
  const unreadCount = myNotifs.filter(n => !n.read).length;

  const notifCountElem = document.getElementById('notifCount');
  const sidebarNotifBadge = document.getElementById('sidebarNotifBadge');
  if (notifCountElem) notifCountElem.textContent = unreadCount;
  if (sidebarNotifBadge) sidebarNotifBadge.textContent = unreadCount || '';

  // Dropdown
  const notifList = document.getElementById('notifList');
  if (notifList) {
    if (!myNotifs.length) {
      notifList.innerHTML = `<div class="p-3 text-center text-muted">No notifications</div>`;
    } else {
      notifList.innerHTML = myNotifs.slice(0, 6).map(n => `
        <div class="notif-item ${!n.read ? 'unread' : ''}" style="padding:10px 14px;border-bottom:1px solid var(--border)">
          <div style="font-weight:600;font-size:0.85rem">${n.title}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary)">${n.message}</div>
          <small class="text-muted">${Fmt.date(n.createdAt)}</small>
        </div>
      `).join('');
    }
  }

  // Full container
  const viewContainer = document.getElementById('mechanicNotificationsContainer');
  if (viewContainer) {
    if (!myNotifs.length) {
      viewContainer.innerHTML = `<div class="card p-4 text-center text-muted">No notifications yet.</div>`;
    } else {
      viewContainer.innerHTML = myNotifs.map(n => `
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
  all.forEach(n => {
    if (n.userId === currentUser.id || !n.userId) n.read = true;
  });
  DB.saveAll(COLLECTIONS.NOTIFICATIONS, all);
  loadNotifications();
  Toast.success('Updated', 'All notifications marked as read.');
}

// ------ Global Search ------
function runMechanicGlobalSearch(q) {
  const qLower = q.toLowerCase();
  const jc = getMyJobCards().find(j => j.id.toLowerCase().includes(qLower) || j.complaint.toLowerCase().includes(qLower));

  if (jc) {
    switchView('assigned-jobs');
    const input = document.getElementById('assignedJobSearch');
    if (input) input.value = q;
    loadAssignedJobs();
  }
}
