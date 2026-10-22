# VSMS – Vehicle Service Management System 🚗

A professional web application for managing vehicle services, appointments, inventory, and customer interactions. This project features a modern, responsive design with full-stack JavaScript capabilities.

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup-installation)
- [Usage](#-usage)
- [Database](#-database)
- [Security](#-security)

---

## ✨ Features

### 👥 Customer Portal
- **Dashboard**: Real-time overview of services, vehicles, and notifications.
- **Vehicle Management**: Add, edit, and track personal vehicles.
- **Service Booking**: Book services with date/time selection and service type.
- **Appointment Tracking**: Live status tracking (Confirmed → In-Service → Completed).
- **Service History**: Complete history of all past services.
- **Invoicing & Payments**: View invoices and payment status.
- **Notifications**: Real-time alerts and notifications.
- **Profile Management**: Update personal information and settings.

### 🔧 Mechanic Portal
- **Dashboard**: Overview of assigned jobs, availability, and performance.
- **Job Management**: Accept/reject service requests and update job status.
- **Vehicle Tracking**: Track vehicle progress through service stages.
- **Time Tracking**: Log work hours for jobs.
- **Profile Management**: Manage availability and professional details.

### 🏢 Workshop Portal
- **Dashboard**: Overview of workshop operations, revenue, and bookings.
- **Appointment Management**: Manage all customer appointments.
- **Billing & Invoicing**: Create and manage invoices.
- **Inventory Management**: Track parts, stocks, and suppliers.
- **Employee Management**: Manage mechanics and staff.
- **Reporting**: Generate reports on sales, inventory, and services.

### 🌐 General Features
- **Responsive Design**: Mobile, tablet, and desktop support.
- **Dark/Light Mode**: Toggle between themes.
- **User Authentication**: Secure login with JWT.
- **Role-Based Access**: Customers, Mechanics, Workshops, Admins.
- **Real-time Notifications**: WebSockets for instant updates.
- **Global Search**: Search across vehicles, appointments, and services.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5**
- **CSS3** (Custom properties, flexbox, grid)
- **JavaScript** (Vanilla ES6+)

### Backend
- **Node.js**
- **Express.js**

### Database
- **MongoDB**
  - **Mongoose** (ODM)

### Authentication & Security
- **JSON Web Tokens (JWT)**
- **bcrypt** (Password hashing)

### Real-time Features
- **Socket.IO**

---

## 📂 Project Structure

```
VSMS/
├── assets/           # Static assets
│   ├── images/
│   └── fonts/
├── css/              # Stylesheets
│   ├── main.css
│   ├── dashboard.css
│   ├── landing.css
│   └── auth.css
├── js/
│   ├── services/
│   │   └── api.js      # API service layer
│   ├── ui/
│   │   ├── nav.js      # Navigation handlers
│   │   ├── theme.js    # Theme toggle
│   │   └── search.js   # Search functionality
│   ├── views/
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   └── register.js
│   │   ├── customer/
│   │   │   ├── dashboard.js
│   │   │   ├── vehicles.js
│   │   │   ├── booking.js
│   │   │   └── ...
│   │   ├── mechanic/
│   │   │   ├── dashboard.js
│   │   │   └── ...
│   │   ├── workshop/
│   │   │   ├── dashboard.js
│   │   │   └── ...
│   │   ├── admin/
│   │   │   ├── dashboard.js
│   │   │   └── ...
│   │   ├── index.js      # Main router
│   │   └── layout.js     # Common layout handlers
│   ├── utils/
│   │   ├── auth.js       # JWT utilities
│   │   ├── validation.js
│   │   └── notifications.js
│   └── app.js          # Main application entry
├── models/           # Mongoose models
│   ├── User.js
│   ├── Vehicle.js
│   ├── ServiceRequest.js
│   ├── Invoice.js
│   ├── ...
├── routes/           # Express API routes
│   ├── auth.js
│   ├── vehicles.js
│   ├── services.js
│   ├── invoices.js
│   ├── ...
├── views/            # HTML templates (optional if using single-page app)
├── public/           # Served files (if not using SPA routing)
│   ├── index.html
│   ├── login.html
│   └── assets/
├── .env              # Environment variables
├── .gitignore
├── package.json
└── server.js         # Backend server entry
```

---

## 🚀 Setup Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/try)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VSMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/vehicle_service_db
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=24h
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   The backend server will start on `http://localhost:5000`.

### Frontend Setup

The frontend is built as a Single Page Application (SPA) with Vanilla JavaScript. No build tools are required.

1. **Open `index.html`** in your browser.
2. **Verify all links work** by navigating through the application.

---

## 🎮 Usage

### Quick Start

1. Open your browser and go to: `http://localhost:5000`
2. Register a new account or log in.
3. Select your role (Customer, Mechanic, Workshop, or Admin).
4. Explore the features based on your role.

### Common Tasks

**As a Customer**
- Navigate to **Vehicles** → **Add Vehicle** to register your car.
- Go to **Book Service** to schedule a service.
- Track your service progress in real-time.

**As a Mechanic**
- Check your dashboard for new job requests.
- Update job status from **In Progress** to **Completed**.

**As a Workshop**
- View all pending appointments.
- Create invoices for completed services.
- Manage inventory levels.

---

## 🗄️ Database

The application uses MongoDB with Mongoose for data management.

### Key Collections

- **users**: Stores all user information (customers, mechanics, workshops, admins)
  - Fields: `name`, `email`, `password`, `role`, `profile`

- **vehicles**: Stores vehicle information
  - Fields: `owner`, `plateNumber`, `make`, `model`, `year`, `vin`, `serviceHistory`

- **services**: Stores service request details
  - Fields: `customerId`, `vehicleId`, `serviceType`, `serviceDescription`, `status`, `appointmentDate`

- **appointments**: Manages appointment scheduling
  - Fields: `serviceId`, `mechanicId`, `workshopId`, `startTime`, `endTime`, `status`

- **invoices**: Stores billing information
  - Fields: `invoiceNumber`, `serviceId`, `amount`, `status`, `paymentDate`

- **inventory**: Manages workshop inventory
