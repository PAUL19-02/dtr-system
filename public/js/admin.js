// Admin Panel JavaScript
let currentAdmin = null;
let employees = [];
let attendanceRecords = [];
let selectedEmployee = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const adminInterface = document.getElementById('adminInterface');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const addEmployeeForm = document.getElementById('addEmployeeForm');
const employeeForm = document.getElementById('employeeForm');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const registerFingerprintBtn = document.getElementById('registerFingerprintBtn');
const fingerprintStatus = document.getElementById('fingerprintStatus');
const fingerprintCredential = document.getElementById('fingerprintCredential');

const employeesTableBody = document.getElementById('employeesTableBody');
const attendanceTableBody = document.getElementById('attendanceTableBody');

const filterStartDate = document.getElementById('filterStartDate');
const filterEndDate = document.getElementById('filterEndDate');
const filterEmployee = document.getElementById('filterEmployee');
const filterBtn = document.getElementById('filterBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

const qrCodeImg = document.getElementById('qrCodeImg');
const refreshQrBtn = document.getElementById('refreshQrBtn');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const qrUrl = document.getElementById('qrUrl');

const employeeModal = document.getElementById('employeeModal');

// Initialize
async function init() {
    setupEventListeners();
    await checkAuth();
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
        });
    });

    addEmployeeBtn.addEventListener('click', () => {
        addEmployeeForm.style.display = 'block';
    });

    cancelAddBtn.addEventListener('click', () => {
        addEmployeeForm.style.display = 'none';
        resetEmployeeForm();
    });

    employeeForm.addEventListener('submit', handleAddEmployee);
    registerFingerprintBtn.addEventListener('click', registerFingerprint);

    filterBtn.addEventListener('click', loadAttendanceRecords);
    exportPdfBtn.addEventListener('click', exportToPDF);

    refreshQrBtn.addEventListener('click', generateQRCode);
    downloadQrBtn.addEventListener('click', downloadQRCode);
}

// Authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();

        if (data.authenticated) {
            currentAdmin = data;
            showAdminInterface();
        } else {
            showLoginModal();
        }
    } catch (error) {
        showLoginModal();
    }
}

function showLoginModal() {
    loginModal.classList.add('active');
    adminInterface.style.display = 'none';
}

function showAdminInterface() {
    loginModal.classList.remove('active');
    adminInterface.style.display = 'block';
    document.getElementById('adminName').textContent = currentAdmin.username || 'Admin';

    loadDashboard();
    loadEmployees();
    generateQRCode();
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentAdmin = data;
            showAdminInterface();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login error. Please try again.');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        currentAdmin = null;
        showLoginModal();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Navigation
function showSection(sectionName) {
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionName);
    });

    contentSections.forEach(section => {
        section.classList.toggle('active', section.id === sectionName + 'Section');
    });

    if (sectionName === 'attendance') {
        loadAttendanceRecords();
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const [employeesRes, attendanceRes] = await Promise.all([
            fetch('/api/employees'),
            fetch('/api/attendance')
        ]);

        const employees = await employeesRes.json();
        const attendance = await attendanceRes.json();

        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendance.filter(r => r.date === today);

        document.getElementById('totalEmployees').textContent = employees.length;
        document.getElementById('todayAttendance').textContent = todayRecords.length;
        document.getElementById('presentToday').textContent = new Set(todayRecords.map(r => r.employee_id)).size;
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// Employee Management
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        employees = await response.json();

        renderEmployeesTable();
        updateEmployeeFilter();
    } catch (error) {
        console.error('Load employees error:', error);
    }
}

function renderEmployeesTable() {
    employeesTableBody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.employee_id}</td>
            <td>${emp.full_name}</td>
            <td>${emp.department || '-'}</td>
            <td>${emp.fingerprint_credential ? '✅ Registered' : '❌ Not Registered'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewEmployee(${emp.id})">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateEmployeeFilter() {
    filterEmployee.innerHTML = '<option value="">All Employees</option>' +
        employees.map(emp => `<option value="${emp.employee_id}">${emp.full_name} (${emp.employee_id})</option>`).join('');
}

