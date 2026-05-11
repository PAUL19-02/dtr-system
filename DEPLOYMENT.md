# 🚀 Deployment Guide - Make Your DTR System Accessible Online

## Option 1: Deploy to Render.com (Recommended - Free)

### Step 1: Prepare Your Code
1. Make sure all your files are in a Git repository
2. Create an account at https://render.com
3. Click "New" → "Web Service"

### Step 2: Connect Repository
1. Connect your GitHub/GitLab repository
2. Select the dtr-system repository

### Step 3: Configure Service
- **Name**: dtr-system
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### Step 4: Environment Variables (Optional)
- Add `NODE_ENV=production`
- Add `SESSION_SECRET=your-random-secret-key-here`

### Step 5: Deploy
Click "Create Web Service"
- Render will build and deploy automatically
- You'll get a URL like: `https://dtr-system.onrender.com`

### Step 6: Access Your App
- **Admin Panel**: `https://dtr-system.onrender.com/admin.html`
- **QR Scanner**: `https://dtr-system.onrender.com/attendance.html`

---

## Option 2: Deploy to Railway.app (Free)

### Step 1: Sign Up
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Create Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your dtr-system repository

### Step 3: Deploy
Railway automatically detects Node.js and deploys
- Add environment variables if needed
- Deploys automatically on every git push

---

## Option 3: Use Ngrok (Quick Testing)

### For Temporary Public URL (2 hours free):

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Start your local server:
   ```bash
   npm start
   ```

3. In a new terminal:
   ```bash
   ngrok http 3000
   ```

4. You'll get a URL like:
   ```
   https://abc123.ngrok.io
   ```

5. Access:
   - Admin: `https://abc123.ngrok.io/admin.html`
   - QR Scanner: `https://abc123.ngrok.io/attendance.html`

---

## Option 4: Deploy to VPS (DigitalOcean, Linode, etc.)

### Using PM2 Process Manager:

1. **On your server**, install Node.js and PM2:
   ```bash
   npm install -g pm2
   ```

2. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/dtr-system.git
   cd dtr-system
   npm install
   ```

3. **Start with PM2**:
   ```bash
   pm2 start server.js --name dtr-system
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx** (reverse proxy):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Get SSL with Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## 🔐 Important Security Steps for Production

### 1. Change Default Admin Password
Before deploying, change the default password in `server.js`:
```javascript
const defaultPassword = bcrypt.hashSync('your-new-secure-password', 10);
```

### 2. Set Environment Variables
Create a `.env` file (don't commit this!):
```
SESSION_SECRET=your-very-long-random-string-here
NODE_ENV=production
PORT=3000
```

### 3. Update Server for Production
Modify `server.js` session configuration:
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,  // true in production (HTTPS)
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'strict'
    }
}));
```

### 4. Add Rate Limiting
Install and configure rate limiting:
```bash
npm install express-rate-limit
```

Add to server.js:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5. Enable CORS Properly
```javascript
const cors = require('cors');
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
}));
```

---

## 📱 Setting Up for Real-World Use

### Print the QR Code
1. Go to Admin Panel → QR Code
2. Download the QR code image
3. Print it on paper or display on a tablet
4. Post it at your office entrance/exit

### Employee Onboarding Process
1. Admin adds employee in the system
2. Employee visits admin with their phone
3. Admin registers fingerprint on employee's device
4. Employee can now scan QR code daily

### Backup Database
The SQLite database is at `database/dtr.db`:
- Back up regularly by copying this file
- Or set up automated backups to cloud storage

---

## 🌐 Domain Setup (Custom Domain)

### If using Render/Railway:
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. Add custom domain in your hosting dashboard
3. Update DNS records (A record or CNAME)
4. Wait for SSL certificate to be issued

### Example with Cloudflare:
1. Add your domain to Cloudflare
2. Update nameservers
3. Add A record pointing to your server IP
4. Enable "Always Use HTTPS"
5. Set SSL/TLS to "Full (strict)"

---

## ✅ Post-Deployment Checklist

- [ ] Changed default admin password
- [ ] Set strong SESSION_SECRET
- [ ] Enabled HTTPS
- [ ] Tested QR code scanning from employee phones
- [ ] Tested fingerprint registration on actual devices
- [ ] Set up database backups
- [ ] Tested PDF export feature
- [ ] Added company logo/branding (optional)
- [ ] Tested on both Android and iOS devices
- [ ] Documented the employee onboarding process

---

## 🆘 Common Deployment Issues

### "Cannot register fingerprint" on mobile
- **Cause**: WebAuthn requires HTTPS (not HTTP)
- **Fix**: Ensure your deployed URL uses `https://`

### "Camera not working" on iPhone
- **Cause**: iOS Safari requires user gesture for camera
- **Fix**: Make sure employees tap the "Start Scanning" button

### Database locked error
- **Cause**: SQLite doesn't handle concurrent writes well
- **Fix**: For high traffic, consider upgrading to PostgreSQL

### Server crashes randomly
- **Cause**: Node.js process stopped
- **Fix**: Use PM2 or similar process manager to auto-restart

---

## 📊 Scaling Up (For Larger Organizations)

### When you outgrow SQLite:
1. Install PostgreSQL or MySQL
2. Update `server.js` to use a different database driver
3. Migrate existing data

### Load Balancing:
- Use multiple server instances behind a load balancer
- Store sessions in Redis instead of memory

### Enhanced Features to Add:
- Email notifications for missed attendance
- Integration with payroll systems
- Geolocation verification (ensure employee is at office)
- Photo capture during attendance
- Multiple admin roles (super admin, department admin)
