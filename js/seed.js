/* ============================================================
   seed.js – Sample Data Seeder
   ============================================================ */

function seedDatabase() {
  // Only seed if not already seeded
  if (DB.getValue('seeded')) return;

  // ---- Users ----
  const users = [
    { id: 'USR-001', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '9876543210', role: 'customer', password: 'password123', address: '12 MG Road, Bangalore', status: 'Active', createdAt: '2025-01-15T10:00:00Z' },
    { id: 'USR-002', name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211', role: 'customer', password: 'password123', address: '45 Anna Nagar, Chennai', status: 'Active', createdAt: '2025-02-20T10:00:00Z' },
    { id: 'USR-003', name: 'Amit Singh', email: 'amit@example.com', phone: '9876543212', role: 'customer', password: 'password123', address: '78 Banjara Hills, Hyderabad', status: 'Active', createdAt: '2025-03-10T10:00:00Z' },
    { id: 'ADV-001', name: 'Suresh Nair', email: 'suresh@vsms.com', phone: '9800012345', role: 'advisor', password: 'advisor123', address: 'VSMS Service Center, Bangalore', status: 'Active', createdAt: '2024-06-01T10:00:00Z' },
    { id: 'ADV-002', name: 'Meena Iyer', email: 'meena@vsms.com', phone: '9800012346', role: 'advisor', password: 'advisor123', address: 'VSMS Service Center, Chennai', status: 'Active', createdAt: '2024-06-01T10:00:00Z' },
    { id: 'MEC-001', name: 'Ravi Mechanics', email: 'ravi@vsms.com', phone: '9700012345', role: 'mechanic', password: 'mechanic123', address: 'VSMS Garage, Bangalore', status: 'Active', createdAt: '2024-06-01T10:00:00Z' },
    { id: 'MEC-002', name: 'Karthik Auto', email: 'karthik@vsms.com', phone: '9700012346', role: 'mechanic', password: 'mechanic123', address: 'VSMS Garage, Bangalore', status: 'Active', createdAt: '2024-06-01T10:00:00Z' },
    { id: 'MEC-003', name: 'David Motors', email: 'david@vsms.com', phone: '9700012347', role: 'mechanic', password: 'mechanic123', address: 'VSMS Garage, Chennai', status: 'Active', createdAt: '2024-06-01T10:00:00Z' },
    { id: 'ADM-001', name: 'Admin User', email: 'admin@vsms.com', phone: '9600012345', role: 'admin', password: 'admin123', address: 'VSMS HQ, Bangalore', status: 'Active', createdAt: '2024-01-01T10:00:00Z' },
  ];
  DB.saveAll(COLLECTIONS.USERS, users);

  // ---- Vehicles ----
  const vehicles = [
    { id: 'VEH-001', customerId: 'USR-001', registrationNo: 'KA-01-AB-1234', model: 'Maruti Suzuki Swift', type: 'Hatchback', year: 2021, fuelType: 'Petrol', color: 'Red', mileage: 35000, status: 'Active', createdAt: '2025-01-20T10:00:00Z' },
    { id: 'VEH-002', customerId: 'USR-001', registrationNo: 'KA-01-CD-5678', model: 'Honda City', type: 'Sedan', year: 2020, fuelType: 'Petrol', color: 'White', mileage: 52000, status: 'Active', createdAt: '2025-02-15T10:00:00Z' },
    { id: 'VEH-003', customerId: 'USR-002', registrationNo: 'TN-09-EF-9012', model: 'Hyundai Creta', type: 'SUV', year: 2022, fuelType: 'Diesel', color: 'Grey', mileage: 28000, status: 'Active', createdAt: '2025-03-01T10:00:00Z' },
    { id: 'VEH-004', customerId: 'USR-003', registrationNo: 'TS-08-GH-3456', model: 'Toyota Fortuner', type: 'SUV', year: 2019, fuelType: 'Diesel', color: 'Black', mileage: 78000, status: 'Active', createdAt: '2025-04-05T10:00:00Z' },
    { id: 'VEH-005', customerId: 'USR-002', registrationNo: 'TN-09-IJ-7890', model: 'Tata Nexon EV', type: 'Hatchback', year: 2023, fuelType: 'Electric', color: 'Blue', mileage: 12000, status: 'Active', createdAt: '2025-05-10T10:00:00Z' },
    { id: 'VEH-006', customerId: 'USR-003', registrationNo: 'TS-08-KL-2345', model: 'Mahindra XUV700', type: 'SUV', year: 2022, fuelType: 'Diesel', color: 'Silver', mileage: 21000, status: 'Active', createdAt: '2025-06-12T10:00:00Z' },
  ];
  DB.saveAll(COLLECTIONS.VEHICLES, vehicles);

  // ---- Services ----
  const services = [
    { id: 'SVC-001', name: 'General Service', description: 'Complete vehicle checkup & fluid top-up', duration: 4, price: 2500, category: 'Maintenance' },
    { id: 'SVC-002', name: 'Oil Change', description: 'Engine oil + filter replacement', duration: 1, price: 800, category: 'Fluid' },
    { id: 'SVC-003', name: 'Brake Service', description: 'Brake pad inspection, cleaning & replacement', duration: 3, price: 3500, category: 'Safety' },
    { id: 'SVC-004', name: 'Engine Repair', description: 'Comprehensive engine diagnosis and repair', duration: 8, price: 12000, category: 'Repair' },
    { id: 'SVC-005', name: 'AC Service', description: 'AC gas refill, filter cleaning & compressor check', duration: 3, price: 2800, category: 'Comfort' },
    { id: 'SVC-006', name: 'Battery Replacement', description: 'Battery testing & replacement with warranty', duration: 1, price: 5500, category: 'Electrical' },
    { id: 'SVC-007', name: 'Wheel Alignment', description: '4-wheel alignment, balancing & rotation', duration: 2, price: 1200, category: 'Tyres' },
    { id: 'SVC-008', name: 'Tyre Service', description: 'Tyre change, rotation & pressure check', duration: 2, price: 600, category: 'Tyres' },
    { id: 'SVC-009', name: 'Full Vehicle Inspection', description: '100-point comprehensive vehicle inspection', duration: 5, price: 999, category: 'Inspection' },
  ];
  DB.saveAll(COLLECTIONS.SERVICES, services);

  // ---- Mechanics ----
  const mechanics = [
    { id: 'MEC-001', name: 'Ravi Mechanics', userId: 'MEC-001', specialization: ['Engine', 'General'], experience: 8, rating: 4.8, assignedJobs: 2, status: 'Available' },
    { id: 'MEC-002', name: 'Karthik Auto', userId: 'MEC-002', specialization: ['Electrical', 'AC'], experience: 6, rating: 4.6, assignedJobs: 1, status: 'Busy' },
    { id: 'MEC-003', name: 'David Motors', userId: 'MEC-003', specialization: ['Tyres', 'Brakes'], experience: 10, rating: 4.9, assignedJobs: 0, status: 'Available' },
    { id: 'MEC-004', name: 'Sunil Autowala', userId: null, specialization: ['Bodywork', 'Paint'], experience: 5, rating: 4.4, assignedJobs: 0, status: 'Available' },
  ];
  DB.saveAll(COLLECTIONS.MECHANICS, mechanics);

  // ---- Appointments ----
  const now = new Date();
  const d = (days, h = 10) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h,0,0,0); return d.toISOString(); };
  const appointments = [
    { id: 'APT-001', customerId: 'USR-001', vehicleId: 'VEH-001', serviceId: 'SVC-001', serviceCenter: 'Bangalore Main', date: d(-10), time: '10:00', status: 'Completed', notes: 'Regular service', createdAt: d(-15) },
    { id: 'APT-002', customerId: 'USR-001', vehicleId: 'VEH-002', serviceId: 'SVC-002', serviceCenter: 'Bangalore Main', date: d(-5), time: '14:00', status: 'Completed', notes: 'Oil change needed', createdAt: d(-8) },
    { id: 'APT-003', customerId: 'USR-002', vehicleId: 'VEH-003', serviceId: 'SVC-005', serviceCenter: 'Chennai Branch', date: d(-3), time: '11:00', status: 'Checked-In', notes: 'AC not cooling well', createdAt: d(-4) },
    { id: 'APT-004', customerId: 'USR-003', vehicleId: 'VEH-004', serviceId: 'SVC-004', serviceCenter: 'Hyderabad Branch', date: d(-1), time: '09:00', status: 'Checked-In', notes: 'Strange engine noise', createdAt: d(-2) },
    { id: 'APT-005', customerId: 'USR-001', vehicleId: 'VEH-001', serviceId: 'SVC-007', serviceCenter: 'Bangalore Main', date: d(2), time: '10:00', status: 'Confirmed', notes: 'Wheel alignment check', createdAt: d(-1) },
    { id: 'APT-006', customerId: 'USR-002', vehicleId: 'VEH-005', serviceId: 'SVC-009', serviceCenter: 'Chennai Branch', date: d(5), time: '11:00', status: 'Pending', notes: 'Full inspection needed', createdAt: d(0) },
    { id: 'APT-007', customerId: 'USR-003', vehicleId: 'VEH-006', serviceId: 'SVC-003', serviceCenter: 'Hyderabad Branch', date: d(7), time: '14:00', status: 'Pending', notes: 'Brakes squeaking', createdAt: d(0) },
  ];
  DB.saveAll(COLLECTIONS.APPOINTMENTS, appointments);

  // ---- Job Cards ----
  const jobCards = [
    {
      id: 'JC-001', appointmentId: 'APT-001', customerId: 'USR-001', vehicleId: 'VEH-001',
      complaint: 'Regular general service – oil change, filter replacement, fluid levels', mechanicId: 'MEC-001',
      inspectionDetails: 'Vehicle in good condition. All fluids topped up. Air filter replaced.',
      repairDetails: 'Completed oil change, replaced air filter, checked brakes – OK.',
      requiredParts: [{ partId: 'PRT-001', name: 'Engine Oil 5W30 (4L)', qty: 1, price: 720 }, { partId: 'PRT-002', name: 'Air Filter', qty: 1, price: 450 }],
      estimatedCost: 2500, actualCost: 2800, labourCost: 800, status: 'Closed',
      createdAt: d(-14), completedAt: d(-10)
    },
    {
      id: 'JC-002', appointmentId: 'APT-003', customerId: 'USR-002', vehicleId: 'VEH-003',
      complaint: 'AC not cooling. Blowing warm air.', mechanicId: 'MEC-002',
      inspectionDetails: 'AC gas low. Compressor belt worn. Cabin filter clogged.',
      repairDetails: '', requiredParts: [{ partId: 'PRT-005', name: 'AC Refrigerant Gas R134a', qty: 1, price: 1200 }],
      estimatedCost: 2800, actualCost: null, labourCost: 600, status: 'Under Repair',
      createdAt: d(-3), completedAt: null
    },
    {
      id: 'JC-003', appointmentId: 'APT-004', customerId: 'USR-003', vehicleId: 'VEH-004',
      complaint: 'Knocking sound from engine at high RPM.', mechanicId: 'MEC-001',
      inspectionDetails: 'Engine knock detected. Possible piston ring or bearing issue.',
      repairDetails: '', requiredParts: [],
      estimatedCost: 12000, actualCost: null, labourCost: 2500, status: 'Under Inspection',
      createdAt: d(-1), completedAt: null
    },
  ];
  DB.saveAll(COLLECTIONS.JOB_CARDS, jobCards);

  // ---- Inventory ----
  const inventory = [
    { id: 'PRT-001', name: 'Engine Oil 5W30 (4L)', category: 'Fluids', quantity: 45, minStock: 10, price: 720, supplierId: 'SUP-001', status: 'In Stock' },
    { id: 'PRT-002', name: 'Air Filter', category: 'Filters', quantity: 30, minStock: 10, price: 450, supplierId: 'SUP-001', status: 'In Stock' },
    { id: 'PRT-003', name: 'Brake Pad Set (Front)', category: 'Brakes', quantity: 8, minStock: 5, price: 2200, supplierId: 'SUP-002', status: 'In Stock' },
    { id: 'PRT-004', name: 'Brake Disc Rotor', category: 'Brakes', quantity: 3, minStock: 4, price: 3500, supplierId: 'SUP-002', status: 'Low Stock' },
    { id: 'PRT-005', name: 'AC Refrigerant Gas R134a', category: 'AC', quantity: 12, minStock: 5, price: 1200, supplierId: 'SUP-003', status: 'In Stock' },
    { id: 'PRT-006', name: 'Car Battery 65Ah', category: 'Electrical', quantity: 7, minStock: 3, price: 4800, supplierId: 'SUP-003', status: 'In Stock' },
    { id: 'PRT-007', name: 'Spark Plug Set (4pcs)', category: 'Engine', quantity: 0, minStock: 5, price: 1600, supplierId: 'SUP-001', status: 'Out of Stock' },
    { id: 'PRT-008', name: 'Coolant (1L)', category: 'Fluids', quantity: 25, minStock: 8, price: 380, supplierId: 'SUP-001', status: 'In Stock' },
    { id: 'PRT-009', name: 'Wiper Blade Set', category: 'Body', quantity: 2, minStock: 5, price: 650, supplierId: 'SUP-004', status: 'Low Stock' },
    { id: 'PRT-010', name: 'Oil Filter', category: 'Filters', quantity: 40, minStock: 10, price: 320, supplierId: 'SUP-001', status: 'In Stock' },
    { id: 'PRT-011', name: 'Transmission Fluid (1L)', category: 'Fluids', quantity: 18, minStock: 5, price: 520, supplierId: 'SUP-001', status: 'In Stock' },
    { id: 'PRT-012', name: 'Tyre (185/65 R15)', category: 'Tyres', quantity: 16, minStock: 8, price: 4200, supplierId: 'SUP-005', status: 'In Stock' },
  ];
  DB.saveAll(COLLECTIONS.INVENTORY, inventory);

  // ---- Suppliers ----
  const suppliers = [
    { id: 'SUP-001', name: 'AutoParts India Ltd', contact: 'Mohan Verma', phone: '9988776655', email: 'mohan@autoparts.in', category: 'Fluids & Filters', status: 'Active' },
    { id: 'SUP-002', name: 'BrakeMaster Co.', contact: 'Anand Patil', phone: '9977665544', email: 'anand@brakemaster.in', category: 'Brakes', status: 'Active' },
    { id: 'SUP-003', name: 'CoolElect Systems', contact: 'Sunita Rao', phone: '9966554433', email: 'sunita@coolelect.in', category: 'AC & Electrical', status: 'Active' },
    { id: 'SUP-004', name: 'CarBody Solutions', contact: 'Deepak Gupta', phone: '9955443322', email: 'deepak@carbody.in', category: 'Body Parts', status: 'Active' },
    { id: 'SUP-005', name: 'TyreKing Distributors', contact: 'Ramesh Pillai', phone: '9944332211', email: 'ramesh@tyreking.in', category: 'Tyres', status: 'Active' },
  ];
  DB.saveAll(COLLECTIONS.SUPPLIERS, suppliers);

  // ---- Invoices ----
  const invoices = [
    {
      id: 'INV-001', jobCardId: 'JC-001', appointmentId: 'APT-001',
      customerId: 'USR-001', vehicleId: 'VEH-001',
      serviceItems: [{ name: 'General Service', amount: 800 }],
      partItems: [{ name: 'Engine Oil 5W30 (4L)', qty: 1, price: 720 }, { name: 'Air Filter', qty: 1, price: 450 }],
      labourCost: 800, subtotal: 2500, tax: 450, discount: 150, grandTotal: 2800,
      status: 'Paid', paymentMethod: 'UPI', createdAt: d(-10), paidAt: d(-10)
    },
    {
      id: 'INV-002', jobCardId: 'JC-002', appointmentId: 'APT-003',
      customerId: 'USR-002', vehicleId: 'VEH-003',
      serviceItems: [{ name: 'AC Service', amount: 600 }],
      partItems: [{ name: 'AC Refrigerant Gas R134a', qty: 1, price: 1200 }],
      labourCost: 600, subtotal: 2500, tax: 450, discount: 0, grandTotal: 2800,
      status: 'Unpaid', paymentMethod: null, createdAt: d(-1), paidAt: null
    },
  ];
  DB.saveAll(COLLECTIONS.INVOICES, invoices);

  // ---- Payments ----
  const payments = [
    {
      id: 'PAY-001', invoiceId: 'INV-001', customerId: 'USR-001',
      transactionId: 'TXN' + Date.now(),
      amount: 2800, method: 'UPI', status: 'Paid',
      date: d(-10), receipt: 'RCP-001'
    }
  ];
  DB.saveAll(COLLECTIONS.PAYMENTS, payments);

  // ---- Notifications ----
  const notifications = [
    { id: 'NTF-001', userId: 'USR-001', type: 'appointment', title: 'Appointment Confirmed', message: 'Your appointment APT-005 is confirmed for ' + Fmt.date(d(2)), read: false, createdAt: d(-1) },
    { id: 'NTF-002', userId: 'USR-001', type: 'reminder',    title: 'Service Reminder',      message: 'Your vehicle KA-01-AB-1234 is due for service next week', read: false, createdAt: d(0) },
    { id: 'NTF-003', userId: 'USR-002', type: 'status',      title: 'Repair In Progress',    message: 'Your vehicle TN-09-EF-9012 is currently under repair', read: false, createdAt: d(-2) },
    { id: 'NTF-004', userId: 'USR-003', type: 'invoice',     title: 'Invoice Generated',     message: 'Invoice INV-002 has been generated. Amount: ₹2,800', read: true, createdAt: d(-3) },
    { id: 'NTF-005', userId: 'ADM-001', type: 'alert',       title: 'Low Stock Alert',       message: 'Brake Disc Rotor is running low (3 units). Order soon.', read: false, createdAt: d(0) },
    { id: 'NTF-006', userId: 'ADM-001', type: 'payment',     title: 'Payment Received',      message: 'Payment of ₹2,800 received for Invoice INV-001', read: true, createdAt: d(-10) },
    { id: 'NTF-007', userId: 'MEC-001', type: 'assignment',  title: 'New Job Assigned',      message: 'Job Card JC-003 has been assigned to you. Vehicle: TS-08-GH-3456', read: false, createdAt: d(-1) },
  ];
  DB.saveAll(COLLECTIONS.NOTIFICATIONS, notifications);

  // ---- Feedback ----
  const feedback = [
    { id: 'FBK-001', customerId: 'USR-001', jobCardId: 'JC-001', appointmentId: 'APT-001', rating: 5, comment: 'Excellent service! Car feels brand new after the general service.', createdAt: d(-9) },
  ];
  DB.saveAll(COLLECTIONS.FEEDBACK, feedback);

  // Mark as seeded
  DB.setValue('seeded', true);
  console.log('✅ VSMS database seeded with sample data');
}
