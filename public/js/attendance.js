// Attendance Page JavaScript
let videoStream = null;
let isScanning = false;
let attendanceData = {
    type: 'time_in',
    date: '',
    session: 'morning',
    time: '',
    employeeId: ''
};

// DOM Elements
const scannerSection = document.getElementById('scannerSection');
const attendanceForm = document.getElementById('attendanceForm');
const fingerprintSection = document.getElementById('fingerprintSection');
const successSection = document.getElementById('successSection');
const errorSection = document.getElementById('errorSection');

const startScanBtn = document.getElementById('startScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrVideo = document.getElementById('qrVideo');
const qrCanvas = document.getElementById('qrCanvas');

const timeInBtn = document.getElementById('timeInBtn');
const timeOutBtn = document.getElementById('timeOutBtn');
const attendanceTypeInput = document.getElementById('attendanceType');
const attendanceDate = document.getElementById('attendanceDate');
const attendanceSession = document.getElementById('attendanceSession');
const currentTimeDisplay = document.getElementById('currentTime');
const employeeIdInput = document.getElementById('employeeId');

const proceedToFingerprintBtn = document.getElementById('proceedToFingerprint');
const scanFingerprintBtn = document.getElementById('scanFingerprintBtn');
const backToFormBtn = document.getElementById('backToForm');
const fingerprintStatus = document.getElementById('fingerprintStatus');
const fingerprintProgress = document.getElementById('fingerprintProgress');

const scanAgainBtn = document.getElementById('scanAgainBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');

// Initialize
function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    });

    attendanceDate.value = dateStr;
    currentTimeDisplay.value = timeStr;

    // Auto-detect session based on time
    const hour = now.getHours();
    if (hour >= 12) {
        attendanceSession.value = 'afternoon';
    } else {
        attendanceSession.value = 'morning';
    }
}

function setupEventListeners() {
    startScanBtn.addEventListener('click', startQRScan);
    stopScanBtn.addEventListener('click', stopQRScan);

    timeInBtn.addEventListener('click', () => setAttendanceType('time_in'));
    timeOutBtn.addEventListener('click', () => setAttendanceType('time_out'));

    proceedToFingerprintBtn.addEventListener('click', proceedToFingerprint);
    scanFingerprintBtn.addEventListener('click', scanFingerprint);
    backToFormBtn.addEventListener('click', showAttendanceForm);

    scanAgainBtn.addEventListener('click', resetToScanner);
    tryAgainBtn.addEventListener('click', resetToScanner);
}

function setAttendanceType(type) {
    attendanceData.type = type;
    attendanceTypeInput.value = type;

    timeInBtn.classList.toggle('active', type === 'time_in');
    timeOutBtn.classList.toggle('active', type === 'time_out');
}

// QR Code Scanning
async function startQRScan() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });

        videoStream = stream;
        qrVideo.srcObject = stream;
        qrVideo.play();

        startScanBtn.style.display = 'none';
        stopScanBtn.style.display = 'inline-flex';
        isScanning = true;

        scanQRCode();
    } catch (err) {
        showError('Cannot access camera. Please ensure camera permissions are granted.');
        console.error('Camera error:', err);
    }
}

function stopQRScan() {
    isScanning = false;

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    qrVideo.srcObject = null;
    startScanBtn.style.display = 'inline-flex';
    stopScanBtn.style.display = 'none';
}

function scanQRCode() {
    if (!isScanning) return;

    const canvas = qrCanvas;
    const context = canvas.getContext('2d');

    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
        canvas.width = qrVideo.videoWidth;
        canvas.height = qrVideo.videoHeight;
        context.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
        });

        if (code) {
            // QR Code detected
            stopQRScan();
            handleQRCodeDetected(code.data);
            return;
        }
    }

    requestAnimationFrame(scanQRCode);
}

function handleQRCodeDetected(qrData) {
    try {
        const data = JSON.parse(qrData);

        // Validate QR code contains our attendance URL
        if (data.url && data.url.includes(window.location.host)) {
            showAttendanceForm();
        } else {
            showError('Invalid QR Code. Please scan the correct attendance QR code.');
        }
    } catch (e) {
        // If not JSON, check if it's a URL
        if (qrData.includes(window.location.host) || qrData.includes('attendance')) {
            showAttendanceForm();
        } else {
            showError('Invalid QR Code format.');
        }
    }
}

