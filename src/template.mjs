// Renders one language's page from config/site.config.json and i18n/<lang>.json.
// Every fact (links, email, certifications, location) comes from the config; every sentence from i18n.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="/assets/icons.svg#${id}"></use></svg>`;

// A short, stable pseudo commit hash for the career "git log" (decoration only).
function shortHash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0').slice(0, 7);
}


export function pageUrl(config, lang) {
  return config.origin + lang.path;
}

export function jsonLd(config, lang, t) {
  const p = config.person;
  const url = pageUrl(config, lang);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${config.origin}/#person`,
        name: p.name,
        alternateName: p.alternateName,
        jobTitle: p.jobTitle,
        email: `mailto:${p.email}`,
        url: `${config.origin}/`,
        image: config.origin + p.image,
        address: {
          '@type': 'PostalAddress',
          addressRegion: p.location.province,
          addressCountry: p.location.country,
          addressLocality: p.location.region,
        },
        homeLocation: { '@type': 'Place', name: `${p.location.region}, ${p.location.province}, ${p.location.country}` },
        knowsAbout: p.knowsAbout,
        hasCredential: config.certifications.map((c) => ({
          '@type': 'EducationalOccupationalCredential',
          name: c.name,
          credentialCategory: 'certification',
        })),
        sameAs: config.socials.map((s) => s.url),
      },
      {
        '@type': 'WebSite',
        '@id': `${config.origin}/#website`,
        url: `${config.origin}/`,
        name: `${p.name} · ${config.domain}`,
        inLanguage: config.languages.map((l) => l.code),
        publisher: { '@id': `${config.origin}/#person` },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#webpage`,
        url,
        name: t.meta.title,
        description: t.meta.description,
        inLanguage: lang.code,
        isPartOf: { '@id': `${config.origin}/#website` },
        mainEntity: { '@id': `${config.origin}/#person` },
      },
    ],
  };
}

