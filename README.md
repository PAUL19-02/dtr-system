# 📱 DTR System - Daily Time Record with QR Code & Fingerprint

A complete web-based Daily Time Record (DTR) system where employees scan a QR code using their phone to log attendance with fingerprint verification.

## Features

- **QR Code Scanning**: Employees scan a single QR code to access the attendance form
- **Automated Time & Date**: Time and date are auto-filled and cannot be modified
- **Session Detection**: Automatically detects Morning/Afternoon session
- **Fingerprint Verification**: Uses WebAuthn API for biometric authentication
- **Admin Dashboard**: Manage employees, view attendance, export PDF reports
- **Responsive Design**: Works on mobile phones and desktop

---

## 📋 Full Setup Tutorial (Beginner Level)

Follow these steps exactly to get your DTR system running.

### Step 1: Install Required Software

#### For Windows:
1. **Install Node.js** (JavaScript runtime)
   - Go to: https://nodejs.org
   - Download the **LTS** version (recommended for most users)
   - Run the installer and click "Next" until finished
   - Verify installation: Open Command Prompt and type:
     ```
     node --version
     npm --version
     ```
   - You should see version numbers (e.g., v18.x.x)

2. **Install a Code Editor** (optional but recommended)
   - Download VS Code: https://code.visualstudio.com
   - Install it with default settings

3. **Install Git** (for downloading code)
   - Go to: https://git-scm.com/download/win
   - Download and install with default settings

#### For Mac:
1. **Install Homebrew** (package manager)
   - Open Terminal and paste:
     ```bash
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     ```

2. **Install Node.js**
   - In Terminal, type:
     ```bash
     brew install node
     ```
   - Verify:
     ```bash
     node --version
     npm --version
     ```

3. **Install VS Code** (optional)
   - Download from: https://code.visualstudio.com
   - Or use: `brew install --cask visual-studio-code`

---

### Step 2: Download the Project

#### Option A: Using Git (Recommended)
1. Open your terminal/command prompt
2. Navigate to where you want the project:
   ```bash
   cd Documents
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dtr-system.git
   cd dtr-system
   ```

#### Option B: Manual Download
1. Download the ZIP file from the repository
2. Extract it to your Documents folder
3. Rename the folder to "dtr-system"

---

### Step 3: Install Dependencies

1. Open terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd dtr-system
   ```
   (Replace with your actual path, e.g., `cd Documents/dtr-system`)

3. Install required packages:
   ```bash
   npm install
   ```
   - This will download all dependencies listed in package.json
   - Wait for it to complete (you'll see a node_modules folder created)

---

### Step 4: Start the Server

1. In the terminal (inside dtr-system folder), run:
   ```bash
   npm start
   ```
   OR for development (auto-restarts on changes):
   ```bash
   npm run dev
   ```

2. You should see:
   ```
   🚀 DTR Server running on http://localhost:3000
   📱 Employee QR Scanner: http://localhost:3000/attendance.html
   🔐 Admin Panel: http://localhost:3000/admin.html
   ```

3. Keep this terminal window open! Closing it stops the server.

---

### Step 5: Access the System

#### On Your Computer:
- **Admin Panel**: Open browser and go to `http://localhost:3000/admin.html`
- **QR Scanner**: Open browser and go to `http://localhost:3000/attendance.html`

#### On Employee Phones (Same WiFi Network):
1. Find your computer's IP address:
   - **Windows**: Open Command Prompt, type `ipconfig`, look for "IPv4 Address"
   - **Mac**: Open Terminal, type `ifconfig | grep inet`, look for your WiFi IP

2. On the phone browser, type:
   ```
   http://YOUR_IP_ADDRESS:3000/attendance.html
   ```
   Example: `http://192.168.1.5:3000/attendance.html`

---

### Step 6: First Time Setup (Admin)