// Form Handling
function showAttendanceForm() {
    scannerSection.style.display = 'none';
    attendanceForm.style.display = 'block';
    fingerprintSection.style.display = 'none';
    successSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function proceedToFingerprint() {
    const empId = employeeIdInput.value.trim();

    if (!empId) {
        alert('Please enter your Employee ID');
        return;
    }

    attendanceData.employeeId = empId;
    attendanceData.date = attendanceDate.value;
    attendanceData.session = attendanceSession.value;
    attendanceData.time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });

    attendanceForm.style.display = 'none';
    fingerprintSection.style.display = 'block';
}

// WebAuthn Fingerprint Authentication
async function scanFingerprint() {
    fingerprintStatus.textContent = 'Please verify your fingerprint...';
    fingerprintProgress.style.display = 'block';
    scanFingerprintBtn.disabled = true;

    try {
        // Check if running on HTTP - WebAuthn requires HTTPS
        if (window.location.protocol !== 'https:') {
            throw new Error('Fingerprint requires HTTPS. You are on HTTP (localhost).');
        }

        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            throw new Error('Fingerprint authentication is not supported on this device/browser.');
        }

        // First, get the employee's credential ID from server
        const employeeResponse = await fetch(`/api/employees/check?id=${attendanceData.employeeId}`);
        const employeeData = await employeeResponse.json();

        if (!employeeData.fingerprint_credential) {
            throw new Error('No fingerprint registered for this employee. Please contact admin.');
        }

        // Create authentication challenge
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialRequestOptions = {
            challenge: challenge,
            rpId: window.location.hostname,
            allowCredentials: [{
                id: base64UrlToBuffer(employeeData.fingerprint_credential),
                type: 'public-key',
                transports: ['internal']
            }],
            userVerification: 'required',
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        // If we get here, fingerprint was verified
        await submitAttendance();

    } catch (error) {
        console.error('Fingerprint error:', error);
        fingerprintStatus.textContent = error.message || 'Fingerprint verification failed';
        fingerprintProgress.style.display = 'none';
        scanFingerprintBtn.disabled = false;

        // If on HTTP, show option to proceed without fingerprint for testing
        if (window.location.protocol !== 'https:') {
            if (confirm('⚠️ Fingerprint requires HTTPS (secure connection).\n\n' +
                'You are on HTTP (localhost/testing).\n\n' +
                'Click OK to record attendance without fingerprint verification (for testing only).\n' +
                'For production, deploy to a HTTPS URL.')) {
                await submitAttendance();
            }
        } else {
            // On HTTPS but fingerprint failed - allow override for testing
            if (confirm('Fingerprint verification failed. Do you want to proceed anyway? (For testing only)')) {
                await submitAttendance();
            }
        }
    }
}

async function submitAttendance() {
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee_id: attendanceData.employeeId,
                date: attendanceData.date,
                session: attendanceData.session,
                time: attendanceData.time,
                type: attendanceData.type
            })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess();
        } else {
            showError(result.error || 'Failed to record attendance');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function showSuccess() {
    fingerprintSection.style.display = 'none';
    successSection.style.display = 'block';

    document.getElementById('successEmployeeId').textContent = attendanceData.employeeId;
    document.getElementById('successType').textContent = attendanceData.type === 'time_in' ? 'Time In' : 'Time Out';
    document.getElementById('successDate').textContent = attendanceData.date;
    document.getElementById('successTime').textContent = attendanceData.time;
    document.getElementById('successSession').textContent = attendanceData.session.charAt(0).toUpperCase() + attendanceData.session.slice(1);
}

function showError(message) {
    scannerSection.style.display = 'none';
    attendanceForm.style.display = 'none';
    fingerprintSection.style.display = 'none';
    successSection.style.display = 'none';
    errorSection.style.display = 'block';

    document.getElementById('errorMessage').textContent = message;
}

function resetToScanner() {
    stopQRScan();
    employeeIdInput.value = '';
    fingerprintStatus.textContent = 'Touch the fingerprint sensor to verify';
    fingerprintProgress.style.display = 'none';
    scanFingerprintBtn.disabled = false;

    scannerSection.style.display = 'block';
    attendanceForm.style.display = 'none';
    fingerprintSection.style.display = 'none';
    successSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Utility Functions
function bufferToBase64Url(buffer) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
    }
    return buffer;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
