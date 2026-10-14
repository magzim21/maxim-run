// Serves dist/ on 127.0.0.1 the way Vercel does: /ru/ -> /ru/index.html, unknown paths -> 404.html.
// Usage: node scripts/serve.mjs [port]   (default 4321; e2e tests use it)
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const port = Number(process.argv[2] || process.env.PORT || 4321);

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  const found = file.startsWith(DIST) && existsSync(file);
  const body = readFileSync(found ? file : join(DIST, '404.html'));
  res.writeHead(found ? 200 : 404, { 'content-type': TYPES[found ? extname(file) : '.html'] || 'application/octet-stream' });
  res.end(body);
}).listen(port, '127.0.0.1', () => console.log(`maxim.run dist on http://127.0.0.1:${port}/`));
