import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 4173;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Check dist directory on startup
try {
  const files = await readdir(DIST);
  console.log(`dist/ contains: ${files.join(', ')}`);
} catch (err) {
  console.error(`ERROR: dist/ not found at ${DIST}:`, err.message);
  console.log(`__dirname is: ${__dirname}`);
  // List what's actually in __dirname
  try {
    const parentFiles = await readdir(__dirname);
    console.log(`Files in ${__dirname}: ${parentFiles.join(', ')}`);
  } catch (e) {
    console.error(`Cannot list ${__dirname}:`, e.message);
  }
}

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const filePath = join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  console.log(`${req.method} ${urlPath} -> ${filePath}`);

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // SPA fallback: serve index.html for any unknown route
    try {
      const data = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    } catch (err) {
      console.error(`Failed to serve index.html fallback:`, err.message);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running on http://0.0.0.0:${PORT}`);
});
