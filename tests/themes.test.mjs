// Every theme is dark: the portrait's baked-in green shadow only works on a dark background (Max, 2026-10-13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/site.css', 'utf8');
const config = JSON.parse(readFileSync('config/site.config.json', 'utf8'));
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

for (const { id, color } of config.themes) {
  test(`theme ${id} is dark`, () => {
    const block = css.match(new RegExp(`\\[data-theme='${id}'\\] \\{([^}]*)\\}`))?.[1];
    assert.ok(block, `no token block for ${id}`);
    assert.match(block, /color-scheme: dark/);
    const bg = block.match(/--bg: (#[0-9a-f]{6})/i)[1];
    assert.ok(luminance(bg) < 0.05, `${id}: --bg ${bg} is too light`);
    assert.equal(color.toLowerCase(), bg.toLowerCase(), `${id}: theme-color in config differs from --bg`);
  });
}
