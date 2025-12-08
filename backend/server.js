const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { initDB, Setting, Site, User, SiteAuthUser, GlobalAuthUser, SiteAuthGrant } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;
const SITES_DIR = process.env.SITES_DIR || '/var/www/sites';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';
const AUTH_SECRET = process.env.AUTH_SECRET || 'change-me';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'sp_auth';
const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === 'true';
const SITE_AUTH_SECRET = process.env.SITE_AUTH_SECRET || 'site-auth-secret';
const SITE_AUTH_COOKIE_NAME = process.env.SITE_AUTH_COOKIE_NAME || 'site_auth';
const SITE_AUTH_COOKIE_SECURE = process.env.SITE_AUTH_COOKIE_SECURE === 'true';
const normalizeHost = (rawHost) => (rawHost || '').split(':')[0];

// Ensure sites dir exists
if (!fs.existsSync(SITES_DIR)) {
    fs.mkdirSync(SITES_DIR, { recursive: true });
}

// Middleware
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // same-origin or curl
        if (CORS_ORIGINS.includes('*')) return callback(null, true);
        if (CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve Static Frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendDist, 'index.html'));
        }
    });
}

// Auth Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.split(' ')[1] === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const upload = multer({ dest: '/tmp/uploads/' });

const isValidHostname = (host) => {
    const regex = /^[a-zA-Z0-9.-]+$/;
    return regex.test(host) && !host.includes('..');
};

// --- Cookie-based login helpers (multi-user) ---
const authCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: AUTH_COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const issueToken = (user) => jwt.sign(
    { sub: user.id, username: user.username },
    AUTH_SECRET,
    { expiresIn: '7d' }
);

const verifyAuthCookie = async (req) => {
    if (!AUTH_ENABLED) return { ok: true, user: null };
    const token = req.cookies[AUTH_COOKIE_NAME];
    if (!token) return { ok: false };
    try {
        const payload = jwt.verify(token, AUTH_SECRET);
        const user = await User.findByPk(payload.sub);
        if (!user) return { ok: false };
        return { ok: true, user };
    } catch (err) {
        return { ok: false };
    }
};

// Site auth cookies (per host)
const siteAuthCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: SITE_AUTH_COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const issueSiteToken = (host, username) => jwt.sign(
    { host, username },
    SITE_AUTH_SECRET,
    { expiresIn: '7d' }
);

const verifySiteCookie = async (req, host) => {
    const token = req.cookies[SITE_AUTH_COOKIE_NAME];
    if (!token) return { ok: false };
    try {
        const payload = jwt.verify(token, SITE_AUTH_SECRET);
        if (payload.host !== host) return { ok: false };
        const user = await GlobalAuthUser.findOne({ where: { username: payload.username } });
        if (!user) return { ok: false };
        const grant = await SiteAuthGrant.findOne({ where: { host, userId: user.id } });
        if (!grant) return { ok: false };
        return { ok: true, user: { username: payload.username } };
    } catch (err) {
        return { ok: false };
    }
};

// --- Site-level access control (htpasswd per host) ---
// Deprecated htpasswd helpers (kept for compatibility with previous paths)
const writeHtpasswd = async () => 0;
const ensureHtpasswdExists = async () => {};

// --- ROUTES ---

