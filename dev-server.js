import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '25mb' }));

// Disable caching in dev so edits reflect immediately.
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const allowedFiles = new Set(['projects.json', 'featured-projects.json', 'posts.json']);

app.post('/__save', async (req, res) => {
  try {
    const { file, content } = req.body || {};

    if (typeof file !== 'string' || !allowedFiles.has(file)) {
      return res.status(400).json({ ok: false, error: 'Invalid file' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid content' });
    }

    // Validate JSON before writing.
    JSON.parse(content);

    const targetPath = path.join(__dirname, file);
    await fs.writeFile(targetPath, content, 'utf8');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Save failed' });
  }
});

app.use(express.static(__dirname));

const basePort = Number(process.env.PORT || 5174);

function startServer(port) {
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Dev server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    throw err;
  });
}

startServer(basePort);

