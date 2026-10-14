// Theme backgrounds drawn on one fixed canvas. The matrix rain lives in 3 depth layers: each layer
// scrolls slower than the page (parallax) and can only move so fast, so a quick scroll outruns the
// rain and the drops glide after it. Stars and the network move with the page.

// Matrix rain. Speed is in glyph rows per second; the trail is the number of rows behind the head;
// one drop per rowsPerDrop cells of the page.
// (Max, 2026-10-13: half the earlier speed of 7.5 rows/s, twice the earlier ~4-row trail.)
export const RAIN = { size: 16, rowsPerSecond: 3.75, trail: 9, rowsPerDrop: 70 };
// depth: share of the page scroll the layer follows; maxSpeed: px/s it can scroll at most;
// size, alpha and fall speed shrink with distance. The near layer keeps RAIN's speed and size.
export const LAYERS = [
  { depth: 0.3, size: 10, alpha: 0.4, fall: 0.5, maxSpeed: 700 },
  { depth: 0.55, size: 13, alpha: 0.65, fall: 0.75, maxSpeed: 1100 },
  { depth: 0.8, size: 16, alpha: 1, fall: 1, maxSpeed: 1600 },
];

// Moves a layer's scroll offset towards depth × page scroll: eased, and never faster than maxSpeed.
export function followScroll(offset, scrollY, ms, layer) {
  const target = scrollY * layer.depth;
  const eased = (target - offset) * (1 - Math.exp(-ms / 140));
  const cap = (layer.maxSpeed * ms) / 1000;
  return offset + Math.max(-cap, Math.min(cap, eased));
}
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}[]<>$#=+terraformkubectl'.split('');
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// A drop starts at row `start` and falls; its head is at row `head` (fractional). A warm drop is
// already part-way down its trail, so the page is full of rain from the first frame.
export function newDrop(cols, docRows, rand = Math.random, warm = false) {
  const start = Math.floor(rand() * docRows);
  return { col: Math.floor(rand() * cols), start, head: start + (warm ? rand() * RAIN.trail * 2 : 0), glyphs: [] };
}

export function stepDrop(drop, ms, docRows, cols, rand = Math.random, fall = 1) {
  drop.head += (ms / 1000) * RAIN.rowsPerSecond * fall;
  if (drop.head - RAIN.trail > docRows) Object.assign(drop, newDrop(cols, docRows, rand), { glyphs: [] });
  return drop;
}

// The cells of a drop to draw: row in the page, its y on screen, and its brightness (1 = head).
export function dropCells(drop, scrollY, viewHeight, size = RAIN.size) {
  const head = Math.floor(drop.head);
  const cells = [];
  for (let k = 0; k <= RAIN.trail; k++) {
    const row = head - k;
    if (row < drop.start) break;
    const y = row * size - scrollY;
    if (y < -size || y > viewHeight + size) continue;
    cells.push({ row, y, k, alpha: k === 0 ? 1 : 0.6 * (1 - k / (RAIN.trail + 1)) });
  }
  return cells;
}

export function createBackground(canvas, { root, reduced, css }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let raf = 0;
  let w = 0;
  let h = 0;
  let docH = 0;
  let scene = null;
  let last = 0;

  const measure = () => {
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    docH = document.documentElement.scrollHeight;
  };

  const scenes = {
    terminal() {
      const color = css('--accent');
      const layers = LAYERS.map((L) => {
        const cols = Math.ceil(innerWidth / L.size);
        // A layer only travels depth × the page, so it is that much shorter than the page.
        const rows = () => Math.ceil(((docH - innerHeight) * L.depth + innerHeight) / L.size);
        const count = () => Math.ceil((cols * rows()) / RAIN.rowsPerDrop);
        return { ...L, cols, rows, count, offset: scrollY * L.depth, drops: Array.from({ length: count() }, () => newDrop(cols, rows(), Math.random, true)) };
      });
      return (dt) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        ctx.textBaseline = 'top';
        for (const L of layers) {
          while (L.drops.length < L.count()) L.drops.push(newDrop(L.cols, L.rows(), Math.random, true));
          L.offset = followScroll(L.offset, scrollY, dt, L);
          ctx.font = `${L.size}px "JetBrains Mono", monospace`;
          for (const d of L.drops) {
            stepDrop(d, dt, L.rows(), L.cols, Math.random, L.fall);
            for (const c of dropCells(d, L.offset, innerHeight, L.size)) {
              const i = c.row - d.start;
              if (!d.glyphs[i] || Math.random() < 0.02) d.glyphs[i] = pick();
              ctx.globalAlpha = c.alpha * L.alpha;
              ctx.fillStyle = c.k === 0 ? '#eafff2' : color;
              ctx.fillText(d.glyphs[i], d.col * L.size, c.y);
            }
          }
        }
        ctx.globalAlpha = 1;
      };
    },
    nebula() {
      const stars = Array.from({ length: Math.round((w * h) / (9000 * dpr * dpr)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, t: Math.random() * 6,
      }));
      let time = 0;
      return (dt) => {
        time += dt;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const off = scrollY * dpr;
        for (const s of stars) {
          const y = (((s.y - off) % h) + h) % h; // moves exactly with the page
          const a = 0.35 + 0.65 * Math.abs(Math.sin(time / 1400 + s.t));
          ctx.fillStyle = `rgba(255, 240, 255, ${a * s.z})`;
          ctx.fillRect(s.x, y, 1.6 * s.z * dpr, 1.6 * s.z * dpr);
        }
      };
    },
    blueprint() {
      const n = Math.min(46, Math.round((w * h) / (42000 * dpr * dpr)));
      const pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.0075 * dpr, vy: (Math.random() - 0.5) * 0.0075 * dpr }));
      const accent = css('--accent');
      const link = 170 * dpr;
      let time = 0;
      return (dt) => {
        time += dt;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const off = scrollY * dpr;
        for (const p of pts) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        const at = pts.map((p) => ({ x: p.x, y: (((p.y - off) % h) + h) % h }));
        ctx.strokeStyle = accent;
        ctx.lineWidth = dpr;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const a = at[i];
            const b = at[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > link) continue;
            ctx.globalAlpha = (1 - d / link) * 0.35;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            const k = (time / 2200 + i * 0.13) % 1;
            ctx.globalAlpha = (1 - d / link) * 0.9;
            ctx.fillStyle = accent;
            ctx.fillRect(a.x + (b.x - a.x) * k - dpr, a.y + (b.y - a.y) * k - dpr, 2.5 * dpr, 2.5 * dpr);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        for (const p of at) ctx.fillRect(p.x - 2 * dpr, p.y - 2 * dpr, 4 * dpr, 4 * dpr);
      };
    },
  };

  // Every animation frame redraws (so the background keeps up with scrolling); the simulation
  // advances by real time, so the speed does not depend on the frame rate.
  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(t - last, 100) : 0;
    last = t;
    scene(reduced ? 0 : dt);
  };
  const restart = () => {
    cancelAnimationFrame(raf);
    last = 0;
    measure();
    scene = (scenes[root.dataset.theme] || scenes.terminal)();
    raf = requestAnimationFrame(loop);
  };
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(restart, 200); });
  new ResizeObserver(() => { docH = document.documentElement.scrollHeight; }).observe(document.body);
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : restart()));
  return { restart };
}
