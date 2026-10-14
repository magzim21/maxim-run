// Matrix rain: speed and trail as Max set them, and drops anchored to the page (no parallax).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAYERS, RAIN, TRAVEL, dropCells, followScroll, newDrop, stepDrop } from '../src/bg.js';

test('rain falls at 3.75 rows per second (half the first speed) with a 9-row trail (twice the first)', () => {
  assert.equal(RAIN.rowsPerSecond, 3.75);
  assert.equal(RAIN.trail, 9);
  const d = { col: 0, start: 0, travel: 50, head: 0, glyphs: [] };
  stepDrop(d, 2000, 1000, 10);
  assert.equal(d.head, 7.5);
});

test('a drop shows its head plus the trail, fading, and nothing above where it started', () => {
  const d = { col: 0, start: 0, head: 20.4, glyphs: [] };
  const cells = dropCells(d, 0, 1000);
  assert.equal(cells.length, RAIN.trail + 1);
  assert.equal(cells[0].row, 20);
  assert.equal(cells[0].alpha, 1);
  assert.ok(cells.every((c, i) => i === 0 || c.alpha < cells[i - 1].alpha));
  assert.equal(dropCells({ col: 0, start: 18, head: 20, glyphs: [] }, 0, 1000).length, 3);
});

test('a drop is drawn relative to its layer offset', () => {
  const d = { col: 3, start: 100, head: 110, glyphs: [] };
  assert.equal(dropCells(d, 1600, 900)[0].y, 110 * RAIN.size - 1600);
  assert.equal(dropCells(d, 1600, 900)[0].y - dropCells(d, 1700, 900)[0].y, 100);
  assert.deepEqual(dropCells(d, 0, 900), [], 'a drop below the screen draws nothing');
});

test('parallax: far layers are smaller, dimmer, slower, and every layer scrolls slower than the page', () => {
  for (let i = 1; i < LAYERS.length; i++) {
    assert.ok(LAYERS[i - 1].depth < LAYERS[i].depth && LAYERS[i - 1].size < LAYERS[i].size && LAYERS[i - 1].alpha < LAYERS[i].alpha);
  }
  const near = LAYERS.at(-1);
  assert.equal(LAYERS.length, 2, 'no front layer: it cluttered the first screen');
  assert.ok(near.depth < 1, 'even the near layer is behind the page');
  assert.ok(near.size < RAIN.size && near.alpha < 1, 'no large bright symbols');
  assert.ok(LAYERS.reduce((n, L) => n + L.perScreen, 0) >= 110 && LAYERS.reduce((n, L) => n + L.perScreen, 0) <= 150, 'medium density: between the 60 that was too sparse and the 230 that was too dense');
  let o = 0;
  for (let t = 0; t < 5000; t += 16) o = followScroll(o, 1000, 16, near);
  assert.ok(Math.abs(o - 1000 * near.depth) < 0.5, 'settles at depth × scroll');
});

test('a fast scroll outruns the rain, which then glides after it', () => {
  const near = LAYERS.at(-1);
  const after100ms = followScroll(0, 5000, 100, near);
  assert.ok(after100ms <= near.maxSpeed * 0.1 + 1e-9, 'capped by maxSpeed');
  assert.ok(after100ms < 5000 * 0.1, 'the page moved further than the rain');
  let o = after100ms;
  for (let t = 0; t < 8000; t += 16) o = followScroll(o, 5000, 16, near);
  assert.ok(Math.abs(o - 5000 * near.depth) < 0.5, 'caught up afterwards');
});

test('a drop that finished its fall starts again somewhere else', () => {
  const d = { col: 0, start: 100, travel: 20, head: 129.9, glyphs: ['x'] };
  stepDrop(d, 100, 1000, 10, () => 0.5);
  assert.equal(d.start, Math.floor(0.5 * (1000 + TRAVEL.max)) - TRAVEL.max);
  assert.equal(d.head, d.start);
  assert.deepEqual(d.glyphs, []);
  assert.ok(d.travel >= TRAVEL.min && d.travel <= TRAVEL.max);
});

test('the rain stays evenly spread: after a long run the top of the page is as rainy as the bottom', () => {
  const rows = 600;
  const drops = Array.from({ length: 2000 }, () => newDrop(10, rows, Math.random, true));
  for (let t = 0; t < 120_000; t += 100) for (const d of drops) stepDrop(d, 100, rows, 10);
  const inBand = (lo, hi) => drops.filter((d) => d.head >= lo && d.head < hi).length;
  const top = inBand(0, 150);
  const bottom = inBand(rows - 150, rows);
  assert.ok(top > 0.75 * bottom && top < 1.33 * bottom, `top ${top} vs bottom ${bottom}`);
});

test('the page background scrolls with the content (no fixed attachment)', () => {
  const css = readFileSync('src/site.css', 'utf8');
  assert.doesNotMatch(css, /background-attachment:\s*fixed/);
  assert.match(css, /\.noise \{ position: absolute;/);
});

test('drops made at page load are already falling, so the first frame shows rain', () => {
  const d = newDrop(10, 1000, () => 0.5, true);
  assert.equal(d.head - d.start, d.travel / 2, 'already halfway through its fall');
  assert.ok(dropCells(d, d.start * RAIN.size, 900).length > 1);
});