1. Go to `http://localhost:3000/admin.html`
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. **Change the password immediately** for security:
   - (You'll need to modify the database or create a new admin user)

---

### Step 7: Add Employees

1. In Admin Panel, click "Employee Management"
2. Click "+ Add Employee"
3. Fill in:
   - **Employee ID**: Unique ID (e.g., EMP001)
   - **Full Name**: Employee's complete name
   - **Department**: Their department (optional)
4. Click "Register Fingerprint" to enroll their biometric
   - Employee must use a device with fingerprint sensor
   - Touch the sensor when prompted
5. Click "Save Employee"

---

### Step 8: Generate QR Code

1. In Admin Panel, click "QR Code"
2. The QR code is automatically generated
3. Click "Download" to save it
4. **Print and post it** where employees can scan it

---

### Step 9: Employee Usage (Daily)

1. Employee opens phone camera
2. Scans the QR code
3. Automatically opens the attendance form
4. Form shows:
   - Current time (locked)
   - Current date (locked)
   - Session (Morning/Afternoon - auto-detected)
5. Employee enters their Employee ID
6. Clicks "Proceed to Fingerprint"
7. Touches fingerprint sensor to verify
8. Attendance is recorded!

---

### Step 10: View & Export Reports

1. In Admin Panel, click "Attendance Records"
2. Use filters:
   - Date range
   - Specific employee
3. View the table with all records
4. Click "Export PDF" to download the report

---

## 📁 Project Structure

```
dtr-system/
├── server.js              # Main server file
├── package.json           # Dependencies list
├── database/
│   └── dtr.db            # SQLite database (auto-created)
├── public/
│   ├── attendance.html    # Employee QR scanner page
│   ├── admin.html         # Admin dashboard
│   ├── css/
│   │   └── style.css      # All styles
│   └── js/
│       ├── attendance.js  # Employee page logic
│       └── admin.js       # Admin page logic
```

---

## 🔧 Troubleshooting

### "Cannot access camera" Error
- Make sure you're using HTTPS or localhost (browsers block camera on HTTP)
- Grant camera permissions when prompted
- Use Chrome, Firefox, or Safari (latest versions)

### "Fingerprint not supported"
- WebAuthn requires:
  - Android with fingerprint sensor + Chrome
  - iPhone with Face ID/Touch ID + Safari
  - Windows Hello on Windows 10/11
- For testing without hardware, the system allows bypass after prompt

### Server won't start
- Check if port 3000 is already in use
- Try: `PORT=3001 npm start`
- Make sure Node.js is properly installed

### Can't access from phone
- Ensure phone and computer are on the **same WiFi network**
- Check Windows Firewall / Mac Security settings
- Try disabling firewall temporarily for testing

---

## 🚀 Publishing (Making It Accessible Online)

To make this available outside your local network, you have several options:

### Option 1: Deploy to Render.com (Free)
1. Go to https://render.com and sign up
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy!

### Option 2: Deploy to Railway.app (Free)
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Add environment variables if needed
4. Deploy automatically

### Option 3: Use Ngrok (Temporary testing)
1. Install ngrok: `npm install -g ngrok`
2. Start your server: `npm start`
3. In new terminal: `ngrok http 3000`
4. Use the HTTPS URL provided (valid for 2 hours on free plan)

---

## 🔒 Security Notes

- **Change default admin password** immediately
- Use HTTPS in production (required for WebAuthn/fingerprint)
- The database file (dtr.db) contains all data - back it up regularly
- Consider adding rate limiting for production use
- Add session timeout for admin panel

---

## 📱 Mobile Browser Compatibility

| Feature | Chrome (Android) | Safari (iOS) | Chrome (iOS) |
|---------|-------------------|--------------|--------------|
| QR Scan | ✅ | ✅ | ✅ |
| WebAuthn/Fingerprint | ✅ | ✅ (Face ID) | ❌ |
| Camera Access | ✅ | ✅ | ✅ |

---

## 🛠️ Customization

### Change Port
Edit `server.js`:
```javascript
const PORT = process.env.PORT || 3000;  // Change 3000 to your preferred port
```

### Change Admin Password
1. Stop the server
2. Delete `database/dtr.db`
3. Edit `server.js` - find `defaultPassword` and change `admin123`
4. Restart server

### Add More Fields
Edit the forms in `attendance.html` and update the database schema in `server.js`

---

## 📞 Support

If you encounter issues:
1. Check the browser console (F12 → Console tab) for errors
2. Check the terminal where the server is running for server errors
3. Ensure all files are in the correct locations
4. Verify Node.js version is 14 or higher

---

## 📄 License

MIT License - Free to use and modify for your organization.