app.get('/api/system', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/config', async (req, res) => {
    try {
        const setting = await Setting.findByPk('allowedDomains');
        const allowedDomains = setting ? setting.value : [];
        res.json({
            baseDomain: allowedDomains[0] || null,
            allowedDomains: allowedDomains,
            authEnabled: AUTH_ENABLED
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

app.get('/api/settings', authenticate, async (req, res) => {
    try {
        const setting = await Setting.findByPk('allowedDomains');
        res.json({ allowedDomains: setting ? setting.value : [] });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/api/settings', authenticate, async (req, res) => {
    const { allowedDomains } = req.body;
    if (!Array.isArray(allowedDomains)) {
        return res.status(400).json({ error: 'allowedDomains must be an array' });
    }
    try {
        await Setting.upsert({ key: 'allowedDomains', value: allowedDomains });
        res.json({ allowedDomains });
    } catch (err) {
        res.status(500).json({ error: 'DB Save Error' });
    }
});

app.get('/api/sites', authenticate, async (req, res) => {
    try {
        // Sync DB with File System (Self-Repairing)
        if (fs.existsSync(SITES_DIR)) {
            const dirs = fs.readdirSync(SITES_DIR).filter(f =>
                fs.statSync(path.join(SITES_DIR, f)).isDirectory()
            );

            // Register new sites found on disk
            for (const dir of dirs) {
                await Site.findOrCreate({
                    where: { host: dir },
                    defaults: { type: 'upload' } // Assume upload if found on disk
                });
            }

            // Remove DB entries for deleted folders
            const dbSites = await Site.findAll();
            for (const site of dbSites) {
                if (!dirs.includes(site.host)) {
                    await site.destroy();
                }
            }
        }

        const sites = await Site.findAll({ order: [['updatedAt', 'DESC']] });
        res.json(sites);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list sites' });
    }
});

// Helper: Deploy Content
const deployContent = async (host, file, code) => {
    const targetDir = path.join(SITES_DIR, host);

    // Clean/Create Dir
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });
    let type = 'upload';

    if (code) {
        // CODE DEPLOYMENT
        fs.writeFileSync(path.join(targetDir, 'index.html'), code);
        type = 'code';
    } else if (file) {
        // FILE DEPLOYMENT
        if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
            const zip = new AdmZip(file.path);
            zip.extractAllTo(targetDir, true);
        } else {
            // Auto rename to index.html logic
            const targetFile = path.join(targetDir, 'index.html');
            fs.copyFileSync(file.path, targetFile);
        }
        fs.unlinkSync(file.path); // Cleanup temp
    }

    // Update DB
    await Site.upsert({
        host,
        type,
        deployedAt: new Date()
    });
};

app.post('/api/deploy', authenticate, upload.single('file'), async (req, res) => {
    const { host, code } = req.body;
    const file = req.file;

    if (!host || !isValidHostname(host)) {
        if (file) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid hostname' });
    }

    if (!file && !code) {
        return res.status(400).json({ error: 'No file or code provided' });
    }

    try {
        await deployContent(host, file, code);
        res.json({ success: true, url: `http://${host}` });
    } catch (err) {
        console.error(err);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: 'Deployment failed', details: err.message });
    }
});

app.get('/api/sites/:host/health', authenticate, (req, res) => {
    const host = req.params.host;
    const sitePath = path.join(SITES_DIR, host);
    const indexPath = path.join(sitePath, 'index.html');

    if (fs.existsSync(sitePath) && fs.existsSync(indexPath)) {
        res.json({ status: 'online', lastCheck: new Date().toISOString() });
    } else {
        res.json({ status: 'offline', lastCheck: new Date().toISOString() });
    }
});

