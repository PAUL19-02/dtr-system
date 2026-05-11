const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Database setup - use absolute path or create directory
const fs = require('fs');

// Determine database directory (use /tmp for Render/cloud, local for development)
const dbDir = process.env.RENDER ? '/tmp' : path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'dtr.db');

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Admin table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Employees table
    db.run(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT,
        fingerprint_credential TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Attendance records table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        session TEXT NOT NULL,
        time_in TEXT,
        time_out TEXT,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )`);

    // Insert default admin if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
        ['admin', defaultPassword]);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.adminId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// ==================== ADMIN ROUTES ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        if (bcrypt.compareSync(password, admin.password)) {
            req.session.adminId = admin.id;
            req.session.username = admin.username;
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check auth status
app.get('/api/admin/check', (req, res) => {
    if (req.session.adminId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== EMPLOYEE ROUTES ====================

// Add new employee
app.post('/api/employees', requireAuth, (req, res) => {
    const { employee_id, full_name, department, fingerprint_credential } = req.body;

    db.run(
        'INSERT INTO employees (employee_id, full_name, department, fingerprint_credential) VALUES (?, ?, ?, ?)',
        [employee_id, full_name, department, fingerprint_credential || null],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Employee ID already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Get all employees
app.get('/api/employees', requireAuth, (req, res) => {
    db.all('SELECT * FROM employees ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get single employee
app.get('/api/employees/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Employee not found' });
        res.json(row);
    });
});

// Check employee by employee_id (for attendance verification - no auth required)
app.get('/api/employees/check', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Employee ID required' });

    db.get('SELECT employee_id, full_name, fingerprint_credential FROM employees WHERE employee_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Employee not found' });
        res.json(row);
    });
});

// Update employee fingerprint
app.put('/api/employees/:id/fingerprint', requireAuth, (req, res) => {
    const { fingerprint_credential } = req.body;

    db.run(
        'UPDATE employees SET fingerprint_credential = ? WHERE id = ?',
        [fingerprint_credential, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Delete employee
app.delete('/api/employees/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM employees WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==================== ATTENDANCE ROUTES ====================

// Record attendance (Time In/Out)
app.post('/api/attendance', (req, res) => {
    const { employee_id, date, session, time, type } = req.body;

    // Check if employee exists
    db.get('SELECT * FROM employees WHERE employee_id = ?', [employee_id], (err, employee) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // Check for existing record
        db.get(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND session = ?',
            [employee_id, date, session],
            (err, existing) => {
                if (err) return res.status(500).json({ error: err.message });

                if (existing) {
                    // Update existing record
                    if (type === 'time_in') {
                        db.run(
                            'UPDATE attendance SET time_in = ? WHERE id = ?',
                            [time, existing.id],
                            function(err) {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ success: true, message: 'Time in recorded' });
                            }
                        );
                    } else {
                        db.run(
                            'UPDATE attendance SET time_out = ? WHERE id = ?',
                            [time, existing.id],
                            function(err) {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ success: true, message: 'Time out recorded' });
                            }
                        );
                    }
                } else {
                    // Create new record
                    const timeIn = type === 'time_in' ? time : null;
                    const timeOut = type === 'time_out' ? time : null;

                    db.run(
                        'INSERT INTO attendance (employee_id, date, session, time_in, time_out, type) VALUES (?, ?, ?, ?, ?, ?)',
                        [employee_id, date, session, timeIn, timeOut, type],
                        function(err) {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ success: true, message: 'Attendance recorded' });
                        }
                    );
                }
            }
        );
    });
});

// Get attendance by employee
app.get('/api/attendance/employee/:employee_id', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC, session DESC',
        [req.params.employee_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Get all attendance records
app.get('/api/attendance', requireAuth, (req, res) => {
    const { start_date, end_date, employee_id } = req.query;
    let query = `
        SELECT a.*, e.full_name, e.department 
        FROM attendance a 
        JOIN employees e ON a.employee_id = e.employee_id 
        WHERE 1=1
    `;
    const params = [];

    if (start_date) {
        query += ' AND a.date >= ?';
        params.push(start_date);
    }
    if (end_date) {
        query += ' AND a.date <= ?';
        params.push(end_date);
    }
    if (employee_id) {
        query += ' AND a.employee_id = ?';
        params.push(employee_id);
    }

    query += ' ORDER BY a.date DESC, a.session DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==================== QR CODE ROUTES ====================

// Generate QR Code
app.get('/api/qrcode', async (req, res) => {
    try {
        const qrData = JSON.stringify({
            url: `${req.protocol}://${req.get('host')}/attendance.html`,
            timestamp: new Date().toISOString()
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        res.json({ qrCode: qrCodeDataUrl });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// ==================== WEBAUTHN ROUTES ====================

// WebAuthn challenge for registration
app.get('/api/webauthn/register-challenge', (req, res) => {
    const challenge = uuidv4();
    req.session.webauthnChallenge = challenge;
    res.json({ challenge });
});

// Verify and save credential
app.post('/api/webauthn/register', (req, res) => {
    const { credential, employee_id } = req.body;

    // In production, verify the credential properly
    // For demo, we store the credential ID
    const credentialId = credential.id;

    db.run(
        'UPDATE employees SET fingerprint_credential = ? WHERE employee_id = ?',
        [credentialId, employee_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 DTR Server running on http://localhost:${PORT}`);
    console.log(`📱 Employee QR Scanner: http://localhost:${PORT}/attendance.html`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin.html`);
});
