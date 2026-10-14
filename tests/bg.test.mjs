// Matrix rain: speed and trail as Max set them, and drops anchored to the page (no parallax).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RAIN, dropCells, newDrop, stepDrop } from '../src/bg.js';

test('rain falls at 3.75 rows per second (half the first speed) with a 9-row trail (twice the first)', () => {
  assert.equal(RAIN.rowsPerSecond, 3.75);
  assert.equal(RAIN.trail, 9);
  const d = { col: 0, start: 0, head: 0, glyphs: [] };
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

test('drops are fixed to the page: scrolling moves them up by exactly the scrolled distance', () => {
  const d = { col: 3, start: 100, head: 110, glyphs: [] };
  const at0 = dropCells(d, 1600, 900)[0].y;
  const at1 = dropCells(d, 1700, 900)[0].y;
  assert.equal(at0 - at1, 100);
  assert.equal(at0, 110 * RAIN.size - 1600);
  assert.deepEqual(dropCells(d, 0, 900), [], 'a drop below the screen draws nothing');
});

test('a drop that left the page starts again somewhere on it', () => {
  const d = { col: 0, start: 990, head: 1009.9, glyphs: ['x'] };
  stepDrop(d, 100, 1000, 10, () => 0.5);
  assert.equal(d.start, 500);
  assert.equal(d.head, 500);
  assert.deepEqual(d.glyphs, []);
  assert.ok(newDrop(10, 1000).start < 1000);
});

test('the page background scrolls with the content (no fixed attachment)', () => {
  const css = readFileSync('src/site.css', 'utf8');
  assert.doesNotMatch(css, /background-attachment:\s*fixed/);
  assert.match(css, /\.noise \{ position: absolute;/);
});

test('drops made at page load are already falling, so the first frame shows rain', () => {
  const d = newDrop(10, 1000, () => 0.5, true);
  assert.equal(d.head - d.start, RAIN.trail);
  assert.ok(dropCells(d, d.start * RAIN.size, 900).length > 1);
});
