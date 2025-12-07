import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const SITE_ROOT = process.env.SITE_ROOT || '/var/www/sites';
const PORT = process.env.PORT || 3000;
const SITE_PROTOCOL = process.env.SITE_PROTOCOL || 'http';
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 50;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function isValidHost(host) {
  return typeof host === 'string' && /^[A-Za-z0-9.-]+$/.test(host) && !host.includes('..') && host.trim() !== '';
}

function buildSiteUrl(host) {
  return `${SITE_PROTOCOL}://${host}/`;
}

async function ensureSiteRoot() {
  await fs.mkdir(SITE_ROOT, { recursive: true });
}

function authMiddleware(req, res, next) {
  const header = req.get('authorization') || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

async function listSites() {
  await ensureSiteRoot();
  const entries = await fs.readdir(SITE_ROOT, { withFileTypes: true });
  const sites = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const sitePath = path.join(SITE_ROOT, entry.name);
    const stats = await fs.stat(sitePath);
    const hasIndex = await fileExists(path.join(sitePath, 'index.html'));
    return {
      host: entry.name,
      path: sitePath,
      updatedAt: stats.mtime,
      hasIndex,
      url: buildSiteUrl(entry.name)
    };
  }));
  return sites;
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getSiteDir(host) {
  return path.join(SITE_ROOT, host);
}

async function removeSite(host) {
  const siteDir = getSiteDir(host);
  const exists = await fileExists(siteDir);
  await fs.rm(siteDir, { recursive: true, force: true });
  return exists;
}

async function writeHtml(siteDir, buffer) {
  await fs.mkdir(siteDir, { recursive: true });
  const htmlPath = path.join(siteDir, 'index.html');
  await fs.writeFile(htmlPath, buffer);
}

async function extractZip(siteDir, buffer) {
  await fs.mkdir(siteDir, { recursive: true });
  const zip = new AdmZip(buffer);
  const baseDir = path.resolve(siteDir);

  for (const entry of zip.getEntries()) {
    const destPath = path.join(baseDir, entry.entryName);
    const normalized = path.normalize(destPath);

    if (!normalized.startsWith(baseDir)) {
      throw new Error(`Blocked zip entry outside target directory: ${entry.entryName}`);
    }

    if (entry.isDirectory) {
      await fs.mkdir(normalized, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(normalized), { recursive: true });
      const data = entry.getData();
      await fs.writeFile(normalized, data);
    }
  }
}

app.use('/api', authMiddleware);

app.post('/api/sites', upload.single('file'), async (req, res) => {
  try {
    const { host } = req.body;
    const type = (req.body.type || '').toLowerCase();
    const file = req.file;

    if (!isValidHost(host)) {
      return res.status(400).json({ error: 'Invalid host' });
    }
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const siteDir = getSiteDir(host);
    await removeSite(host);
    const lowerName = file.originalname.toLowerCase();

    let mode = null;
    if (type === 'zip' || type === 'single') {
      mode = type;
    } else {
      mode = lowerName.endsWith('.zip') ? 'zip' : 'single';
    }

    if (mode === 'zip' && !lowerName.endsWith('.zip')) {
      return res.status(400).json({ error: 'Type set to zip but file is not .zip' });
    }

    if (mode === 'zip') {
      await extractZip(siteDir, file.buffer);
    } else {
      await writeHtml(siteDir, file.buffer);
    }

    return res.status(201).json({ host, path: siteDir, url: buildSiteUrl(host), type: mode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Deployment failed', details: err.message });
  }
});

app.get('/api/sites', async (_req, res) => {
  try {
    const sites = await listSites();
    return res.json({ sites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list sites' });
  }
});

app.get('/api/sites/:host', async (req, res) => {
  try {
    const { host } = req.params;
    if (!isValidHost(host)) {
      return res.status(400).json({ error: 'Invalid host' });
    }

    const siteDir = getSiteDir(host);
    if (!(await fileExists(siteDir))) {
      return res.status(404).json({ error: 'Not found' });
    }

    const stats = await fs.stat(siteDir);
    const hasIndex = await fileExists(path.join(siteDir, 'index.html'));

    return res.json({
      host,
      path: siteDir,
      updatedAt: stats.mtime,
      hasIndex,
      url: buildSiteUrl(host)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load site' });
  }
});

app.delete('/api/sites/:host', async (req, res) => {
  try {
    const { host } = req.params;
    if (!isValidHost(host)) {
      return res.status(400).json({ error: 'Invalid host' });
    }

    const existed = await removeSite(host);
    if (!existed) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json({ deleted: host });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete site' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  try {
    await ensureSiteRoot();
    console.log(`SnapDeploy API listening on http://localhost:${PORT}`);
    console.log(`Site root: ${SITE_ROOT}`);
  } catch (err) {
    console.error('Failed to initialize site root', err);
    process.exit(1);
  }
});
