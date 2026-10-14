// Builds the static site into dist/: one page per language, assets with content hashes,
// sitemap.xml, robots.txt, llms.txt and the land dots for the travel globe.
// Usage: node scripts/build.mjs [--out dist]
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { feature } from 'topojson-client';
import { renderNotFound, renderPage, pageUrl } from '../src/template.mjs';
import { sprite } from '../src/icons.mjs';
import { checkTranslations } from '../src/i18n-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_VERSION = 1;

export function loadSite(root = ROOT) {
  const config = JSON.parse(readFileSync(join(root, 'config/site.config.json'), 'utf8'));
  if (config.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`config/site.config.json has schemaVersion ${config.schemaVersion}; this build expects ${SCHEMA_VERSION}`);
  }
  const i18n = Object.fromEntries(
    config.languages.map((l) => [l.code, JSON.parse(readFileSync(join(root, `i18n/${l.code}.json`), 'utf8'))]),
  );
  const problems = checkTranslations(i18n, 'en');
  if (problems.length) throw new Error(`Translations do not match i18n/en.json:\n  ${problems.join('\n  ')}`);
  return { config, i18n };
}

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

function buildId() {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}

// Land as a grid of dots (lat, lon pairs, 2° apart), so the globe draws without a map library.
function landDots() {
  const topo = JSON.parse(readFileSync(join(ROOT, 'node_modules/world-atlas/land-110m.json'), 'utf8'));
  const land = feature(topo, topo.objects.land);
  const polys = land.features.flatMap((f) =>
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates,
  );
  const inRing = (x, y, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inLand = (x, y) => polys.some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
  const dots = [];
  for (let lat = -58; lat <= 82; lat += 2) {
    // Fewer dots towards the poles keeps the spacing even on the sphere.
    const step = 2 / Math.max(Math.cos((lat * Math.PI) / 180), 0.25);
    for (let lon = -180; lon < 180; lon += step) {
      if (inLand(lon, lat)) dots.push(lat, Math.round(lon * 10) / 10);
    }
  }
  return dots;
}

export async function build({ out = join(ROOT, 'dist') } = {}) {
  const { config, i18n } = loadSite();
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'assets'), { recursive: true });

  cpSync(join(ROOT, 'static'), out, { recursive: true });
  mkdirSync(join(out, 'fonts'), { recursive: true });
  for (const [pkg, names] of [
    ['inter', ['latin-400', 'latin-600', 'latin-800', 'cyrillic-400', 'cyrillic-600', 'cyrillic-800']],
    ['jetbrains-mono', ['latin-400', 'latin-700', 'cyrillic-400', 'cyrillic-700']],
  ]) {
    for (const n of names) {
      const file = `${pkg}-${n}-normal.woff2`;
      cpSync(join(ROOT, `node_modules/@fontsource/${pkg}/files/${file}`), join(out, 'fonts', file));
    }
  }

  const bundle = async (entry, ext) => {
    const r = await esbuild.build({
      entryPoints: [join(ROOT, entry)],
      bundle: true,
      minify: true,
      write: false,
      target: ['es2020', 'safari15'],
      external: ['/fonts/*'],
      legalComments: 'none',
    });
    const code = r.outputFiles[0].contents;
    const name = `site.${hash(code)}.${ext}`;
    writeFileSync(join(out, 'assets', name), code);
    return name;
  };
  const assets = { css: await bundle('src/site.css', 'css'), js: await bundle('src/site.js', 'js') };

  const land = JSON.stringify(landDots());
  assets.land = `land.${hash(land)}.json`;
  writeFileSync(join(out, 'assets', assets.land), land);
  writeFileSync(join(out, 'assets', 'icons.svg'), sprite());

  const build = buildId();
  const stats = { years: new Date().getUTCFullYear() - config.person.devopsSinceYear, certs: config.certifications.length };
  const pages = [];
  for (const lang of config.languages) {
    const html = renderPage({ config, lang, t: i18n[lang.code], assets, build, stats });
    const dir = join(out, lang.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    pages.push({ lang, file: join(dir, 'index.html') });
  }
  writeFileSync(join(out, '404.html'), renderNotFound({ config, lang: config.languages[0], t: i18n.en, assets, build }));

  const today = new Date().toISOString().slice(0, 10);
  const alt = config.languages
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l.code}" href="${pageUrl(config, l)}"/>`)
    .join('');
  writeFileSync(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${config.languages.map((l) => `<url><loc>${pageUrl(config, l)}</loc><lastmod>${today}</lastmod>${alt}<xhtml:link rel="alternate" hreflang="x-default" href="${config.origin}/"/></url>`).join('\n')}
</urlset>
`,
  );
  writeFileSync(
    join(out, 'robots.txt'),
    `# AI search and assistant crawlers are welcome.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: *
Allow: /

Sitemap: ${config.origin}/sitemap.xml
`,
  );
  const en = i18n.en;
  writeFileSync(
    join(out, 'llms.txt'),
    `# ${config.person.name}

> ${en.meta.description}

${en.about.p1}

## Pages
${config.languages.map((l) => `- [${l.label}](${pageUrl(config, l)}): ${i18n[l.code].meta.title}`).join('\n')}

## Facts
- Location: ${config.person.location.region}, ${config.person.location.province}, ${config.person.location.country}
- Email: ${config.person.email}
- Certifications: ${config.certifications.map((c) => c.name).join('; ')}
- Stack: ${config.stack.join(', ')}

## Links
${config.socials.map((s) => `- [${s.label}](${s.url})`).join('\n')}
`,
  );
  return { out, pages, assets, build };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = i > 0 ? resolve(process.argv[i + 1]) : undefined;
  const r = await build({ out });
  if (!existsSync(join(r.out, 'index.html'))) throw new Error('build produced no index.html');
  console.log(`built ${r.pages.length} pages into ${r.out} (build ${r.build})`);
}
