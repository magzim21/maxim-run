// Theme backgrounds drawn on one fixed canvas. Everything lives in page coordinates and is drawn
// shifted by the scroll position, so the background scrolls with the page (no parallax).

// Matrix rain. Speed is in glyph rows per second; the trail is the number of rows behind the head;
// one drop per rowsPerDrop cells of the page.
// (Max, 2026-10-13: half the earlier speed of 7.5 rows/s, twice the earlier ~4-row trail.)
export const RAIN = { size: 16, rowsPerSecond: 3.75, trail: 9, rowsPerDrop: 70 };
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}[]<>$#=+terraformkubectl'.split('');
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// A drop starts at row `start` and falls; its head is at row `head` (fractional). A warm drop is
// already part-way down its trail, so the page is full of rain from the first frame.
export function newDrop(cols, docRows, rand = Math.random, warm = false) {
  const start = Math.floor(rand() * docRows);
  return { col: Math.floor(rand() * cols), start, head: start + (warm ? rand() * RAIN.trail * 2 : 0), glyphs: [] };
}

export function stepDrop(drop, ms, docRows, cols, rand = Math.random) {
  drop.head += (ms / 1000) * RAIN.rowsPerSecond;
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
      const size = RAIN.size;
      const cols = Math.ceil(innerWidth / size);
      const docRows = () => Math.ceil(docH / size);
      const count = () => Math.ceil((cols * docRows()) / RAIN.rowsPerDrop); // about 85 drops on screen
      const drops = Array.from({ length: count() }, () => newDrop(cols, docRows(), Math.random, true));
      const color = css('--accent');
      return (dt) => {
        while (drops.length < count()) drops.push(newDrop(cols, docRows(), Math.random, true));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        ctx.font = `${size}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'top';
        for (const d of drops) {
          stepDrop(d, dt, docRows(), cols);
          for (const c of dropCells(d, scrollY, innerHeight, size)) {
            const i = c.row - d.start;
            if (!d.glyphs[i] || Math.random() < 0.02) d.glyphs[i] = pick();
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = c.k === 0 ? '#eafff2' : color;
            ctx.fillText(d.glyphs[i], d.col * size, c.y);
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
