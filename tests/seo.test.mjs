// SEO baseline for every built page (global rules: titles, descriptions, one h1, canonical, JSON-LD
// from config, text ratio, alt text, no orphans, sitemap, robots, llms.txt) plus the site's own facts.
// Runs on dist/ built by `npm test` (node scripts/build.mjs && node --test tests/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const config = JSON.parse(readFileSync('config/site.config.json', 'utf8'));
const pages = config.languages.map((lang) => {
  const file = `dist${lang.path}index.html`;
  const html = readFileSync(file, 'utf8');
  return { lang, file, html, doc: new JSDOM(html).window.document };
});
const len = (s) => [...s].length;

test('every language has its page', () => {
  for (const p of pages) assert.ok(existsSync(p.file), `${p.file} missing`);
});

test('titles are 60 characters or fewer and unique', () => {
  const seen = new Set();
  for (const { doc, lang } of pages) {
    const t = doc.title;
    assert.ok(len(t) > 0 && len(t) <= 60, `${lang.code}: title is ${len(t)} chars: ${t}`);
    assert.ok(!seen.has(t), `${lang.code}: duplicate title ${t}`);
    seen.add(t);
  }
});

test('descriptions are 50-160 characters and unique', () => {
  const seen = new Set();
  for (const { doc, lang } of pages) {
    const d = doc.querySelector('meta[name="description"]').content;
    assert.ok(len(d) >= 50 && len(d) <= 160, `${lang.code}: description is ${len(d)} chars`);
    assert.ok(!seen.has(d), `${lang.code}: duplicate description`);
    seen.add(d);
  }
});

test('exactly one h1, different from the title', () => {
  for (const { doc, lang } of pages) {
    const h1s = doc.querySelectorAll('h1');
    assert.equal(h1s.length, 1, `${lang.code}: ${h1s.length} h1`);
    assert.notEqual(h1s[0].textContent.trim(), doc.title.trim(), `${lang.code}: h1 equals title`);
  }
});

test('charset is declared first, lang and dir match the language', () => {
  for (const { html, doc, lang } of pages) {
    assert.match(html, /<head>\s*<meta charset="utf-8">/, `${lang.code}: charset not first in head`);
    assert.equal(doc.documentElement.lang, lang.code);
    assert.equal(doc.documentElement.dir, lang.dir);
  }
  assert.equal(pages.find((p) => p.lang.code === 'he').doc.documentElement.dir, 'rtl');
});

test('one address per page: canonical and og:url on the main domain, hreflang for every language', () => {
  for (const { doc, lang } of pages) {
    const url = config.origin + lang.path;
    assert.equal(doc.querySelector('link[rel="canonical"]').href, url);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, url);
    const alts = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [l.hreflang, l.href]);
    for (const l of config.languages) assert.ok(alts.some(([h, u]) => h === l.code && u === config.origin + l.path), `${lang.code}: no hreflang ${l.code}`);
    assert.ok(alts.some(([h, u]) => h === 'x-default' && u === `${config.origin}/`), `${lang.code}: no x-default`);
  }
});

test('JSON-LD is valid and generated from the config', () => {
  for (const { doc, lang } of pages) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    assert.equal(scripts.length, 1, `${lang.code}: JSON-LD blocks`);
    const ld = JSON.parse(scripts[0].textContent);
    const person = ld['@graph'].find((n) => n['@type'] === 'Person');
    assert.equal(person.name, config.person.name);
    assert.equal(person.email, `mailto:${config.person.email}`);
    assert.deepEqual(person.sameAs, config.socials.map((s) => s.url));
    assert.equal(person.address.addressLocality, config.person.location.region);
    assert.equal(person.hasCredential.length, config.certifications.length);
    const page = ld['@graph'].find((n) => n['@type'] === 'ProfilePage');
    assert.equal(page.inLanguage, lang.code);
    assert.equal(page.name, doc.title);
  }
});

test('visible text is at least 10% of the HTML', () => {
  for (const { doc, html, lang } of pages) {
    doc.querySelectorAll('script, style').forEach((n) => n.remove());
    const text = doc.body.textContent.replace(/\s+/g, ' ').trim();
    const ratio = Buffer.byteLength(text) / Buffer.byteLength(html);
    assert.ok(ratio >= 0.1, `${lang.code}: text ratio ${(ratio * 100).toFixed(1)}%`);
  }
});

