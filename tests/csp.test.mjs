// vercel.json's Content-Security-Policy allows exactly the inline scripts the pages carry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

test('every executable inline script is hashed in the CSP, and nothing else is allowed inline', () => {
  const config = JSON.parse(readFileSync('config/site.config.json', 'utf8'));
  for (const l of config.languages) {
    const html = readFileSync(`dist${l.path}index.html`, 'utf8');
    for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
      assert.ok(csp.includes(hash), `${l.code}: inline script not in CSP: ${hash}`);
    }
  }
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
});

test('Vercel builds with the tests and serves dist/', () => {
  assert.equal(vercel.buildCommand, 'npm test');
  assert.equal(vercel.outputDirectory, 'dist');
});

test('everything under /assets/ has a content hash in its name (Vercel caches /assets/ as immutable)', () => {
  const config = JSON.parse(readFileSync('config/site.config.json', 'utf8'));
  const files = [...config.languages.map((l) => `dist${l.path}index.html`), 'dist/404.html'];
  for (const f of files) {
    const refs = [...readFileSync(f, 'utf8').matchAll(/["'(](\/assets\/[^"'#)\s]+)/g)].map((m) => m[1]);
    assert.ok(refs.length >= 2, `${f}: no asset references found`);
    for (const r of refs) assert.match(r, /\/assets\/[a-z]+\.[0-9a-f]{10}\.[a-z0-9]+$/, `${f}: ${r} has no content hash`);
  }
  const rule = vercel.headers.find((h) => h.source === '/assets/(.*)');
  assert.match(rule.headers[0].value, /immutable/);
});
