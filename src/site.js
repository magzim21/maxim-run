// maxim.run client: themes, motion, background canvas, travel globe, shell. No third-party code.
import { runCommand } from './shell.js';

const root = document.documentElement;
root.classList.add('js');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: the choice lasts this visit */ } },
};

/* ---------- language: first visit to / follows the browser, once ---------- */
(function autoLanguage() {
  if (location.pathname !== '/' || store.get('lang')) return;
  const ours = $$('[data-dropdown-panel] [data-lang]').map((a) => [a.dataset.lang, a.getAttribute('href')]);
  const pick = (navigator.languages || [navigator.language]).map((l) => l.slice(0, 2).toLowerCase()).find((c) => ours.some(([o]) => o === c));
  store.set('lang', pick || 'en');
  if (pick && pick !== 'en') location.replace(ours.find(([o]) => o === pick)[1] + location.hash);
})();
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-lang]');
  if (a) store.set('lang', a.dataset.lang);
});

/* ---------- theme ---------- */
const themeMeta = { terminal: '#04110b', nebula: '#0b0720', blueprint: '#f3f6fb' };
function setTheme(id, save = true) {
  if (!themeMeta[id]) return;
  root.dataset.theme = id;
  if (save) store.set('theme', id);
  $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === id)));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = themeMeta[id];
  bg.restart();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme-set]');
  if (b) setTheme(b.dataset.themeSet);
});

/* ---------- dropdown + burger ---------- */
$$('[data-dropdown]').forEach((dd) => {
  const btn = $('[data-dropdown-btn]', dd);
  const toggle = (open) => { dd.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(!dd.classList.contains('is-open')); });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) toggle(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
});
const burger = $('[data-burger]');
const links = $('.nav__links');
if (burger && links) {
  const open = (v) => { links.classList.toggle('is-open', v); burger.setAttribute('aria-expanded', String(v)); };
  burger.addEventListener('click', () => open(!links.classList.contains('is-open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) open(false); });
}

/* ---------- nav: hide on scroll down, highlight current section ---------- */
const nav = $('[data-nav]');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (nav && !(links && links.classList.contains('is-open'))) nav.classList.toggle('is-hidden', y > 300 && y > lastY + 4);
  if (y < lastY - 4 && nav) nav.classList.remove('is-hidden');
  lastY = y;
}, { passive: true });
const navLinks = $$('.nav__links a');
const sectionObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) sectionObs.observe(s); });

/* ---------- reveal on scroll + counters ---------- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    revealObs.unobserve(en.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
$$('[data-reveal]').forEach((el) => revealObs.observe(el));

function countUp(el) {
  const to = Number(el.dataset.count);
  const suffix = el.textContent.replace(/[\d\s]/g, '');
  if (reduced) return;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
$$('[data-count]').forEach(countUp);

/* ---------- typing roles + glitch ---------- */
const roles = $('[data-roles]');
if (roles && !reduced) {
  const list = JSON.parse(roles.dataset.roles);
  let i = 0;
  let pos = list[0].length;
  let deleting = false;
  const tick = () => {
    const word = list[i];
    if (!deleting && pos === word.length) { deleting = true; return setTimeout(tick, 1900); }
    if (deleting && pos === 0) { deleting = false; i = (i + 1) % list.length; }
    pos += deleting ? -1 : 1;
    roles.textContent = list[i].slice(0, pos);
    setTimeout(tick, deleting ? 35 : 70);
  };
  setTimeout(tick, 1600);
}
const cmd = $('[data-type]');
if (cmd && !reduced) {
  const text = cmd.dataset.type;
  cmd.textContent = '';
  [...text].forEach((ch, i) => setTimeout(() => { cmd.textContent += ch; }, 300 + i * 110));
}
$$('.glitch').forEach((g) => {
  const fire = () => {
    g.classList.remove('is-glitching');
    void g.offsetWidth;
    g.classList.add('is-glitching');
    clearTimeout(g._t);
    g._t = setTimeout(() => g.classList.remove('is-glitching'), 480);
  };
  g.addEventListener('mouseenter', fire);
  if (!reduced) { setTimeout(fire, 900); setInterval(fire, 7000); }
});