test('styles and scripts are shared external files; no third-party scripts', () => {
  for (const { doc, lang } of pages) {
    assert.equal(doc.querySelectorAll('style').length, 0, `${lang.code}: inline <style>`);
    const css = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'));
    assert.ok(css.length === 1 && /^\/assets\/site\.[0-9a-f]{10}\.css$/.test(css[0]), `${lang.code}: stylesheet ${css}`);
    for (const s of doc.querySelectorAll('script[src]')) {
      assert.match(s.getAttribute('src'), /^\/assets\//, `${lang.code}: third-party script ${s.src}`);
      assert.ok(s.defer || s.async, `${lang.code}: render-blocking script ${s.src}`);
    }
    for (const s of doc.querySelectorAll('script:not([src]):not([type])')) {
      assert.ok(s.textContent.length < 200, `${lang.code}: inline script longer than the theme bootstrap`);
    }
  }
});

test('every image has alt text', () => {
  for (const { doc, lang } of pages) {
    for (const img of doc.querySelectorAll('img')) assert.ok(img.getAttribute('alt')?.trim(), `${lang.code}: img ${img.src} has no alt`);
  }
});

test('no links to "#" and every page is linked from another page', () => {
  const linkedFrom = new Map(config.languages.map((l) => [l.path, 0]));
  for (const { doc, lang } of pages) {
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      assert.notEqual(href, '#', `${lang.code}: link to #`);
      if (linkedFrom.has(href) && href !== lang.path) linkedFrom.set(href, linkedFrom.get(href) + 1);
    }
  }
  for (const [path, n] of linkedFrom) assert.ok(n > 0, `${path} is an orphan`);
});

test('in-page anchors point at elements that exist', () => {
  for (const { doc, lang } of pages) {
    for (const a of doc.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute('href').slice(1);
      assert.ok(doc.getElementById(id), `${lang.code}: #${id} does not exist`);
    }
  }
});

test('every social link, the email and Vancouver Island are on every page', () => {
  for (const { doc, lang } of pages) {
    const hrefs = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    for (const s of config.socials) assert.ok(hrefs.includes(s.url), `${lang.code}: ${s.label} link missing`);
    assert.ok(hrefs.includes(`mailto:${config.person.email}`), `${lang.code}: mailto missing`);
    assert.ok(hrefs.filter((h) => h === config.person.booking).length >= 2, `${lang.code}: Calendly link missing in hero or contact`);
    assert.ok(!doc.body.innerHTML.includes('gmail.com'), `${lang.code}: a gmail address is published`);
  }
});

test('sitemap, robots.txt and llms.txt', () => {
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  for (const l of config.languages) assert.ok(sitemap.includes(`<loc>${config.origin}${l.path}</loc>`), `sitemap misses ${l.path}`);
  const robots = readFileSync('dist/robots.txt', 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${config.origin}/sitemap.xml`));
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) assert.match(robots, new RegExp(`User-agent: ${bot}\\nAllow: /`));
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
  const llms = readFileSync('dist/llms.txt', 'utf8');
  assert.match(llms, new RegExp(`^# ${config.person.name}`));
  assert.ok(llms.includes(config.person.email));
});

test('the 404 page is not indexed', () => {
  const doc = new JSDOM(readFileSync('dist/404.html', 'utf8')).window.document;
  assert.equal(doc.querySelector('meta[name="robots"]').content, 'noindex');
  assert.equal(doc.querySelectorAll('h1').length, 1);
});

test('the ring around the portrait links every project and personal account, each with a name', () => {
  for (const { doc, lang } of pages) {
    const links = [...doc.querySelectorAll('.orbit a')];
    const hrefs = links.map((a) => a.getAttribute('href'));
    for (const x of [...config.projects, ...config.socials]) assert.ok(hrefs.includes(x.url), `${lang.code}: ring misses ${x.url}`);
    assert.equal(links.length, config.projects.length + config.socials.length, `${lang.code}: ring has extra items`);
    for (const a of links) {
      assert.ok(a.querySelector('.sr')?.textContent.trim() || a.querySelector('img')?.alt.trim(), `${lang.code}: ${a.href} has no accessible name`);
      assert.ok(a.dataset.tip?.trim(), `${lang.code}: ${a.href} has no hover description`);
    }
  }
});

test('the glitching name keeps a plain heading: slices are empty and hidden from screen readers', () => {
  for (const { doc, lang } of pages) {
    const h1 = doc.querySelector('h1');
    const slices = h1.querySelectorAll('.glitch__slice');
    assert.equal(slices.length, 3);
    for (const s of slices) {
      assert.equal(s.textContent, '', `${lang.code}: a slice carries text`);
      assert.equal(s.getAttribute('aria-hidden'), 'true');
      assert.equal(s.dataset.text, h1.textContent);
    }
  }
});