async function handleAddEmployee(e) {
    e.preventDefault();

    const employeeData = {
        employee_id: document.getElementById('newEmployeeId').value,
        full_name: document.getElementById('newEmployeeName').value,
        department: document.getElementById('newEmployeeDept').value,
        fingerprint_credential: fingerprintCredential.value || null
    };

    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Employee added successfully!');
            addEmployeeForm.style.display = 'none';
            resetEmployeeForm();
            loadEmployees();
        } else {
            alert(result.error || 'Failed to add employee');
        }
    } catch (error) {
        alert('Error adding employee');
    }
}

async function registerFingerprint() {
    const empId = document.getElementById('newEmployeeId').value;

    if (!empId) {
        alert('Please enter Employee ID first');
        return;
    }

    // Check if running on HTTP (not HTTPS) - WebAuthn requires HTTPS
    if (window.location.protocol !== 'https:') {
        const useAnyway = confirm(
            '⚠️ Fingerprint registration requires HTTPS (secure connection).\n\n' +
            'You are currently on HTTP (localhost). Options:\n\n' +
            '1. Click OK to skip fingerprint for now (you can add it later after deploying to HTTPS)\n' +
            '2. Click Cancel to setup HTTPS first\n\n' +
            'You can still save the employee without fingerprint.'
        );
        if (!useAnyway) return;
        fingerprintStatus.textContent = '⏭️ Skipped - will register after HTTPS deployment';
        fingerprintStatus.style.color = '#f59e0b';
        return;
    }

    try {
        if (!window.PublicKeyCredential) {
            alert('Fingerprint registration is not supported on this device/browser');
            return;
        }

        fingerprintStatus.textContent = 'Please touch the fingerprint sensor...';

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialCreationOptions = {
            challenge: challenge,
            rp: {
                name: 'DTR System',
                id: window.location.hostname
            },
            user: {
                id: new TextEncoder().encode(empId),
                name: empId,
                displayName: document.getElementById('newEmployeeName').value || empId
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },
                { type: 'public-key', alg: -257 }
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'preferred'
            },
            timeout: 60000
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions
        });

        fingerprintCredential.value = credential.id;
        fingerprintStatus.textContent = '✅ Fingerprint registered successfully!';
        fingerprintStatus.style.color = '#10b981';

    } catch (error) {
        console.error('Fingerprint registration error:', error);
        fingerprintStatus.textContent = '❌ Registration failed: ' + error.message;
        fingerprintStatus.style.color = '#ef4444';
    }
}

async function viewEmployee(id) {
    try {
        const response = await fetch(`/api/employees/${id}`);
        const employee = await response.json();

        document.getElementById('modalEmployeeName').textContent = employee.full_name;
        document.getElementById('modalEmployeeId').textContent = employee.employee_id;
        document.getElementById('modalEmployeeDept').textContent = employee.department || '-';

        // Load attendance for this employee
        const attendanceRes = await fetch(`/api/attendance/employee/${employee.employee_id}`);
        const records = await attendanceRes.json();

        // Store records for PDF export
        window.currentEmployeeRecords = records;
        window.currentEmployeeData = employee;

        const tbody = document.getElementById('modalAttendanceBody');
        tbody.innerHTML = records.map(record => {
            const timeIn = record.time_in || '-';
            const timeOut = record.time_out || '-';
            let duration = '-';

            if (record.time_in && record.time_out) {
                // Parse time strings (handle both 12-hour and 24-hour formats)
                const parseTime = (timeStr) => {
                    // Remove AM/PM and convert to 24-hour format
                    const clean = timeStr.trim();
                    const hasPM = clean.toLowerCase().includes('pm');
                    const hasAM = clean.toLowerCase().includes('am');
                    let [hours, minutes, seconds] = clean.replace(/\s?[AaPp][Mm]/, '').split(':').map(Number);

                    if (hasPM && hours !== 12) hours += 12;
                    if (hasAM && hours === 12) hours = 0;

                    return { hours, minutes, seconds: seconds || 0 };
                };

                const start = parseTime(record.time_in);
                const end = parseTime(record.time_out);

                const startMinutes = start.hours * 60 + start.minutes + start.seconds / 60;
                const endMinutes = end.hours * 60 + end.minutes + end.seconds / 60;

                const diffMinutes = endMinutes - startMinutes;
                const diffHours = diffMinutes / 60;

                if (diffHours >= 0) {
                    duration = diffHours.toFixed(2) + ' hrs';
                } else {
                    duration = 'Invalid';
                }
            }

            return `
                <tr>
                    <td>${record.date}</td>
                    <td>${record.session}</td>
                    <td>${timeIn}</td>
                    <td>${timeOut}</td>
                    <td>${duration}</td>
                </tr>
            `;
        }).join('');

        employeeModal.classList.add('active');
    } catch (error) {
        console.error('View employee error:', error);
    }
}