/* ---------- tilt ---------- */
if (!reduced && matchMedia('(hover: hover)').matches) {
  $$('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('hero__media') ? 6 : 9;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-4px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- ClickOps vs code ---------- */
$$('[data-versus]').forEach((v) => {
  const set = (mode) => {
    v.dataset.mode = mode;
    $$('[data-mode-set]', v).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeSet === mode)));
  };
  v.addEventListener('click', (e) => { const b = e.target.closest('[data-mode-set]'); if (b) set(b.dataset.modeSet); });
});

/* ---------- copy email ---------- */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const label = $('span', b);
  const before = label.textContent;
  try { await navigator.clipboard.writeText(b.dataset.copy); } catch { /* clipboard blocked: the mailto link still works */ }
  label.textContent = b.dataset.copied;
  b.classList.add('is-done');
  setTimeout(() => { label.textContent = before; b.classList.remove('is-done'); }, 1800);
});

/* ---------- instant tooltips ---------- */
const tip = $('[data-tipbox]');
if (tip) {
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${r.bottom + 8}px`;
    tip.classList.add('is-on');
  });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) tip.classList.remove('is-on'); });
}

/* ---------- background canvas: matrix rain, starfield or network, by theme ---------- */
const bg = (() => {
  const c = $('[data-bg]');
  if (!c) return { restart() {} };
  const ctx = c.getContext('2d');
  let raf = 0;
  let w = 0;
  let h = 0;
  let state = null;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  const resize = () => {
    w = c.width = Math.floor(innerWidth * dpr);
    h = c.height = Math.floor(innerHeight * dpr);
  };
  const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}[]<>$#=+terraformkubectl'.split('');

  const scenes = {
    terminal() {
      const size = 16 * dpr;
      const cols = Math.ceil(w / size);
      const drops = Array.from({ length: cols }, () => Math.random() * -60);
      const color = css('--accent');
      return () => {
        ctx.fillStyle = 'rgba(4, 17, 11, 0.16)';
        ctx.fillRect(0, 0, w, h);
        ctx.font = `${size}px "JetBrains Mono", monospace`;
        for (let i = 0; i < cols; i++) {
          const y = drops[i] * size;
          ctx.fillStyle = Math.random() > 0.975 ? '#eafff2' : color;
          ctx.globalAlpha = 0.55;
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y);
          ctx.globalAlpha = 1;
          if (y > h && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.5;
        }
      };
    },
    nebula() {
      const stars = Array.from({ length: Math.round((w * h) / (9000 * dpr * dpr)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, t: Math.random() * 6,
      }));
      return (time) => {
        ctx.clearRect(0, 0, w, h);
        const off = scrollY * dpr;
        for (const s of stars) {
          const y = (((s.y - off * s.z * 0.3) % h) + h) % h;
          const a = 0.35 + 0.65 * Math.abs(Math.sin(time / 1400 + s.t));
          ctx.fillStyle = `rgba(255, 240, 255, ${a * s.z})`;
          ctx.fillRect(s.x, y, 1.6 * s.z * dpr, 1.6 * s.z * dpr);
        }
      };
    },
    blueprint() {
      const n = Math.min(46, Math.round((w * h) / (42000 * dpr * dpr)));
      const pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr }));
      const accent = css('--accent');
      const link = 170 * dpr;
      return (time) => {
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.strokeStyle = accent;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = pts[i];
            const b = pts[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > link) continue;
            ctx.globalAlpha = (1 - d / link) * 0.35;
            ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            const k = ((time / 2200 + i * 0.13) % 1);
            ctx.globalAlpha = (1 - d / link) * 0.9;
            ctx.fillStyle = accent;
            ctx.fillRect(a.x + (b.x - a.x) * k - dpr, a.y + (b.y - a.y) * k - dpr, 2.5 * dpr, 2.5 * dpr);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        for (const p of pts) ctx.fillRect(p.x - 2 * dpr, p.y - 2 * dpr, 4 * dpr, 4 * dpr);
      };
    },
  };

  let last = 0;
  const loop = (time) => {
    raf = requestAnimationFrame(loop);
    if (time - last < 33) return; // ~30 fps is plenty for a backdrop
    last = time;
    state(time);
  };
  const restart = () => {
    cancelAnimationFrame(raf);
    resize();
    ctx.clearRect(0, 0, w, h);
    state = (scenes[root.dataset.theme] || scenes.terminal)();
    if (reduced) { state(0); return; }
    raf = requestAnimationFrame(loop);
  };
  addEventListener('resize', () => { clearTimeout(c._t); c._t = setTimeout(restart, 200); });
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : restart()));
  return { restart };
})();

const saved = store.get('theme');
setTheme(saved && themeMeta[saved] ? saved : root.dataset.theme || 'terminal', false);

/* ---------- travel globe (loads its land dots only when scrolled near) ---------- */
const globeEl = $('[data-globe]');
if (globeEl) {
  const once = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting) return;
    once.disconnect();
    const dots = await fetch(globeEl.dataset.land).then((r) => r.json()).catch(() => []);
    startGlobe(globeEl, dots);
  }, { rootMargin: '400px' });
  once.observe(globeEl);
}

function startGlobe(fig, flat) {
  const canvas = $('canvas', fig);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const [homeLat, homeLon] = fig.dataset.home.split(',').map(Number);
  const rad = Math.PI / 180;
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] * rad, flat[i + 1] * rad]);
  let size = 0;
  const resize = () => {
    size = Math.round(canvas.getBoundingClientRect().width * dpr) || 560;
    canvas.width = canvas.height = size;
  };
  resize();
  addEventListener('resize', resize);

  let rotLon = -homeLon * rad + 0.6;
  const tilt = -22 * rad;
  let vel = reduced ? 0 : 0.0022;
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, lon: rotLon }; canvas.setPointerCapture(e.pointerId); vel = 0; });
  canvas.addEventListener('pointermove', (e) => { if (drag) rotLon = drag.lon + (e.clientX - drag.x) * 0.008; });
  canvas.addEventListener('pointerup', () => { drag = null; vel = reduced ? 0 : 0.0022; });

  // A tilted great circle through home: the round-the-world loop (an illustration, not a route log).
  const home = [homeLat * rad, homeLon * rad];
  const toVec = ([la, lo]) => [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const h = toVec(home);
  const north = [0, 0, 1];
  const east = (() => { const v = [-Math.sin(home[1]), Math.cos(home[1]), 0]; return v; })();
  const up = [ // local north at home
    north[0] - h[0] * h[2], north[1] - h[1] * h[2], north[2] - h[2] * h[2],
  ];
  const nu = Math.hypot(...up);
  const dirAng = 70 * rad; // heading of the loop leaving home (east-north-east)
  const dir = up.map((u, i) => (u / nu) * Math.cos(dirAng) + east[i] * Math.sin(dirAng));
  const loop = Array.from({ length: 361 }, (_, k) => {
    const a = k * rad;
    return h.map((v, i) => v * Math.cos(a) + dir[i] * Math.sin(a));
  });

  const project = (v) => {
    // rotate around z by rotLon, then around x... we tilt around the y axis for a pleasing view
    const cl = Math.cos(rotLon);
    const sl = Math.sin(rotLon);
    const x1 = v[0] * cl - v[1] * sl;
    const y1 = v[0] * sl + v[1] * cl;
    const z1 = v[2];
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const x2 = x1 * ct - z1 * st; // depth towards viewer
    const z2 = x1 * st + z1 * ct;
    return { x: y1, y: -z2, d: x2 };
  };

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let t0 = performance.now();
  const draw = (time) => {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    const dt = time - t0;
    t0 = time;
    if (!drag) rotLon += vel * dt * 0.06;
    const r = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    const accent = css('--accent');
    const accent2 = css('--accent-2');
    const home3 = css('--accent-3');
    const theme = document.documentElement.dataset.theme;
    ctx.clearRect(0, 0, size, size);

    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, theme === 'blueprint' ? 'rgba(31,95,214,0.10)' : 'rgba(255,255,255,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.35; ctx.lineWidth = dpr;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = accent;
    const ds = 1.5 * dpr;
    for (const [la, lo] of pts) {
      const p = project([Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]);
      if (p.d < 0) continue;
      ctx.globalAlpha = 0.25 + 0.75 * p.d;
      ctx.fillRect(cx + p.x * r - ds / 2, cy + p.y * r - ds / 2, ds, ds);
    }
    ctx.globalAlpha = 1;

    // route: dashed loop, brighter on the front side, with a travelling comet
    const head = ((time / 60) % 360) | 0;
    ctx.lineWidth = 2 * dpr;
    for (let k = 0; k < 360; k++) {
      const a = project(loop[k]);
      const b = project(loop[k + 1]);
      const front = a.d > 0 && b.d > 0;
      const behind = (head - k + 360) % 360;
      const trail = behind < 70 ? 1 - behind / 70 : 0;
      ctx.strokeStyle = trail > 0 ? accent2 : accent;
      ctx.globalAlpha = front ? 0.35 + trail * 0.65 : 0.08;
      if (k % 6 > 3 && !trail) continue;
      ctx.beginPath(); ctx.moveTo(cx + a.x * r, cy + a.y * r); ctx.lineTo(cx + b.x * r, cy + b.y * r); ctx.stroke();
    }
    const hp = project(loop[head]);
    ctx.globalAlpha = hp.d > 0 ? 1 : 0.25;
    ctx.fillStyle = accent2;
    ctx.shadowColor = accent2; ctx.shadowBlur = 16 * dpr;
    ctx.beginPath(); ctx.arc(cx + hp.x * r, cy + hp.y * r, 4 * dpr, 0, Math.PI * 2); ctx.fill();

    // home marker with a ping
    const hm = project(h);
    if (hm.d > 0) {
      const pulse = (time / 1600) % 1;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1 - pulse;
      ctx.strokeStyle = theme === 'blueprint' ? css('--accent-2') : home3;
      ctx.beginPath(); ctx.arc(cx + hm.x * r, cy + hm.y * r, (4 + pulse * 18) * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14 * dpr;
      ctx.beginPath(); ctx.arc(cx + hm.x * r, cy + hm.y * r, 5 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };
  requestAnimationFrame(draw);
}

/* ---------- shell ---------- */
const sh = $('[data-shell]');
if (sh) {
  const data = JSON.parse($('[data-shell-data]').textContent);
  const out = $('[data-shell-out]', sh);
  const form = $('[data-shell-form]', sh);
  const input = $('input', form);
  const history = [];
  let hi = 0;
  const print = (cls, text, href) => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    if (href) {
      const a = document.createElement('a');
      a.href = href; a.textContent = `${text}  ${href}`; a.target = '_blank'; a.rel = 'me noopener';
      p.append(a);
    } else p.textContent = text;
    out.append(p);
    out.scrollTop = out.scrollHeight;
  };
  const exec = (line) => {
    const p = document.createElement('p');
    p.className = 'cmd';
    p.innerHTML = '$ <b></b>';
    p.lastChild.textContent = line;
    out.append(p);
    const r = runCommand(line, data);
    r.lines.forEach((l) => print(l.cls, l.text, l.href));
    const act = r.action;
    if (!act) return;
    if (act.type === 'clear') setTimeout(() => { out.textContent = ''; }, act.type === 'clear' && line.trim() === 'exit' ? 500 : 0);
    if (act.type === 'theme') setTheme(act.id);
    if (act.type === 'lang') { store.set('lang', act.code); setTimeout(() => { location.href = `${act.path}#shell`; }, 500); }
    if (act.type === 'mail') setTimeout(() => { location.href = act.href; }, 900);
  };
  print('', data.text.welcome);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    if (line.trim()) { history.push(line); hi = history.length; }
    exec(line);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && hi > 0) { hi--; input.value = history[hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
  });
  $$('[data-cmd]').forEach((b) => b.addEventListener('click', () => { exec(b.dataset.cmd); }));
  sh.addEventListener('click', (e) => { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
  if (location.hash === '#shell') input.focus({ preventScroll: true });
}
