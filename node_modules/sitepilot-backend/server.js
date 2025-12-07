const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { initDB, Setting, Site } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;
const SITES_DIR = process.env.SITES_DIR || '/var/www/sites';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Ensure sites dir exists
if (!fs.existsSync(SITES_DIR)) {
    fs.mkdirSync(SITES_DIR, { recursive: true });
}

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json());

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
            allowedDomains: allowedDomains
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

// Initialize DB and Start Server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`SitePilot Backend running on port ${PORT}`);
    });
});