// Export individual employee DTR to PDF
function exportEmployeePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const employee = window.currentEmployeeData;
    const records = window.currentEmployeeRecords;

    if (!employee || !records || records.length === 0) {
        alert('No attendance records to export');
        return;
    }

    // Title
    doc.setFontSize(20);
    doc.text('Employee DTR Report', 14, 20);

    // Employee Info
    doc.setFontSize(12);
    doc.text(`Employee: ${employee.full_name}`, 14, 35);
    doc.text(`ID: ${employee.employee_id}`, 14, 42);
    doc.text(`Department: ${employee.department || '-'}`, 14, 49);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 56);

    // Table data
    const tableData = records.map(record => {
        const timeIn = record.time_in || '-';
        const timeOut = record.time_out || '-';
        let duration = '-';

        if (record.time_in && record.time_out) {
            const parseTime = (timeStr) => {
                const clean = timeStr.trim();
                const hasPM = clean.toLowerCase().includes('pm');
                const hasAM = clean.toLowerCase().includes('am');
                let [hours, minutes, seconds] = clean.replace(/\s?[AaPp][Mm]/, '').split(':').map(Number);

                if (hasPM && hours !== 12) hours += 12;
                if (hasAM && hours === 12) hours = 0;

                return { hours, minutes, seconds: seconds || 0 };
            };

            const start = parseTime(record.time_in);
            const end = parseTime(record.time_out);

            const startMinutes = start.hours * 60 + start.minutes + start.seconds / 60;
            const endMinutes = end.hours * 60 + end.minutes + end.seconds / 60;

            const diffHours = (endMinutes - startMinutes) / 60;
            duration = diffHours >= 0 ? diffHours.toFixed(2) + ' hrs' : 'Invalid';
        }

        const status = record.time_in && record.time_out ? 'Complete' : 
                      record.time_in ? 'Time In Only' : 'Time Out Only';

        return [
            record.date,
            record.session,
            timeIn,
            timeOut,
            duration,
            status
        ];
    });

    // Calculate total hours
    let totalHours = 0;
    records.forEach(record => {
        if (record.time_in && record.time_out) {
            const parseTime = (timeStr) => {
                const clean = timeStr.trim();
                const hasPM = clean.toLowerCase().includes('pm');
                const hasAM = clean.toLowerCase().includes('am');
                let [hours, minutes, seconds] = clean.replace(/\s?[AaPp][Mm]/, '').split(':').map(Number);
                if (hasPM && hours !== 12) hours += 12;
                if (hasAM && hours === 12) hours = 0;
                return { hours, minutes, seconds: seconds || 0 };
            };
            const start = parseTime(record.time_in);
            const end = parseTime(record.time_out);
            const diffHours = ((end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes)) / 60;
            if (diffHours >= 0) totalHours += diffHours;
        }
    });

    // Add table
    doc.autoTable({
        head: [['Date', 'Session', 'Time In', 'Time Out', 'Duration', 'Status']],
        body: tableData,
        startY: 65,
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        styles: {
            fontSize: 10,
            cellPadding: 3
        }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Records: ${records.length}`, 14, finalY);
    doc.text(`Total Hours: ${totalHours.toFixed(2)} hrs`, 14, finalY + 7);

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('This is a computer-generated DTR report.', 14, finalY + 20);

    // Save
    const filename = `DTR-${employee.employee_id}-${employee.full_name.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
}

function closeEmployeeModal() {
    employeeModal.classList.remove('active');
}

async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadEmployees();
        } else {
            alert('Failed to delete employee');
        }
    } catch (error) {
        alert('Error deleting employee');
    }
}

