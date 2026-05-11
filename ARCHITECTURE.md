# DTR System Architecture & Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DTR SYSTEM FLOW                         │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   QR CODE    │
                    │   (Printed)  │
                    └──────┬───────┘
                           │ Scan
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              EMPLOYEE PHONE (Browser)                        │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Camera     │───▶│ Attendance   │───▶│ Fingerprint  │  │
│  │  (QR Scan)  │    │ Form         │    │ Verification │  │
│  └─────────────┘    └──────────────┘    └──────────────┘  │
│                           │                      │        │
│                           ▼                      ▼        │
│                    ┌──────────────┐    ┌──────────────┐  │
│                    │ Auto-filled:   │    │ WebAuthn API │  │
│                    │ - Time         │    │ - Touch ID   │  │
│                    │ - Date         │    │ - Face ID    │  │
│                    │ - Session      │    │ - Android FP │  │
│                    │ - Employee ID  │    └──────────────┘  │
│                    └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Submit
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Express     │    │  SQLite DB   │    │  Session     │  │
│  │  API Routes  │◀──▶│  - Employees │    │  Management  │  │
│  │              │    │  - Attendance│    │              │  │
│  └──────────────┘    │  - Admins    │    └──────────────┘  │
│                      └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN PANEL (Web Browser)                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Dashboard   │    │  Employee    │    │  Attendance  │  │
│  │  - Stats     │    │  Management  │    │  Records     │  │
│  │  - Overview  │    │  - Add/Edit  │    │  - Filter    │  │
│  └──────────────┘    │  - Register  │    │  - Export    │  │
│                      │    FP        │    │    PDF       │  │
│                      └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Employee Time-In Flow
```
Employee Arrives ──▶ Scans QR Code ──▶ Form Opens
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Auto-populated: │
                                    │ • Time: 08:30 AM│
                                    │ • Date: Today   │
                                    │ • Session: AM   │
                                    └─────────────────┘
                                              │
                                              ▼
                                    Employee enters ID
                                              │
                                              ▼
                                    Fingerprint Scan
                                              │
                                              ▼
                                    Server validates & stores
                                              │
                                              ▼
                                    ✅ Attendance Recorded
```

### 2. Admin Flow
```
Admin Login ──▶ Dashboard ──▶ Choose Action
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Add Employee    View Records    Generate QR
                    │               │               │
                    ▼               ▼               ▼
              Register FP     Filter/Search    Download
                    │               │               │
                    ▼               ▼               ▼
              Save to DB      Export PDF      Print/Display
```

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     admins      │     │    employees    │     │   attendance    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ username        │     │ employee_id     │◀────│ employee_id (FK)│
│ password (hash) │     │ full_name       │     │ date            │
│ created_at      │     │ department      │     │ session         │
└─────────────────┘     │ fingerprint_cred│     │ time_in         │
                      │ created_at      │     │ time_out        │
                      └─────────────────┘     │ type            │
                                              │ created_at      │
                                              └─────────────────┘
```

## API Endpoints

### Authentication
```
POST /api/admin/login     ──▶ Admin login
POST /api/admin/logout    ──▶ Admin logout
GET  /api/admin/check     ──▶ Check auth status
```

### Employees
```
POST   /api/employees              ──▶ Add employee
GET    /api/employees              ──▶ List all employees
GET    /api/employees/:id          ──▶ Get employee details
PUT    /api/employees/:id/fingerprint ──▶ Update fingerprint
DELETE /api/employees/:id          ──▶ Delete employee
```

### Attendance
```
POST /api/attendance               ──▶ Record attendance
GET  /api/attendance               ──▶ Get all records (with filters)
GET  /api/attendance/employee/:id  ──▶ Get employee's records
```

### QR Code
```
GET /api/qrcode                    ──▶ Generate QR code
```

## File Structure

```
dtr-system/
│
├── 📄 server.js              # Main server & API routes
├── 📄 package.json           # Dependencies
├── 📄 README.md              # Setup tutorial
├── 📄 DEPLOYMENT.md          # Deployment guide
│
├── 📁 database/
│   └── 🗄️ dtr.db            # SQLite database (auto-created)
│
├── 📁 public/                # Static files served to browsers
│   ├── 📄 attendance.html    # Employee QR scanner page
│   ├── 📄 admin.html         # Admin dashboard
│   │
│   ├── 📁 css/
│   │   └── 🎨 style.css      # All styles & responsive design
│   │
│   └── 📁 js/
│       ├── ⚙️ attendance.js   # QR scanning & fingerprint logic
│       └── ⚙️ admin.js        # Admin panel functionality
│
├── 📄 start.bat              # Quick start (Windows)
└── 📄 start.sh               # Quick start (Mac/Linux)
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | Node.js + Express | Server & API |
| **Database** | SQLite3 | Data storage |
| **Auth** | bcryptjs + express-session | Password hashing & sessions |
| **QR Code** | jsQR + qrcode | Scanning & generation |
| **Biometric** | WebAuthn API | Fingerprint authentication |
| **PDF Export** | jsPDF + jspdf-autotable | Report generation |
| **Frontend** | Vanilla HTML/CSS/JS | No framework needed |

## Security Features

1. **Password Hashing**: bcryptjs with salt rounds
2. **Session Management**: Encrypted server-side sessions
3. **Input Validation**: Server-side validation on all inputs
4. **CSRF Protection**: Can be added with csurf middleware
5. **Rate Limiting**: Recommended for production
6. **HTTPS Required**: For WebAuthn fingerprint to work

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| QR Scan | ✅ | ✅ | ✅ | ✅ |
| WebAuthn | ✅ | ✅ | ✅ | ✅ |
| Camera API | ✅ | ✅ | ✅ | ✅ |
| LocalStorage | ✅ | ✅ | ✅ | ✅ |