function head({ config, lang, t, assets, title, description, canonical, noindex }) {
  const alternates = config.languages
    .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${pageUrl(config, l)}">`)
    .join('');
  const ld = noindex ? '' : `<script type="application/ld+json">${JSON.stringify(jsonLd(config, lang, t)).replace(/</g, '\\u003c')}</script>`;
  const themeColor = config.themes.find((th) => th.id === config.defaultTheme).color;
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">${alternates}<link rel="alternate" hreflang="x-default" href="${config.origin}/">`}
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${esc(config.person.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${config.origin}/og.png">
<meta property="og:image:alt" content="${esc(t.meta.ogAlt)}">
<meta property="og:locale" content="${lang.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${themeColor}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/jetbrains-mono-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/${assets.css}">
<script>try{var m=localStorage.getItem('theme');if(m)document.documentElement.dataset.theme=m}catch(e){}</script>
${ld}
</head>`;
}

function header({ config, lang, t }) {
  const langs = config.languages
    .map(
      (l) =>
        `<li><a href="${l.path}" hreflang="${l.code}" lang="${l.code}" data-lang="${l.code}"${l.code === lang.code ? ' aria-current="page"' : ''}>${esc(l.label)}</a></li>`,
    )
    .join('');
  const themes = config.themes
    .map(
      (th) =>
        `<button type="button" class="swatch swatch--${th.id}" data-theme-set="${th.id}" aria-pressed="false" data-tip="${esc(t.nav.themes[th.id])}"><span class="sr">${esc(t.nav.theme)}: ${esc(t.nav.themes[th.id])}</span></button>`,
    )
    .join('');
  const links = ['about', 'automation', 'talents', 'travel', 'contact']
    .map((id) => `<li><a href="#${id}">${esc(t.nav[id])}</a></li>`)
    .join('');
  return `<header class="nav" data-nav>
  <a class="brand" href="${lang.path}" aria-label="${esc(config.person.name)}"><span class="brand__tilde">~/</span>max<span class="brand__cursor" aria-hidden="true"></span></a>
  <nav class="nav__links" aria-label="${esc(t.nav.menu)}"><ul>${links}</ul></nav>
  <div class="nav__tools">
    <div class="themes" role="group" aria-label="${esc(t.nav.theme)}">${themes}</div>
    <div class="langs" data-dropdown>
      <button type="button" class="langs__btn" aria-expanded="false" aria-haspopup="true" data-dropdown-btn>${icon('globe')}<span>${esc(lang.short)}</span><span class="sr">${esc(t.nav.language)}</span></button>
      <ul class="langs__list" data-dropdown-panel>${langs}</ul>
    </div>
    <button type="button" class="nav__burger" aria-expanded="false" data-burger><span class="sr">${esc(t.nav.menu)}</span><i></i><i></i><i></i></button>
  </div>
</header>`;
}

function hero({ config, t, stats }) {
  // The ring around the portrait: Max's projects, then his personal accounts. Every item is a link.
  const ring = [
    ...config.projects.map((p) => ({ id: p.id, url: p.url, label: '', tip: `${p.name}: ${t.projects[p.id]}`, art: `<img src="${p.img}" alt="${esc(p.name)}" width="46" height="46" loading="lazy" decoding="async">`, rel: 'noopener' })),
    ...config.socials.map((s) => ({ id: s.id, url: s.url, label: s.label, tip: `${s.label} · ${s.handle}`, art: icon(s.id === 'youtube' ? 'youtube-badge' : s.id, 'i i--logo'), rel: 'me noopener' })),
  ];
  const orbit = ring
    .map((r, i) => `<li style="--i:${i};--n:${ring.length}"><a class="orbit__link orbit__link--${r.id}" href="${r.url}" rel="${r.rel}" target="_blank" data-tip="${esc(r.tip)}"><span class="orbit__face">${r.art}</span>${r.label ? `<span class="sr">${esc(r.label)}</span>` : ''}</a></li>`)
    .join('');
  return `<section class="hero" id="top">
  <div class="hero__text">
    <p class="prompt" dir="ltr"><span class="prompt__user">max@vancouver-island</span>:<span class="prompt__path">~</span>$ <span class="prompt__cmd" data-type="${esc(t.hero.prompt)}">${esc(t.hero.prompt)}</span></p>
    <h1 class="glitch" data-text="${esc(t.hero.h1)}">${esc(t.hero.h1)}</h1>
    <p class="roles"><span class="roles__arrow" aria-hidden="true">&gt;</span> <span class="roles__text" data-roles='${esc(JSON.stringify(t.hero.roles))}'>${esc(t.hero.roles[0])}</span><span class="caret" aria-hidden="true"></span></p>
    <p class="lede">${esc(t.hero.lede)}</p>
    <p class="loc">${icon('pin')}<span class="loc__dot" aria-hidden="true"></span>${esc(t.hero.location)}</p>
    <div class="cta">
      <a class="btn btn--primary" href="#contact">${icon('mail')}${esc(t.hero.ctaPrimary)}</a>
      <a class="btn btn--ghost" href="#shell">${icon('terminal')}${esc(t.hero.ctaSecondary)}</a>
    </div>
    <dl class="stats">
      <div><dt>${esc(t.hero.statYears)}</dt><dd data-count="${stats.years}">${stats.years}+</dd></div>
      <div><dt>${esc(t.hero.statCerts)}</dt><dd data-count="${stats.certs}">${stats.certs}</dd></div>
      <div><dt>${esc(t.hero.statLaps)}</dt><dd data-count="1">1</dd></div>
    </dl>
  </div>
  <div class="hero__media">
    <div class="halo" aria-hidden="true"></div>
    <ul class="orbit" aria-label="${esc(t.hero.orbit)}">${orbit}</ul>
    <img class="portrait" src="${config.person.image}" srcset="/img/max-onyx-420.webp 420w, /img/max-onyx-720.webp 720w" sizes="(max-width: 760px) 78vw, 420px" width="720" height="1081" alt="${esc(t.hero.photoAlt)}" fetchpriority="high">
    <div class="scan" aria-hidden="true"></div>
  </div>
  <a class="scrollhint" href="#about">${esc(t.hero.scroll)}<span aria-hidden="true"></span></a>
</section>`;
}

function about({ t }) {
  return `<section class="section about" id="about" data-reveal>
  <p class="eyebrow">${esc(t.about.eyebrow)}</p>
  <h2 class="quote">${esc(t.about.title)}</h2>
  <div class="about__grid">
    <div class="prose">
      <p>${esc(t.about.p1)}</p>
      <p>${esc(t.about.p2)}</p>
      <p>${esc(t.about.p3)}</p>
    </div>
    <figure class="code" dir="ltr">
      <figcaption><span class="dots"><i></i><i></i><i></i></span>principles.yaml</figcaption>
<pre><code><span class="c"># ${esc(t.about.codeComment)}</span>
<span class="k">everything_as_code</span>: <span class="b">true</span>
<span class="k">clickops</span>: <span class="s">forbidden</span>
<span class="k">credentials</span>: <span class="s">short_lived</span>  <span class="c"># OIDC, no keys</span>
<span class="k">environments</span>:
  - <span class="s">dev</span>
  - <span class="s">staging</span>
  - <span class="s">prod</span>       <span class="c"># one module, three stacks</span>
<span class="k">complexity</span>: <span class="s">"only when it pays rent"</span>
<span class="k">rollback</span>: <span class="s">git revert</span>
<span class="k">on_call</span>: <span class="s">boring</span>      <span class="c"># the goal</span></code></pre>
    </figure>
  </div>
</section>`;
}

function automation({ t }) {
  const a = t.automation;
  const steps = a.steps
    .map(
      (s, i) =>
        `<li class="pipe__step" style="--i:${i}"><span class="pipe__dot">${String(i + 1).padStart(2, '0')}</span><b>${esc(s)}</b><small>${esc(a.stepHints[i])}</small></li>`,
    )
    .join('');
  const lines = (arr, cls) => arr.map((l, i) => `<li class="${cls}" style="--i:${i}">${esc(l)}</li>`).join('');
  const results = a.results
    .map((r) => `<li class="result" data-reveal><b>${esc(r.value)}</b><span>${esc(r.label)}</span></li>`)
    .join('');
  return `<section class="section automation" id="automation" data-reveal>
  <p class="eyebrow">${esc(a.eyebrow)}</p>
  <h2>${esc(a.title)}</h2>
  <p class="intro">${esc(a.intro)}</p>
  <ol class="pipe" data-pipe>${steps}<li class="pipe__packet" aria-hidden="true"></li></ol>
  <div class="versus" data-versus data-mode="auto">
    <div class="versus__toggle" role="group">
      <button type="button" data-mode-set="manual" aria-pressed="false">${esc(a.toggleManual)}</button>
      <button type="button" data-mode-set="auto" aria-pressed="true">${esc(a.toggleAuto)}</button>
      <span class="versus__thumb" aria-hidden="true"></span>
    </div>
    <div class="versus__panes">
      <ol class="term term--manual" dir="ltr" aria-label="${esc(a.toggleManual)}">${lines(a.manualLines, 'bad')}</ol>
      <ol class="term term--auto" dir="ltr" aria-label="${esc(a.toggleAuto)}">${lines(a.autoLines, 'good')}</ol>
    </div>
  </div>
  <h3 class="sub">${esc(a.resultsTitle)}</h3>
  <ul class="results">${results}</ul>
</section>`;
}

function stack({ config, t }) {
  const half = Math.ceil(config.stack.length / 2);
  const row = (items) => {
    const chips = items.map((s) => `<li>${esc(s)}</li>`).join('');
    return `<div class="marquee"><ul>${chips}</ul><ul aria-hidden="true">${chips}</ul></div>`;
  };
  return `<section class="section stack" id="stack" data-reveal>
  <p class="eyebrow">${esc(t.stack.eyebrow)}</p>
  <h2>${esc(t.stack.title)}</h2>
  <p class="intro">${esc(t.stack.intro)}</p>
  <div class="marquees" dir="ltr">${row(config.stack.slice(0, half))}${row(config.stack.slice(half)).replace('class="marquee"', 'class="marquee marquee--rev"')}</div>
</section>`;
}

function certs({ config, t }) {
  const credly = config.socials.find((s) => s.id === 'credly');
  const items = config.certifications
    .map(
      (c, i) =>
        `<li class="badge" style="--i:${i}" data-tilt><img src="${c.img}" alt="${esc(c.name)}" width="240" height="240" loading="lazy" decoding="async"><span>${esc(c.name)}<small>${c.year}</small></span></li>`,
    )
    .join('');
  return `<section class="section certs" id="certs" data-reveal>
  <p class="eyebrow">${esc(t.certs.eyebrow)}</p>
  <h2>${esc(t.certs.title)}</h2>
  <p class="intro">${esc(t.certs.intro)}</p>
  <ul class="badges">${items}</ul>
  <a class="btn btn--ghost" href="${credly.url}" rel="me noopener" target="_blank">${icon('credly')}${esc(t.certs.cta)}</a>
</section>`;
}

function career({ t }) {
  const items = t.career.items
    .map(
      (it, i) =>
        `<li class="commit" style="--i:${i}" data-reveal><code dir="ltr">${shortHash(it.org + it.years)}</code><div><p class="commit__meta"><time>${esc(it.years)}</time> · <b>${esc(it.org)}</b></p><h3>${esc(it.role)}</h3><p>${esc(it.text)}</p></div></li>`,
    )
    .join('');
  return `<section class="section career" id="career" data-reveal>
  <p class="eyebrow">${esc(t.career.eyebrow)}</p>
  <h2>${esc(t.career.title)}</h2>
  <p class="gitcmd" dir="ltr">$ git log --oneline --graph career</p>
  <ol class="gitlog">${items}</ol>
</section>`;
}

function talents({ t }) {
  const items = t.talents.items
    .map(
      (it, i) =>
        `<li class="talent" style="--i:${i}" data-tilt data-reveal><span class="talent__icon">${icon(it.icon)}</span><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`,
    )
    .join('');
  return `<section class="section talents" id="talents" data-reveal>
  <p class="eyebrow">${esc(t.talents.eyebrow)}</p>
  <h2>${esc(t.talents.title)}</h2>
  <p class="intro">${esc(t.talents.intro)}</p>
  <ul class="talent-grid">${items}</ul>
</section>`;
}

function travel({ config, t, assets }) {
  const yt = config.socials.find((s) => s.id === 'youtube');
  const facts = t.travel.facts.map((f) => `<div><dt dir="ltr">${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('');
  const { lat, lon } = config.person.location;
  return `<section class="section travel" id="travel" data-reveal>
  <div class="travel__text">
    <p class="eyebrow">${esc(t.travel.eyebrow)}</p>
    <h2>${esc(t.travel.title)}</h2>
    <p class="intro">${esc(t.travel.intro)}</p>
    <dl class="facts">${facts}</dl>
    <a class="btn btn--primary" href="${yt.url}" rel="me noopener" target="_blank">${icon('youtube-badge')}${esc(t.travel.youtube)}</a>
  </div>
  <figure class="globe" data-globe data-land="/assets/${assets.land}" data-home="${lat},${lon}">
    <canvas width="560" height="560" aria-label="${esc(t.travel.route)}" role="img"></canvas>
    <figcaption><span class="legend legend--home">${esc(t.travel.home)}</span><span class="legend legend--route">${esc(t.travel.route)}</span><span class="legend legend--drag">${esc(t.travel.drag)}</span></figcaption>
  </figure>
</section>`;
}

function shell({ config, t, stats }) {
  const chips = t.shell.chips.map((c) => `<li><button type="button" data-cmd="${esc(c)}">${esc(c)}</button></li>`).join('');
  const data = {
    years: stats.years,
    email: config.person.email,
    stack: config.stack,
    certs: config.certifications.map((c) => c.name),
    socials: config.socials.map((s) => [s.label, s.url]),
    langs: config.languages.map((l) => [l.code, l.path]),
    themes: config.themes.map((th) => th.id),
    text: t.shell,
  };
  return `<section class="section shell" id="shell" data-reveal>
  <p class="eyebrow">${esc(t.shell.eyebrow)}</p>
  <h2>${esc(t.shell.title)}</h2>
  <p class="intro">${esc(t.shell.intro)}</p>
  <div class="tty" dir="ltr" data-shell>
    <div class="tty__bar"><span class="dots"><i></i><i></i><i></i></span><span>max@vancouver-island: ~</span></div>
    <output class="tty__out" aria-live="polite" data-shell-out></output>
    <form class="tty__in" data-shell-form>
      <label for="shell-input"><span class="prompt__user">max</span>:<span class="prompt__path">~</span>$<span class="sr">${esc(t.shell.label)}</span></label>
      <input id="shell-input" name="cmd" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="${esc(t.shell.placeholder)}">
    </form>
  </div>
  <ul class="chips">${chips}</ul>
  <script type="application/json" data-shell-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
</section>`;
}

function contact({ config, t }) {
  const socials = config.socials
    .map(
      (s) =>
        `<li><a href="${s.url}" rel="me noopener" target="_blank" class="social social--${s.id}">${icon(s.id)}<span><b>${esc(s.label)}</b><small dir="ltr">${esc(s.handle)}</small></span></a></li>`,
    )
    .join('');
  const email = config.person.email;
  return `<section class="section contact" id="contact" data-reveal>
  <p class="eyebrow">${esc(t.contact.eyebrow)}</p>
  <h2>${esc(t.contact.title)}</h2>
  <p class="intro">${esc(t.contact.text)}</p>
  <div class="mailbox">
    <a class="mail" href="mailto:${email}" dir="ltr">${icon('mail')}<span>${email}</span></a>
    <button type="button" class="btn btn--ghost" data-copy="${email}" data-copied="${esc(t.contact.copied)}">${icon('copy')}<span>${esc(t.contact.copy)}</span></button>
  </div>
  <h3 class="sub">${esc(t.contact.socials)}</h3>
  <ul class="socials">${socials}</ul>
</section>`;
}

function footer({ config, lang, t, build }) {
  const langs = config.languages
    .map((l) => `<a href="${l.path}" hreflang="${l.code}" lang="${l.code}" data-lang="${l.code}"${l.code === lang.code ? ' aria-current="page"' : ''}>${esc(l.label)}</a>`)
    .join('');
  return `<footer class="foot">
  <p>${esc(t.footer.built)}</p>
  <p class="foot__row"><a href="${config.repo}" rel="noopener" target="_blank">${icon('github')}${esc(t.footer.source)}</a><span dir="ltr">${esc(t.footer.version)} <code>${esc(build)}</code></span><a href="#top">${esc(t.footer.top)} ↑</a></p>
  <nav class="foot__langs" aria-label="${esc(t.nav.language)}">${langs}</nav>
  <p class="foot__copy" dir="ltr">© ${new Date().getUTCFullYear()} ${esc(config.person.name)} · ${config.domain}</p>
</footer>`;
}

export function renderPage({ config, lang, t, assets, build, stats }) {
  const canonical = pageUrl(config, lang);
  const ctx = { config, lang, t, assets, build, stats };
  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}" data-theme="${config.defaultTheme}">
${head({ ...ctx, title: t.meta.title, description: t.meta.description, canonical })}
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<canvas class="bg" data-bg aria-hidden="true"></canvas>
<div class="noise" aria-hidden="true"></div>
${header(ctx)}
<main id="main">
${hero(ctx)}
${about(ctx)}
${automation(ctx)}
${stack(ctx)}
${certs(ctx)}
${career(ctx)}
${talents(ctx)}
${travel(ctx)}
${shell(ctx)}
${contact(ctx)}
</main>
${footer(ctx)}
<div class="tip" role="tooltip" data-tipbox hidden></div>
<script src="/assets/${assets.js}" defer></script>
</body>
</html>
`;
}

export function renderNotFound({ config, lang, t, assets, build }) {
  const ctx = { config, lang, t, assets, build };
  const n = t.notFound;
  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}" data-theme="${config.defaultTheme}">
${head({ ...ctx, title: n.title, description: n.description, canonical: `${config.origin}/404`, noindex: true })}
<body class="is-404">
<canvas class="bg" data-bg aria-hidden="true"></canvas>
<main id="main" class="nf">
  <p class="prompt" dir="ltr"><span class="prompt__user">max@vancouver-island</span>:<span class="prompt__path">~</span>$ terraform plan</p>
  <h1 class="glitch" data-text="404">${esc(n.h1)}</h1>
  <p class="lede">${esc(n.text)}</p>
  <a class="btn btn--primary" href="/">${esc(n.back)}</a>
</main>
<script src="/assets/${assets.js}" defer></script>
</body>
</html>
`;
}

export { fill };