function resetEmployeeForm() {
    document.getElementById('newEmployeeId').value = '';
    document.getElementById('newEmployeeName').value = '';
    document.getElementById('newEmployeeDept').value = '';
    fingerprintCredential.value = '';
    fingerprintStatus.textContent = 'Not registered';
    fingerprintStatus.style.color = '#6b7280';
}

// Attendance Records
async function loadAttendanceRecords() {
    try {
        const params = new URLSearchParams();
        if (filterStartDate.value) params.append('start_date', filterStartDate.value);
        if (filterEndDate.value) params.append('end_date', filterEndDate.value);
        if (filterEmployee.value) params.append('employee_id', filterEmployee.value);

        const response = await fetch(`/api/attendance?${params}`);
        attendanceRecords = await response.json();

        renderAttendanceTable();
    } catch (error) {
        console.error('Load attendance error:', error);
    }
}

function renderAttendanceTable() {
    attendanceTableBody.innerHTML = attendanceRecords.map(record => {
        const status = record.time_in && record.time_out ? 'Complete' : 
                      record.time_in ? 'Time In Only' : 'Time Out Only';
        const statusClass = status === 'Complete' ? 'text-success' : 'text-warning';

        return `
            <tr>
                <td>${record.date}</td>
                <td>${record.employee_id}</td>
                <td>${record.full_name || '-'}</td>
                <td>${record.department || '-'}</td>
                <td>${record.session}</td>
                <td>${record.time_in || '-'}</td>
                <td>${record.time_out || '-'}</td>
                <td class="${statusClass}">${status}</td>
            </tr>
        `;
    }).join('');
}

// QR Code
async function generateQRCode() {
    try {
        const response = await fetch('/api/qrcode');
        const data = await response.json();

        qrCodeImg.src = data.qrCode;
        qrUrl.textContent = `${window.location.origin}/attendance.html`;
    } catch (error) {
        console.error('QR Code error:', error);
    }
}

function downloadQRCode() {
    const link = document.createElement('a');
    link.download = 'dtr-qr-code.png';
    link.href = qrCodeImg.src;
    link.click();
}

// PDF Export
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    // Title
    doc.setFontSize(18);
    doc.text('Daily Time Record - Attendance Report', 14, 20);

    // Date range
    doc.setFontSize(12);
    const dateRange = filterStartDate.value && filterEndDate.value 
        ? `Period: ${filterStartDate.value} to ${filterEndDate.value}`
        : `Generated: ${new Date().toLocaleDateString()}`;
    doc.text(dateRange, 14, 30);

    // Table
    const tableData = attendanceRecords.map(record => [
        record.date,
        record.employee_id,
        record.full_name || '-',
        record.department || '-',
        record.session,
        record.time_in || '-',
        record.time_out || '-',
        record.time_in && record.time_out ? 'Complete' : 'Incomplete'
    ]);

    doc.autoTable({
        head: [['Date', 'Employee ID', 'Name', 'Department', 'Session', 'Time In', 'Time Out', 'Status']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        styles: {
            fontSize: 10,
            cellPadding: 3
        }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save('attendance-report.pdf');
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