app.delete('/api/sites/:host', authenticate, async (req, res) => {
    const host = req.params.host;
    const targetDir = path.join(SITES_DIR, host);

    try {
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
        await Site.destroy({ where: { host } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

// Global user pool (common users)
app.get('/api/site-auth/common-users', authenticate, async (_req, res) => {
    const users = await GlobalAuthUser.findAll({ attributes: ['id', 'username'] });
    res.json({ users });
});

app.post('/api/site-auth/common-users', authenticate, async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
    const passwordHash = await bcrypt.hash(password, 10);
    await GlobalAuthUser.upsert({ username, passwordHash });
    res.json({ success: true });
});

app.delete('/api/site-auth/common-users/:username', authenticate, async (req, res) => {
    const username = req.params.username;
    const user = await GlobalAuthUser.findOne({ where: { username } });
    if (user) {
        await SiteAuthGrant.destroy({ where: { userId: user.id } });
        await user.destroy();
    }
    res.json({ success: true });
});

// Per-site grants (assign common users to a host)
app.get('/api/sites/:host/auth/users', authenticate, async (req, res) => {
    const host = req.params.host;
    if (!isValidHostname(host)) return res.status(400).json({ error: 'Invalid hostname' });
    const grants = await SiteAuthGrant.findAll({
        where: { host },
        include: [{ model: GlobalAuthUser, attributes: ['username'] }]
    });
    res.json({ users: grants.map(g => ({ username: g.GlobalAuthUser.username })) });
});

app.post('/api/sites/:host/auth/grants', authenticate, async (req, res) => {
    const host = req.params.host;
    if (!isValidHostname(host)) return res.status(400).json({ error: 'Invalid hostname' });
    const { usernames = [] } = req.body || {};
    if (!Array.isArray(usernames)) return res.status(400).json({ error: 'usernames must be an array' });

    // Clear existing grants
    await SiteAuthGrant.destroy({ where: { host } });

    // Recreate grants for provided usernames
    const users = await GlobalAuthUser.findAll({ where: { username: usernames } });
    for (const u of users) {
        await SiteAuthGrant.create({ host, userId: u.id });
    }
    res.json({ success: true, count: users.length });
});

// --- Site login endpoints (for per-site login page) ---
app.post('/api/site-auth/login', async (req, res) => {
    const rawHost = req.body?.host;
    const host = normalizeHost(rawHost);
    const { username, password } = req.body || {};
    if (!host || !isValidHostname(host)) return res.status(400).json({ error: 'Invalid host' });
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const user = await GlobalAuthUser.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const grant = await SiteAuthGrant.findOne({ where: { host, userId: user.id } });
    if (!grant) return res.status(403).json({ error: 'No access to this site' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = issueSiteToken(host, username);
    res.cookie(SITE_AUTH_COOKIE_NAME, token, siteAuthCookieOptions);
    res.json({ success: true });
});

app.post('/api/site-auth/logout', (req, res) => {
    res.clearCookie(SITE_AUTH_COOKIE_NAME, { ...siteAuthCookieOptions, maxAge: 0 });
    res.json({ success: true });
});

app.get('/api/site-auth/check', async (req, res) => {
    const host = normalizeHost(req.query.host || req.headers.host);
    if (!host || !isValidHostname(host)) return res.status(400).json({ error: 'Invalid host' });
    const result = await verifySiteCookie(req, host);
    if (!result.ok) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ ok: true, user: result.user });
});

// Lightweight login page (served by backend) for site protection
app.get('/__login', (req, res) => {
    const host = normalizeHost(req.query.host || req.headers.host || '');
    const next = req.query.next || '/';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login - ${host}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7fb; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { background:#fff; padding:24px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); width:320px; }
    .title { margin:0 0 8px; font-size:20px; }
    .sub { margin:0 0 16px; color:#6b7280; font-size:13px; }
    input { width:100%; padding:10px 12px; margin-bottom:12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; }
    button { width:100%; padding:12px; border:none; border-radius:8px; background:linear-gradient(90deg,#35bfab,#1fc9e7); color:#fff; font-weight:600; cursor:pointer; }
    .error { color:#dc2626; font-size:13px; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">登录站点</h1>
    <p class="sub">Host: ${host}</p>
    <div id="error" class="error" style="display:none;"></div>
    <input id="username" placeholder="用户名" />
    <input id="password" placeholder="密码" type="password" />
    <button id="loginBtn">登录</button>
  </div>
  <script>
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('error');
    btn.onclick = async () => {
      err.style.display = 'none';
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if(!username || !password) { err.textContent='请输入用户名和密码'; err.style.display='block'; return; }
      try {
        const res = await fetch('/api/site-auth/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ host:'${host}', username, password })
        });
        if(!res.ok){ const data = await res.json(); throw new Error(data.error || '登录失败'); }
        window.location.href = '${next}';
      } catch(e){
        err.textContent = e.message || '登录失败';
        err.style.display='block';
      }
    };
  </script>
</body>
</html>
    `);
});

// --- Multi-user login endpoints (for unified page protection) ---
app.post('/api/auth/login', async (req, res) => {
    if (!AUTH_ENABLED) return res.status(403).json({ error: 'Auth is disabled' });
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = issueToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    res.json({ success: true, user: { username: user.username } });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { ...authCookieOptions, maxAge: 0 });
    res.json({ success: true });
});

app.get('/api/auth/check', async (req, res) => {
    if (!AUTH_ENABLED) return res.json({ ok: true, enabled: false });
    const result = await verifyAuthCookie(req);
    if (!result.ok) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ ok: true, enabled: true, user: { username: result.user.username } });
});

// User management (protected by admin token)
app.get('/api/auth/users', authenticate, async (req, res) => {
    if (!AUTH_ENABLED) return res.json({ users: [] });
    const users = await User.findAll({ attributes: ['username'] });
    res.json({ users });
});

app.post('/api/auth/users', authenticate, async (req, res) => {
    if (!AUTH_ENABLED) return res.status(403).json({ error: 'Auth is disabled' });
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
    const passwordHash = await bcrypt.hash(password, 10);
    await User.upsert({ username, passwordHash });
    res.json({ success: true });
});

app.delete('/api/auth/users/:username', authenticate, async (req, res) => {
    if (!AUTH_ENABLED) return res.status(403).json({ error: 'Auth is disabled' });
    const username = req.params.username;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.destroy();
    res.json({ success: true });
});

// Seed default auth user when enabled
const ensureDefaultUser = async () => {
    if (!AUTH_ENABLED) return;
    const count = await User.count();
    if (count === 0) {
        const defaultUser = process.env.AUTH_DEFAULT_USER || 'admin';
        const defaultPass = process.env.AUTH_DEFAULT_PASS;
        if (!defaultPass) {
            console.warn('Auth enabled but AUTH_DEFAULT_PASS not set; no default user created.');
            return;
        }
        const passwordHash = await bcrypt.hash(defaultPass, 10);
        await User.create({ username: defaultUser, passwordHash });
        console.log(`Seeded default auth user "${defaultUser}"`);
    }
};

// Initialize DB and Start Server
initDB().then(() => {
    ensureDefaultUser();
    app.listen(PORT, () => {
        console.log(`SitePilot Backend running on port ${PORT}`);
    });
});
